param(
    [string[]]$CheckPaths = @()
)

$ErrorActionPreference = 'Stop'

function Write-Fail([string]$Message) {
    Write-Output "BLOCKED: $Message"
    exit 1
}

function Get-GitStatusLines {
    $output = & git status --short 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail 'unable to read git status'
    }
    return @($output)
}

function Get-GitPathLines([string[]]$Arguments) {
    $output = & git @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail ('unable to read git paths: {0}' -f ($Arguments -join ' '))
    }
    return @($output)
}

$requiredBranch = 'feature/backend-api'
$currentBranch = & git branch --show-current
if ($LASTEXITCODE -ne 0) {
    Write-Fail 'unable to read current branch'
}

if ($currentBranch.Trim() -ne $requiredBranch) {
    Write-Fail ("wrong branch: expected {0} but found {1}" -f $requiredBranch, $currentBranch.Trim())
}

$forbiddenRoots = @(
    'frontend/',
    '.omo/',
    '.codegraph/',
    'docs/팩트렌즈_4인_개발_시간순_체크리스트.md'
)

$statusLines = Get-GitStatusLines
$stagedPaths = Get-GitPathLines @('diff', '--cached', '--name-only')
$trackedPaths = Get-GitPathLines @('diff', '--name-only')
$violations = New-Object System.Collections.Generic.List[string]

foreach ($path in @($stagedPaths + $trackedPaths)) {
    if ([string]::IsNullOrWhiteSpace($path)) { continue }
    foreach ($root in $forbiddenRoots) {
        if ($path.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            $violations.Add($path)
        }
    }
}

if ($CheckPaths.Count -gt 0) {
    foreach ($path in $CheckPaths) {
        foreach ($root in $forbiddenRoots) {
            if ($path.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
                $violations.Add($path)
            }
        }
    }
}

if ($violations.Count -gt 0) {
    $unique = $violations | Select-Object -Unique
    Write-Fail ("forbidden scope detected: {0}" -f ($unique -join ', '))
}

Write-Output 'OK: backend scope clean'
