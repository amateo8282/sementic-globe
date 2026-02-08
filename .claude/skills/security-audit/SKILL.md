---
name: security-audit
description: 바이브코딩 프로젝트의 배포 전/후 보안 취약점을 검사하고 보완 지침을 제공하는 스킬. Next.js, TypeScript, Supabase, AWS/Vercel 스택 대상. "보안 검토해줘", "security audit", "취약점 검사", "배포 전 점검" 등의 요청 시 사용. 의존성 취약점, 데이터베이스 보안(RLS), 인증/인가, 환경변수, API 보안을 95% 이상 커버리지로 검사.
---

# Security Audit Skill

바이브코딩 프로젝트 보안 검사 및 보완 지침 제공.

## 검사 실행 순서

1. `scripts/audit.py` 실행하여 자동 스캔
2. 결과 분석 후 수동 검토 항목 확인
3. 취약점별 보완 지침 제공

## 사용법

```bash
python3 scripts/audit.py --path <프로젝트_경로>
```

### 옵션
- `--path`: 프로젝트 루트 경로 (기본: 현재 디렉토리)
- `--fix`: 자동 수정 가능한 항목 적용
- `--report`: 마크다운 리포트 생성

## 검사 영역 (95% 커버리지)

### 1. 의존성 취약점 (자동)
- `npm audit` 실행 및 결과 파싱
- 심각도별 분류 (critical/high/moderate/low)
- 업데이트 가능 여부 확인

### 2. 환경변수 및 시크릿 (자동)
- `.env*` 파일 gitignore 확인
- 하드코딩된 API 키/시크릿 탐지
- `NEXT_PUBLIC_*` 민감정보 노출 검사

### 3. Supabase 보안 (자동+수동)
- RLS 정책 존재 여부 확인
- anon key vs service_role key 사용 검사
- 클라이언트 사이드 service_role 노출 탐지

### 4. API 라우트 보안 (자동)
- 인증 미들웨어 적용 여부
- Rate limiting 설정 확인
- Input validation 존재 여부

### 5. 프론트엔드 보안 (자동)
- `dangerouslySetInnerHTML` 사용 검사
- 민감정보 클라이언트 번들 포함 여부

### 6. 배포 설정 (수동)
- Vercel/AWS 환경변수 설정 가이드
- CORS, 보안 헤더 체크리스트

## 수동 검토 필요 항목

자동 스캔 후 아래 항목은 수동 확인:

- [ ] Supabase RLS 정책 로직 적절성
- [ ] API 엔드포인트별 권한 검증 로직
- [ ] 결제/민감 데이터 처리 플로우

## 보완 지침

취약점 발견 시 `references/remediation.md` 참조하여 구체적 수정 방법 안내.

### 심각도별 대응
- **Critical/High**: 즉시 수정 필요, 배포 중단 권고
- **Moderate**: 배포 전 수정 권장
- **Low**: 백로그 등록 후 순차 대응
