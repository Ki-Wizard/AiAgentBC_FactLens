# Infrastructure Deployment Guide

**소유팀:** Backend & API 팀  
**주의:** 이 문서는 Backend 팀의 소유 영역입니다. 다른 팀은 임의로 수정하지 마세요.

---

## 배포 방식: AWS SAM (Serverless Application Model)

### 주요 사양

| 항목 | 값 |
|------|-----|
| **AWS Region** | ap-northeast-2 (Seoul) |
| **Compute** | AWS Lambda |
| **Storage** | DynamoDB |
| **Cache/Search** | Bedrock Knowledge Base |
| **API** | API Gateway |
| **IAM** | Role-based |

---

## 디렉토리 구조

```
infra/
├── README.md              # 기본 설명 (이 문서)
├── DEPLOYMENT.md          # 배포 가이드 (이 파일)
├── template.yaml          # SAM 템플릿 (Backend 팀 작성)
├── samconfig.toml         # SAM 설정 파일
├── parameters.json        # 환경별 파라미터
└── lambda/                # Lambda 함수 코드
    ├── analyze/
    │   ├── app.py
    │   └── requirements.txt
    └── get-analysis/
        ├── app.py
        └── requirements.txt
```

---

## API Gateway CORS 설정

Frontend origin에서의 요청을 허용하도록 구성합니다.

### SAM Template 예제

```yaml
ApiGateway:
  Type: AWS::ApiGateway::Api
  Properties:
    StageName: dev
    Cors:
      AllowMethods: "'GET,POST,OPTIONS'"
      AllowHeaders: "'Content-Type,Authorization'"
      AllowOrigin: "'http://localhost:5173,https://factlens.example.com'"
      MaxAge: "'3600'"
```

### 환경별 설정

| 환경 | Frontend Origin |
|------|-----------------|
| 개발 | http://localhost:5173 |
| 스테이징 | https://staging.factlens.example.com |
| 프로덕션 | https://factlens.example.com |

---

## 배포 단계

### 1. 전제 조건
```bash
# AWS CLI 설치 및 설정
aws configure --profile factlens

# SAM CLI 설치
pip install aws-sam-cli
```

### 2. 빌드
```bash
cd infra/
sam build --use-container
```

### 3. 초기 배포 (첫 번째)
```bash
sam deploy --guided --profile factlens
```

대화형 질문:
- Stack name: `factlens-api-dev`
- Region: `ap-northeast-2`
- CORS Origin: `http://localhost:5173` (개발 환경)

### 4. 이후 배포
```bash
sam deploy --profile factlens
```

---

## 환경 변수

### Lambda 환경 변수

```
REGION=ap-northeast-2
DYNAMODB_TABLE=factlens-analyses
BEDROCK_KNOWLEDGE_BASE_ID=<설정값>
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

---

## 보안

- ❌ AWS 액세스 키를 Git에 커밋하지 마세요
- ✅ `.gitignore`에 `samconfig.toml` 추가
- ✅ 환경별 파라미터는 `parameters.json`에서 관리
- ✅ IAM 역할은 최소 권한 원칙(Least Privilege) 적용

---

## 모니터링

### CloudWatch 로그
```bash
sam logs -t -n AnalyzeFunction --stack-name factlens-api-dev
```

### API 호출 테스트
```bash
# analyze endpoint 테스트
curl -X POST https://api-id.execute-api.ap-northeast-2.amazonaws.com/dev/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "documentText": "테스트 텍스트",
    "maxClaims": 10
  }'
```

---

## 롤백

이전 버전으로 롤백하려면:

```bash
aws cloudformation rollback-stack \
  --stack-name factlens-api-dev \
  --region ap-northeast-2 \
  --profile factlens
```

---

## FAQ

**Q: Region을 바꿀 수 있나요?**  
A: 요구사항상 ap-northeast-2 (Seoul)로 고정입니다. 변경이 필요하면 Backend 팀 리더에게 문의하세요.

**Q: Frontend에서 다른 origin으로 요청하고 싶습니다.**  
A: CORS 설정을 수정해야 합니다. 이 문서의 "API Gateway CORS 설정" 섹션을 참고하고, 변경 후 `sam deploy`를 실행하세요.

**Q: Lambda 함수 타임아웃을 늘리고 싶습니다.**  
A: `template.yaml`에서 `Timeout` 속성을 수정한 후 배포하세요.
