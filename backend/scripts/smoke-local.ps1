$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$outputDir = Join-Path $root 'outputs\backend-smoke'
$outputPath = Join-Path $outputDir 'local-smoke.json'
$samplePath = Join-Path $root 'sample-data\sample_wrong_aws_deck.md'
$envPath = Join-Path $root 'outputs\backend-smoke\sam-local-env.json'
$samStdoutPath = Join-Path $outputDir 'sam-local-stdout.log'
$samStderrPath = Join-Path $outputDir 'sam-local-stderr.log'
$baseUrl = 'http://127.0.0.1:3001'
$unknownAnalysisId = 'analysis-00000000-0000-4000-8000-000000000000'
$successMarker = 'BACKEND_LOCAL_SMOKE_OK'
$samProcess = $null

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
    $request.Timeout = 20000

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

function Invoke-SmokeChecks([string]$ApiUrl) {
    $documentText = Get-Content -LiteralPath $samplePath -Raw -Encoding UTF8
    Assert-True (-not [string]::IsNullOrWhiteSpace($documentText)) 'sample document text must be non-empty'

    $postResponse = Invoke-JsonRequest -Method 'POST' -Uri "$ApiUrl/analyze" -Body @{
        documentText = $documentText
        maxClaims = 4
    }
    Assert-Status $postResponse 200 'POST /analyze'
    Assert-AnalysisResult $postResponse.Body

    $analysisId = [string]$postResponse.Body.analysisId
    $getResponse = Invoke-JsonRequest -Method 'GET' -Uri "$ApiUrl/analyses/$analysisId"
    Assert-Status $getResponse 200 'GET returned analysis id'
    Assert-True ([string]$getResponse.Body.analysisId -eq $analysisId) 'GET must return the created analysisId'

    $emptyTextResponse = Invoke-JsonRequest -Method 'POST' -Uri "$ApiUrl/analyze" -Body @{
        documentText = ''
        maxClaims = 1
    }
    Assert-Status $emptyTextResponse 400 'empty documentText'
    Assert-True ([string]$emptyTextResponse.Body.error.code -eq 'INVALID_DOCUMENT_TEXT') 'empty documentText must return INVALID_DOCUMENT_TEXT'

    $unknownResponse = Invoke-JsonRequest -Method 'GET' -Uri "$ApiUrl/analyses/$unknownAnalysisId"
    Assert-Status $unknownResponse 404 'unknown analysis id'
    Assert-True ([string]$unknownResponse.Body.error.code -eq 'ANALYSIS_NOT_FOUND') 'unknown analysis id must return ANALYSIS_NOT_FOUND'

    return [ordered]@{
        apiUrl = $ApiUrl
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

function Wait-ForSamApi([string]$ApiUrl, [System.Diagnostics.Process]$Process) {
    $deadline = (Get-Date).AddSeconds(75)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            throw "SAM local start-api exited before readiness. See $samStdoutPath and $samStderrPath."
        }

        try {
            $response = Invoke-JsonRequest -Method 'GET' -Uri "$ApiUrl/analyses/$unknownAnalysisId"
            if ($response.StatusCode -ge 200) {
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "Timed out waiting for SAM local API readiness at $ApiUrl. See $samStdoutPath and $samStderrPath."
}

$samCommand = Get-Command sam -ErrorAction SilentlyContinue
if ($null -eq $samCommand) {
    Write-Output 'BLOCKED: missing sam'
    exit 1
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
& (Join-Path $PSScriptRoot 'new-local-env.ps1')

try {
    $samProcess = Start-Process -FilePath $samCommand.Source -ArgumentList @(
        'local', 'start-api',
        '--template-file', 'infra/template.yaml',
        '--env-vars', 'outputs/backend-smoke/sam-local-env.json',
        '--port', '3001'
    ) -WorkingDirectory $root -PassThru -RedirectStandardOutput $samStdoutPath -RedirectStandardError $samStderrPath

    Wait-ForSamApi -ApiUrl $baseUrl -Process $samProcess
    $result = Invoke-SmokeChecks -ApiUrl $baseUrl
    $result | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $outputPath -Encoding UTF8
    Write-Output $successMarker
} finally {
    if ($null -ne $samProcess -and -not $samProcess.HasExited) {
        Stop-Process -Id $samProcess.Id -Force -ErrorAction SilentlyContinue
        Wait-Process -Id $samProcess.Id -Timeout 10 -ErrorAction SilentlyContinue
    }
}
