# 브랜치 변경사항 정리 + Pull Request 생성

현재 브랜치의 변경사항을 origin과 비교하여 diff를 작성하고 Pull Request를 생성합니다.

## 입력

$ARGUMENTS: 버전명 (선택)
- 예시: "coupon-v1"
- 생략 시 현재 브랜치 사용

## 작업 순서

### 1. 브랜치 확인
```bash
# $ARGUMENTS가 있으면 해당 브랜치로 이동
git checkout {버전명}

# 없으면 현재 브랜치 확인
git branch --show-current

# 커밋되지 않은 변경사항 체크
git status
```
- uncommitted changes가 있으면 먼저 커밋 또는 stash 안내

### 2. Diff 분석
```bash
# origin/main과의 차이 확인
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

아래 내용을 정리:
- 변경된 파일 목록
- 파일별 추가(+) / 삭제(-) 라인 수
- 주요 변경 내용 요약 (기능 단위로)

### 3. PR 문서 작성

아래 형식으로 PR 내용 생성:

```markdown
## 제목
[{기능명}] {개선 요약}

## 개요
{이 PR이 해결하는 문제 또는 추가하는 기능}

## 변경 사항
- {주요 변경 1}
- {주요 변경 2}
- {주요 변경 3}

## 변경 파일
| 파일 | 변경 내용 |
|------|----------|
| `path/to/file1.ts` | {변경 설명} |
| `path/to/file2.ts` | {변경 설명} |

## 테스트 방법
1. {테스트 단계 1}
2. {테스트 단계 2}

## 체크리스트
- [ ] 코드 린트 통과
- [ ] 테스트 통과
- [ ] 문서 업데이트 (필요시)
```

### 4. PR 생성
```bash
# 원격에 브랜치 푸시
git push origin {브랜치명}

# GitHub CLI로 PR 생성 (설치되어 있는 경우)
gh pr create --title "[{기능명}] {개선 요약}" --body "{PR 본문}"

# 또는 PR 생성 URL 안내
# https://github.com/{owner}/{repo}/compare/main...{브랜치명}
```

### 5. 결과 출력
- 🔗 PR 링크 (또는 생성 URL)
- 📋 리뷰어에게 전달할 요약
- ✅ 다음 단계 안내 (리뷰 요청, 머지 후 브랜치 정리 등)
