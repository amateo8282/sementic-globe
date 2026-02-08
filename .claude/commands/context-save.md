현재 작업 상태를 저장하고 context 클리어를 준비합니다.

수행 단계:

1. 폴더 확인
   - .claude/sessions/ 폴더가 없으면 생성

2. Git 상태 수집
   - git branch --show-current
   - git status --short
   - git diff --stat
   - git log --oneline -3

3. 세션 파일 생성
   .claude/sessions/session-YYYY-MM-DD-HHmm.md 파일에 다음 내용 저장:
   - 현재 브랜치명
   - 진행 중인 작업 요약 (현재 대화 기반 1-2문장)
   - 변경된 파일 목록 (git status 결과)
   - 최근 커밋 (git log 결과)
   - 다음 할 일 TODO 목록
   - 관련 플랜 파일 경로 (.plans/ 폴더)

4. 완료 메시지 출력
   저장 경로와 함께 /context-restore 사용법 안내