# Infrastructure

AWS 리소스 정의와 배포 기록을 관리하는 영역입니다.

## Planned Resources

- S3 bucket for frontend hosting
- S3 bucket for uploaded input and evidence documents
- Lambda functions
- API Gateway HTTP API
- DynamoDB table for analysis results
- Bedrock and Bedrock Knowledge Bases configuration

## Defaults

- Region: `ap-northeast-2`
- Deploy: AWS SAM
- API Gateway CORS: Frontend origin 허용

## Notes

`infra/`는 Backend & AWS API 담당 소유 영역입니다. 다른 담당자는 임의 수정하지 않습니다. 실제 리소스 이름과 SAM 배포 절차는 백엔드 구현 후 이 문서에 기록합니다.
