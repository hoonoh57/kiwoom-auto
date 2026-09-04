# todo.md

## 현재 좌표
branch : main commit : d6b4d383631d7e83e6792277e51106b05f81faf2 schema : 코드 4 / 설계 5(DRAFT) 게이트 : A2.5 = DRAFT. 제품 코드 착수 금지

Copy
## 한 일
[x] store.py 경로 트리 STATE 도입, /api/node 3개로 통합 (A1.4 준수) [x] VD별 tf 독립 저장/복원 (vds/{vd}.tf) — 검증 완료 [x] 프로필 미존재 조합 백지 결함 원인 규명: switchTo가 생성 경로를 타지 않음 [x] 키움 영웅문4 가상화면/자식폼/화면검색 조사 — design.md 1절에 출처 기록 [x] design.md 초안 작성 (schemaVersion 5, 자식폼 도입)

Copy
## 할 일
[x] D-Q1~Q4 결정 -> design.md 14절 APPROVED
[x] check.py 정적 게이트 PASS (C1~C7)
[ ] 구현 tranche 1: deskspec.js (완료 후 dry-run 검증)
[ ] 구현 tranche 2: frame.js(ENGINE) + desk.js(BRIDGE) + 마이그레이션 적용
[ ] 구현 tranche 3: screens.js + screens/chart.js (기존 차트 이식)
[ ] 구현 tranche 4: 타이틀바 VD 버튼 / 화면검색 콤보 / 퀵툴바 / Ctrl+1~8
[ ] 구현 tranche 5: screens/quote.js, order.js, log.js
[ ] check.py를 start.bat 선행 게이트로 연결

Copy
## 미해결 결함 (증거)
D-A. profiles 중 items 0 인 키 8건. 구버전 switchTo 잔재. 증거: vd2|000660|1m ... vd4|005380|30m, panes=[('main',776)] 처리: design.md D10 마이그레이션에서 폐기 (Q4 승인 대기) D-B. vd1|005930|1m 의 macd h=187 / rsi h=182. 과거 피드백 루프 잔재. 처리: D9 비율 정규화 저장으로 재발 차단. 값은 사용자 재조정 시 정리 D-C. 페인 높이를 렌더 픽셀 그대로 되써 컨테이너 크기에 따라 표류(776px). 처리: D9

Copy
## 이탈 기록 (A-GUIDE)
이전 세션에서 A2.5 미승인 상태로 statespec.js/app.js 패치를 제시했다. 결과: 오염 레코드 판정 누락(빈 레코드 조건을 order.length가 아닌 keys로 잡음). 재발 방지: 구현 tranche는 design.md APPROVED 이후에만 시작한다.
