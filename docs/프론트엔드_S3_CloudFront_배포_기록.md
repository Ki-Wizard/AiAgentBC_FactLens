# 프론트엔드 S3 CloudFront 배포 기록

## 배포 결과

FactLens React 프론트엔드를 S3 private bucket에 업로드하고 CloudFront로 배포했다.

```text
Web URL: https://d26fxwkgccjdap.cloudfront.net
CloudFront distribution ID: EKX7XE322XUAZ
CloudFront status: Deployed
S3 bucket: factlens-frontend-dev-069423016509-ap-northeast-2
Region: ap-northeast-2
Backend API Base URL: https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com
```

## 구성 방식

- React/Vite build 시 `VITE_API_BASE_URL`에 배포된 API Gateway base URL을 주입했다.
- S3 bucket은 public access block을 유지했다.
- CloudFront Origin Access Control(OAC)을 사용해 CloudFront만 S3 object를 읽도록 설정했다.
- SPA route fallback을 위해 CloudFront 403/404 응답은 `/index.html`로 매핑했다.
- API Gateway CORS는 CloudFront origin과 local dev origin을 허용하도록 설정했다.

## AWS 리소스

| 구분 | 값 |
|---|---|
| S3 bucket | `factlens-frontend-dev-069423016509-ap-northeast-2` |
| CloudFront distribution | `EKX7XE322XUAZ` |
| CloudFront domain | `d26fxwkgccjdap.cloudfront.net` |
| OAC ID | `E39OOW2KAI2I9I` |
| API Gateway ID | `kprxxco5hi` |
| Backend stack | `factlens-backend-api` |

## 검증 결과

```text
npm test --prefix frontend
결과: 5개 통과

env VITE_API_BASE_URL=https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com npm run build --prefix frontend
결과: production build 성공

curl -I https://d26fxwkgccjdap.cloudfront.net/
결과: HTTP 200, content-type text/html

OPTIONS /analyze with Origin https://d26fxwkgccjdap.cloudfront.net
결과: HTTP 204, access-control-allow-origin 정상 반환

POST /analyze with Origin https://d26fxwkgccjdap.cloudfront.net
결과: HTTP 200, access-control-allow-origin 정상 반환
```

## 재배포 명령

```bash
cd /Users/ojaebaek/Documents/코마/AiAgentBC_FactLens

env VITE_API_BASE_URL=https://kprxxco5hi.execute-api.ap-northeast-2.amazonaws.com npm run build --prefix frontend

aws s3 sync frontend/dist s3://factlens-frontend-dev-069423016509-ap-northeast-2/ \
  --delete \
  --region ap-northeast-2

aws cloudfront create-invalidation \
  --distribution-id EKX7XE322XUAZ \
  --paths "/*"
```

## 주의 사항

- CloudFront는 global 서비스라 생성 직후 DNS 전파와 배포 완료까지 시간이 걸릴 수 있다.
- S3 bucket은 public website hosting 방식이 아니라 CloudFront OAC 방식이다.
- API Gateway CORS 설정에서 CloudFront origin이 빠지면 브라우저에서 API 호출이 차단된다.
