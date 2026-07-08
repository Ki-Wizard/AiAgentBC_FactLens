$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$outputDir = Join-Path $root 'outputs\backend-smoke'
$outputPath = Join-Path $outputDir 'sam-local-env.json'

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$envMap = @{
    FactLensBackendFunction = @{
        AWS_REGION = 'ap-northeast-2'
        ANALYSES_TABLE_NAME = 'factlens-analyses-dev'
        FACTLENS_USE_FALLBACK = 'true'
        FACTLENS_STORAGE_MODE = 'local-file'
        FACTLENS_LOCAL_STORE_PATH = '/tmp/factlens-backend-local-store.json'
        MAX_CLAIMS_DEFAULT = '10'
        CORS_ALLOW_ORIGIN = 'http://localhost:5173'
        EVIDENCE_BUCKET_NAME = 'factlens-dev-evidence-docs-069423016509-ap-northeast-2'
        EVIDENCE_CORPUS_KEY = 'source-docs/aws-evidence-corpus.md'
        FALLBACK_EVIDENCE_KEY = 'fallback/evidence_docs.json'
    }
}

$envMap | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $outputPath -Encoding utf8

Write-Output "Wrote $outputPath"
