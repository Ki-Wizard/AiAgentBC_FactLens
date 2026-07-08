param(
    [string]$StackName = 'factlens-backend-api',
    [string]$Region = 'ap-northeast-2',
    [string]$ApiUrl
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$outputDir = Join-Path $root 'outputs\backend-smoke'
$outputPath = Join-Path $outputDir 'deployed-smoke.json'
$samplePath = Join-Path $root 'sample-data\sample_wrong_aws_deck.md'
$unknownAnalysisId = 'analysis-00000000-0000-4000-8000-000000000000'
$successMarker = 'BACKEND_DEPLOYED_SMOKE_OK'

function Write-Blocked([string]$Message) {
    Write-Output "BLOCKED: $Message"
    exit 1
}

function Assert-True([bool]$Condition, [string]$Message) {
    if (-not $Condition) {
        throw "ASSERTION_FAILED: $Message"
    }
}

function Assert-Status($Response, [int]$ExpectedStatusCode, [string]$Scenario) {
    if ([int]$Response.StatusCode -ne $ExpectedStatusCode) {
        throw "ASSERTION_FAILED: $Scenario returned HTTP $($Response.StatusCode), expected $ExpectedStatusCode. Body: $($Response.RawBody)"
    }
}

function Invoke-JsonRequest([string]$Method, [string]$Uri, [object]$Body = $null) {
    $request = [System.Net.WebRequest]::Create($Uri)
    $request.Method = $Method
    $request.Accept = 'application/json'
    $request.Timeout = 30000

    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 20
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $request.ContentType = 'application/json'
        $request.ContentLength = $bytes.Length
        $requestStream = $request.GetRequestStream()
        try {
            $requestStream.Write($bytes, 0, $bytes.Length)
        } finally {
            $requestStream.Close()
        }
    }

    $response = $null
    try {
        $response = $request.GetResponse()
    } catch [System.Net.WebException] {
        if ($null -eq $_.Exception.Response) {
            throw
        }
        $response = $_.Exception.Response
    }

    try {
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        try {
            $rawBody = $reader.ReadToEnd()
        } finally {
            $reader.Close()
        }
        $parsedBody = $null
        if (-not [string]::IsNullOrWhiteSpace($rawBody)) {
            $parsedBody = $rawBody | ConvertFrom-Json
        }

        return [pscustomobject]@{
            StatusCode = [int]$response.StatusCode
            Body = $parsedBody
            RawBody = $rawBody
        }
    } finally {
        $response.Close()
    }
}

function Assert-AnalysisResult($Analysis) {
    $claims = @($Analysis.claims)

    Assert-True ([string]$Analysis.analysisId -match '^analysis-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') 'analysisId must match analysis-<uuid4>'
    Assert-True ([string]$Analysis.status -eq 'COMPLETED') 'status must be COMPLETED'
    Assert-True ($claims.Count -gt 0) 'claims must be non-empty'

    foreach ($claim in $claims) {
        Assert-True (-not [string]::IsNullOrWhiteSpace([string]$claim.claimId)) 'claimId must be present'
        Assert-True (-not [string]::IsNullOrWhiteSpace([string]$claim.text)) 'claim text must be present'
        Assert-True (-not [string]::IsNullOrWhiteSpace([string]$claim.label)) 'claim label must be present'
    }
}

function Invoke-SmokeChecks([string]$ResolvedApiUrl) {
    $documentText = Get-Content -LiteralPath $samplePath -Raw -Encoding UTF8
    Assert-True (-not [string]::IsNullOrWhiteSpace($documentText)) 'sample document text must be non-empty'

    $postResponse = Invoke-JsonRequest -Method 'POST' -Uri "$ResolvedApiUrl/analyze" -Body @{
        documentText = $documentText
        maxClaims = 4
    }
    Assert-Status $postResponse 200 'POST /analyze'
    Assert-AnalysisResult $postResponse.Body

    $analysisId = [string]$postResponse.Body.analysisId
    $getResponse = Invoke-JsonRequest -Method 'GET' -Uri "$ResolvedApiUrl/analyses/$analysisId"
    Assert-Status $getResponse 200 'GET returned analysis id'
    Assert-True ([string]$getResponse.Body.analysisId -eq $analysisId) 'GET must return the created analysisId'

    $emptyTextResponse = Invoke-JsonRequest -Method 'POST' -Uri "$ResolvedApiUrl/analyze" -Body @{
        documentText = ''
        maxClaims = 1
    }
    Assert-Status $emptyTextResponse 400 'empty documentText'
    Assert-True ([string]$emptyTextResponse.Body.error.code -eq 'INVALID_DOCUMENT_TEXT') 'empty documentText must return INVALID_DOCUMENT_TEXT'

    $unknownResponse = Invoke-JsonRequest -Method 'GET' -Uri "$ResolvedApiUrl/analyses/$unknownAnalysisId"
    Assert-Status $unknownResponse 404 'unknown analysis id'
    Assert-True ([string]$unknownResponse.Body.error.code -eq 'ANALYSIS_NOT_FOUND') 'unknown analysis id must return ANALYSIS_NOT_FOUND'

    return [ordered]@{
        stackName = $StackName
        region = $Region
        apiUrl = $ResolvedApiUrl
        createdAnalysisId = $analysisId
        checkedAt = (Get-Date).ToUniversalTime().ToString('o')
        checks = [ordered]@{
            postAnalyze = [ordered]@{
                statusCode = $postResponse.StatusCode
                status = $postResponse.Body.status
                claims = @($postResponse.Body.claims).Count
            }
            getAnalysis = [ordered]@{
                statusCode = $getResponse.StatusCode
                analysisId = $getResponse.Body.analysisId
            }
            emptyDocumentText = [ordered]@{
                statusCode = $emptyTextResponse.StatusCode
                errorCode = $emptyTextResponse.Body.error.code
            }
            unknownAnalysisId = [ordered]@{
                statusCode = $unknownResponse.StatusCode
                errorCode = $unknownResponse.Body.error.code
            }
        }
    }
}

function Get-ApiEndpointFromStack([string]$RequestedStackName, [string]$RequestedRegion) {
    $awsCommand = Get-Command aws -ErrorAction SilentlyContinue
    if ($null -eq $awsCommand) {
        Write-Output 'BLOCKED: missing aws'
        exit 1
    }

    $endpoint = & $awsCommand.Source cloudformation describe-stacks `
        --stack-name $RequestedStackName `
        --region $RequestedRegion `
        --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue | [0]" `
        --output text 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Blocked "aws cloudformation describe-stacks failed; AWS credentials, region, stack, or ApiEndpoint output unavailable for stack $RequestedStackName"
    }

    $resolved = [string]$endpoint
    $resolved = $resolved.Trim()
    if ([string]::IsNullOrWhiteSpace($resolved) -or $resolved -eq 'None') {
        Write-Blocked "ApiEndpoint output not found for stack $RequestedStackName"
    }

    return $resolved
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
    $ApiUrl = Get-ApiEndpointFromStack -RequestedStackName $StackName -RequestedRegion $Region
}

$ApiUrl = $ApiUrl.TrimEnd('/')
$result = Invoke-SmokeChecks -ResolvedApiUrl $ApiUrl
$result | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $outputPath -Encoding UTF8
Write-Output $successMarker
