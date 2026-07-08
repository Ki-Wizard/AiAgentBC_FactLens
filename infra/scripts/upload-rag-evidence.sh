#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-2}"
PROJECT_NAME="${PROJECT_NAME:-factlens}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
BUCKET_NAME="${BUCKET_NAME:-${PROJECT_NAME}-rag-evidence-${ACCOUNT_ID}-${REGION}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "Region: ${REGION}"
echo "Bucket: ${BUCKET_NAME}"

if ! aws s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null; then
  aws s3api create-bucket \
    --bucket "${BUCKET_NAME}" \
    --region "${REGION}" \
    --create-bucket-configuration LocationConstraint="${REGION}"
fi

aws s3api put-public-access-block \
  --bucket "${BUCKET_NAME}" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3 sync "${REPO_ROOT}/sample-data/source-docs/" "s3://${BUCKET_NAME}/source-docs/" \
  --region "${REGION}"

aws s3 cp "${REPO_ROOT}/sample-data/evidence_docs.json" "s3://${BUCKET_NAME}/fallback/evidence_docs.json" \
  --region "${REGION}"

echo "Uploaded RAG evidence docs."
echo "S3 source prefix: s3://${BUCKET_NAME}/source-docs/"
echo "Fallback JSON: s3://${BUCKET_NAME}/fallback/evidence_docs.json"
