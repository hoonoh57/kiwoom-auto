# todo.md

## 한 일

- [x] 2026-09-06 사용자 지시로 상시 문서를 README.md(설명·상세 설계), rules.md(헌법), todo.md(한 일·할 일) 세 개로 통일. 기존 design.md 설계를 README.md로 이전하고 검사기 참조 갱신. rules.md A0/A12에 `세션복구!` 순서와 세션 종료 기록 의무 명시.
- [x] 문서 이전 검증: check.py PASS, git diff --check 통과. 문서 참조의 design.md 잔여는 이전 이력 설명뿐이다. 전체 실시간/아키텍처 acceptance를 통과했다는 의미는 아니다.

- [x] D5.v6.market-time-display: 시간축·crosshair를 Asia/Seoul로 표시. NXT 08:00/KRX 09:00 및 자정 00:00 회귀 검사, UTC epoch 보존 검증. ENGINE/BRIDGE 변경 0.


- [x] D3.v6.candle-source: 새 캔들의 code/tf 기본값을 null 상속으로 교정. 상속 설정 UI와 Enter 확정을 추가하고, 사용자가 지목한 f13의 단일 캔들을 상속으로 수정(원문 백업 보존).
- [x] 종목 변경 시 해당 캔들만 update되고 고정 비교 종목은 유지되는 회귀 검증 PASS. 000660 REST 반환 확인.


- [x] 브라우저 접속·실행·종료 스크립트와 기본 APP_PORT를 8777에서 8077로 변경했다.

- [x] 키움 HTS형 가상화면과 경쟁 UX 비교 결과를 v6 목표 범위로 변환했다.
- [x] 기존 동적 VD ID·order 설계와 실제 고유 이름 결함을 architecture remediation으로 분류했다.
- [x] r6.0에서 `README.md`를 schemaVersion 6 기준 D1~D14 설계도로 교체하고 당시 OPEN 0으로 결정했다.
- [x] `vd1`~`vd8` 고정 슬롯, enabled 상태, NFKC 기반 고유 라벨, v5→v6 무손실 마이그레이션 순서를 확정했다.
- [x] VD 종목연동·공유그룹·전체 탐색기·상태 badge·복제·snapshot·undo·import/export·스냅·명령 팔레트를 축별로 배치했다.
- [x] z-order와 geometry 비용을 분리하고 trusted pointer만 raise하도록 설계했다.
- [x] chart `barSpacing` 사용자 입력 gate와 32-entry/1200-bar LRU cache 계약을 확정했다.
- [x] 다종목 캔들 overlay/pane/독립축/비교모드 설계를 v6에 통합했다.
- [x] canonical 설계 fixture `state/workspace.v6.fixture.json`을 작성했다.
- [x] 기존 v5 다종목 설계를 v6 개정 기준선으로 승계하고 D13 구현 순서를 Gate 0~Tranche 7로 고정했다.
- [x] r6.0 커밋에서 `README.md`와 `todo.md`의 기준 commit·schemaVersion·설계 상태·OPEN·Gate·Tranche 순서를 동기화 검증했다.

## 할 일

### 해결됨 — RC-foundation-coordinates

- 충돌 좌표: A2.6 D2↔Part B 1:1, B1~B5/B7/B13/B18. 현재 ENGINE/BRIDGE 위치와 primitive는 chart/frame 중심, root STATE는 v6 단일 workspace로 고정돼 있다.
- 구체 사례: 프로젝트 envelope v7과 공통 request/stream/lease/journal primitive를 추가하면 현 Part B에 없는 구현 위치·primitive·schema가 생긴다. 기능 추가 승인만으로 rules.md 좌표를 자동 변경할 수 없다.
- 규칙 유지 대안: v6 단일 프로젝트와 기존 REST adapter 범위에 한정. 사용자 전체 목표인 프로젝트 격리/공통 WSS·주문 복원은 미충족으로 남긴다.
- 해결: 2026-09-06 사용자 `예`로 README.md D2.foundation-r7.boundary의 B1~B5/B7/B13/B18 확장 승인 및 rules.md 반영. Part A/I1~I12 및 frozen generic CRUD·/api/node·vendor 계약 유지.
- 좌표 확장은 승인 완료이므로 다시 묻지 않는다. 전체 상세 명세와 독립 T12 완료는 별도 검증한다. 신규 실시간 제품 코드는 아직 미수정.

### 실행 계획 — README.md D1~D14.foundation-r7

- [x] R2a(project-envelope-a): web/js/project-state.js의 wrapWorkspaceJson/projectWorkspacePath/selectProject 구현. validator clone 격리, unknown/숨김 설정 보존, safe project ID, 동일 선택 identity, N=1000 선택 시 무관 프로젝트 순회 0 검증.
- [x] R1: 독립 보고서 읽기·문서 SHA·blocking findings·시그니처/기대값 비교 연결. --t12-scope project-envelope-a는 원문 증거와 현재 명세의 범위 일치까지 검증하며 scoped PASS만 출력.
- [x] 최신 검사: JS 12개, Python 25개(기존 13+검증기 12), recorder 및 scoped T12 PASS. 전체 foundation-r7 T12는 14개 차단 결함으로 FAIL이며 새 문서 개정 이후 전체 재검토도 필요. 제품 전체 ARCH PASS 아님.
- [x] 추가 독립 검토 재개: review_envelope_b가 rules/README만 읽고 B 검증기 재구성. D4/D10 오류 우선순위 모순 1건을 코드 착수 전에 수정하고 재검토 PASS. 시그니처 1개/PEB1~14 기대값 비교·원문 SHA 확인 완료.
- [x] project-envelope-b 설계 상태 APPROVED, OPEN 0: 기존 사용자 전체 설계 구현 및 계속 지시의 순차 구현 범위. 독립 T12 통과 후 순수 JSON 검증기만 착수한다. 프로젝트 저장/UI 연결은 후속 범위.
- [x] R2b(project-envelope-b): validateProjectEnvelopeJson 구현. v7 envelope 구조/ID/이름 중복/활성 프로젝트 검증, 전체 구조 확인 후 v6 callback 실행, unknown/숨김 값 보존·callback clone 격리. PEB1~14, 오류 우선순위 및 N=1/10/1000 검증 PASS.
- [x] 최신 검증: 프로젝트 .venv Python으로 static/semantic/recorder 및 B scoped T12 PASS. JS 13개·Python 26개 통과. 시스템 Python 첫 실행은 httpx/dotenv 미설치로 실패했고 프로젝트 환경에서 재실행했다. A scoped 증거도 유지한다.
- [ ] R2c 다음: README.md D7.project-storage.followup의 저장 실패/프로젝트 ID 포착/큐 재기준화/원문 백업 계약과 실제 v6 strict validator를 확정하고 독립 검토한다. A/B는 순수 함수이며 현재 화면의 자동 v7 마이그레이션/프로젝트 전환 UI/파일 저장은 아직 연결하지 않았다.
- [x] D5.wire-profile/normalized-events 추가: control pending 1개, ack 상관관계/timeout/heartbeat, 시세·호가·계좌·조건식 정규화 필드와 단위 명시. descriptor.sideEffect 필드를 명시해 부작용 요청의 공유/재시도 금지 계약을 연결.
- [x] tests/fixtures/foundation-r7.contract.json: F01의 N=1/10/1000을 포함한 14개 설계 시나리오/기대 trace 작성, 형태·seq·ID 유일성 확인. 실행 harness/제품 동작 증거가 아니며 상세 독립 검토 필요.
- [x] R1 실행 분리 구현: 기본 static, --semantic 기존 회귀 실행, --recorder 실제 callback 기록, --t12 독립 증거 미완료를 MISSING_REVIEW로 실패 처리. 미실행 gate를 PASS로 출력하지 않음.
- [x] JS 11개/Python 19개 회귀 및 recorder PASS. runner의 실패 전파·timeout·누락 파일·오래된 artifact 오인 방지 6개 테스트 포함. 전체 flags 실행은 T12 미완료 때문에 예상대로 exit 1. r7/브라우저/ARCH PASS 아님.
- [x] 사용자 `예`로 독립 검토 에이전트 사용 승인. /root/t12_review가 rules/README만 읽고 전체 r7 FAIL(차단 14개)을 tests/reference/foundation-r7.t12-review.json에 기록.
- [x] 최소 범위 D1~D14.project-envelope-a를 코드 전에 명세화. 동일 코드 비열람 검토자가 독립 시그니처 3개/PEA1~PEA12 재구성 후 scoped PASS. tests/reference/project-envelope-a.t12-review.json의 README SHA256 일치 확인. 전체 r7 PASS와 구분.
- [x] 범위 승인: 기존 사용자 `할일과 설계 완전 구현` 및 후속 `진행`/`계속` 지시를 project-envelope-a 순차 구현 승인으로 적용. 이 범위 OPEN 0, T12 PASS, 코드 착수 게이트 충족. 범위를 넘는 UI/파일저장/실시간 제품 구현은 포함하지 않는다.
- [x] 2026-09-06 좌표 확장 승인 반영: Part A 변경 0, B1~B5/B7/B13/B18만 확장.
- [x] D6.resource-types/D10.reconciliation/D4.command-journal 상세 계약 추가: lease/descriptor/error, snapshot 경합, UNKNOWN 주문 재전송 금지와 내구 기록.
- [x] state/workspace.v7.fixture.json 작성. 내부 v6 전체 deep equality·한국어 인코딩·automationEnabled=false 검증 PASS. 사용자 state/workspace.json은 변경하지 않았다.
- [x] 문서/fixture tranche의 check.py 및 git diff --check 통과. 새 WSS/프로젝트 제품 구현과 독립 T12 완료를 뜻하지 않는다.
- [x] 공식 Kiwoom 저장소 commit 234560d213acd8871ae344b5481aecd2f30287fa의 WSS runtime과 API spec을 읽고 주문/계좌/시세/조건검색 wire 카탈로그를 대조.
- [x] 실행 설계안 D1~D14 추가: v7 프로젝트 envelope 제안, 4축 좌표, 공통 자원 계약, 연결 복구, 오류표, F01~F12, 부하 측정 조건 및 단계별 산출물 기록. DRAFT이며 완전 명세/T12 완료가 아님.
- [x] 관측 architecture defect: runtime.js 전체 normalize/정렬 및 chart.js 전체 projection/hash가 남아 있음. lifecycle locality만으로 I9 통과를 판정하지 않는다.
- [ ] R0: 좌표 승인→descriptor/journal/reducer 충돌 표→v7 fixture/실제 golden trace→독립 T12→신규 범위 구현 게이트 확정.
- [x] R1: 실행 분리와 독립 T12 증거 비교 연결 완료. 전체 설계 PASS 여부는 별도이며 현재 전체 r7은 통과하지 못한다.
- [ ] R2: 프로젝트 STATE와 v6→v7 원문 보존 마이그레이션, 전 단위 복원.
- [ ] R3: 범용 key index/lease/queue/session 및 feature-blind diff.
- [ ] R4: 등록 기반 Kiwoom TR, 공유/페이지/인증/유량, 기존 adapter 단일 경로 이관.
- [ ] R5: WSS 시세/호가/장상태, snapshot+delta와 연결 세대 격리.
- [ ] R6: 계좌/주문 감시·서버 대조·journal·정정/취소/부분체결/UNKNOWN.
- [ ] R7: 조건검색 초기 결과·편입/이탈·해제·재동기화.
- [ ] R8: 차트 polling 이관 및 지표/화면 변경분 처리, 최신성 UI.
- [ ] R9: 기존 v6 잔여 브라우저 acceptance, F01~F12, 부하/장애/장중 실증 후 최종 판정.

### 최우선 — TR/WSS 실시간 동기화 기반 (2026-09-06 사용자 목표 확정)

- 최상위 목적 추가 확정: 범용 핵심 불변 + 수천 ADDON 확장 + 성능 계약 유지 + 전 단위 영속성 + 다종목 WSS/TR 유지·복원. D1.realtime-foundation.purpose 및 D12.realtime-foundation.scale에 명시. 등록/저장 수와 활성 부하를 분리하고 단일 변경의 무관 대상 operation 0 및 부하/장애 복구를 검증하기 전에는 보장 완료로 기록하지 않는다.
- 추가 사용자 필수 조건: 프로젝트/VD/자식폼/ADDON의 모든 사용자 설정·desired 값을 JSON으로 보존하고 다음 세션에도 정상 적용과 동일한 로직으로 복원. 4축 경계 절대 유지. D4/D11.realtime-foundation.persistence에 기록. 프로젝트 격리 스키마와 P1~P8 실증은 미완료.
- 사용자 목표: 전략개발·조건식·키움계좌 연계를 위한 기반. 복잡한 ADDON 추가 전에 단순 TR 조회부터 실시간 매매에 필요한 WSS 업데이트와 서버 상태 동기화를 갖춘다.
- 관측: REST 조회와 차트/현재가 polling만 구현. WSS 수신·재구독·계좌/주문 재동기화·실시간 성능 보장은 미구현. 기존 조회 검사 PASS는 실시간 기반 완료를 뜻하지 않는다.
- 신규 범위 설계 상태: DRAFT (요구사항 기록, 상세 설계/T12 미완료). 기존 v6 승인 범위 유지. 참조: README.md D1.realtime-foundation.requirements 및 D14.realtime-foundation.open.
- [ ] 공식 TR/WSS 카탈로그와 환경별 지원·제한을 대조해 조회/주문/실시간/조건검색 계약 확정.
- [ ] 인증·구독 공유·재접속·TR snapshot/WSS delta 정합성·주문 결과 불명 처리와 4축 경계를 상세 설계.
- [ ] 수신→계산→화면 지연, backlog, 메모리, 누락/중복 및 복구 완료 조건을 수치와 테스트 trace로 확정.
- [ ] 상세 설계 검토 후 TR 기반→WSS 시세→계좌/주문→복구·부하 검증 순으로 구현. 복잡한 전략 ADDON보다 우선한다.

### 선택 종목 기준 지표 동기화 토글 — 구현 완료

- [x] 사용자 `예`로 A안(설정 복사·각 종목 데이터로 개별 계산) 승인. D3/D5/D7/D11.v6.indicator-sync 계약을 먼저 기록했다.
- [x] 지표 동기화 ON/OFF, targetItemId 귀속, 기준 지표 추가·수정·삭제 전파, OFF 독립 편집 구현.
- [x] MA/거래량/MACD/RSI/누적거래대금은 단일 지표 ADDON으로 자기 dataKey만 계산. MA는 대상 캔들 pane/축, 별도 지표는 종목별 pane.
- [x] tests/indicator-sync-v6.mjs: 종목별 다른 MA값, 동일 적용 idempotence, OFF locality, 대상 숨김/삭제, 기준 전환 및 재사용 ID 유지 검증 PASS.
- [x] ENGINE/BRIDGE 제품 코드 변경 0. 전체 기존 JS/Python 검사 통과.
- [ ] 실제 브라우저에서 지표 동기화 토글·패널 표시 확인. 서버 STATE를 검증용으로 변경하지 않았다.

### 선행 구현 — 종목 레전드 선택

- [x] 사용자 `진행` 승인에 따라 D3/D5/D7/D11.v6.legend-selection 계약을 코드보다 먼저 기록했다.
- [x] body.ui.selectedItemId 영속 선택, 레전드 버튼·선택 강조, 동일 종목의 item ID 구분 구현.
- [x] 선택 대상 삭제/비활성 시 같은 patch에서 선택 해제. legacy/stale 선택은 null 정규화.
- [x] tests/chart-selection-v6.mjs: 선택·재클릭·복원·무효 ID·신규 selectable kind·선택 변경 시 draw/subscription 0 검증 PASS.
- [x] ENGINE/BRIDGE 파일 변경 0. 향후 전략 대상은 {formId,itemId}; 이번에는 전략 실행을 추가하지 않음.
- [ ] 실제 브라우저에서 레전드 조작 및 시각 확인. 연결 가능한 브라우저 부재로 자동 검증만 수행.
- 다음: Tranche 6 잔여 구현.


### 우선 작업 — 실제 키움 REST 전환 (2026-09-06)

- 참조 저장소는 `hoonoh57/kiwoom-desk`로 정정됨. server/index.ts, src/api/KiwoomClient.ts, src/api/trSchema.ts 검토 완료.
- 해결한 결함: 자체 MockAdapter와 출처 없는 봉 캐시 혼입. REST source별 캐시로 분리 완료.
- [x] `README.md` REST 전환 범위는 사용자 `모두 진행`으로 승인되어 구현 완료.
- [x] 로컬 인증 설정이 구성된 것을 재확인하고 키움 모의투자 서버의 실제 읽기 전용 조회를 검증했다. 키 값은 출력·커밋하지 않았다.
- [x] 자체 MockAdapter 제거, REST 인증·TR·연속 조회·KST 변환, source별 v2 캐시 격리, 설정 상태 표시 완료.
- [x] 실제 조회: 현재가·잔고 성공, tick/1m/5m/30m/1d/1w 각 600봉, 1M 501봉 성공. 요청 간격 1.2초에서 연속 조회 제한 해소. 외부 주문 요청 0건.
- [x] Python 13개 테스트, 기존 JS 5개 검증 스크립트, check.py, diff 검사 통과.
- [ ] 브라우저 시각 검증: 연결 가능한 브라우저 없음. 8077 health 및 데이터 API 응답만 확인.
- REST 변경 098af42, 캔들 상속 수정 750634d 커밋·push 완료. 전체 ARCH PASS는 아직 아님.


REMEDIATION_REQUIRED

### 해결됨 — RC-recovery-frozen

- 충돌 규칙: B13의 frozen `app/store.py`와 `app/main.py /api/node` 계약, D4.v6.recovery-mode의 손상 원문 내보내기·교체 요구.
- 구체 사례: 현재 `store._load_raw()`는 JSON parse 실패를 `{}`로 바꾸므로 UI가 손상 여부와 원문을 구분하거나 원본을 내보낼 수 없다. 기존 `/api/node`에는 raw 상태 조회·교체 계약이 없다.
- 규칙 유지 대안: JSON parse 실패 복구 화면과 손상 원문 내보내기를 v6 범위에서 제거하고 현재 빈 객체 복구 동작을 유지한다.
- 목표 설계 유지 대안: 사용자가 B13을 "기존 `/api/node`는 유지하고 generic recovery status/export/replace 계약 추가 허용"으로 변경하라고 명시적으로 승인한다. 기능 의미는 persistence 경계에 넣지 않는다.
- 상태: 2026-09-05 사용자 `A-1 승인`으로 B13에 기존 CRUD 보존+generic recovery API 추가를 허용해 해결했다.

### 해결됨 — RC-v6-schema

- 충돌 규칙: A2.6의 D2↔Part B 1:1 요구, B4의 `schemaVersion 5`, B18의 `workspace.v5.fixture.json`, B19의 trace 목표 경로.
- 구체 사례: 개정 `README.md`와 canonical fixture는 schemaVersion 6인데 Part B는 schemaVersion 5만 프로젝트 STATE 좌표로 허용한다. 이 상태에서는 C1과 계층 매핑 PASS를 동시에 만족할 수 없다.
- 규칙 유지 대안: schemaVersion을 5로 유지하고 v6 필드를 v5의 optional 필드로 추가하며 fixture와 trace 경로도 Part B 값으로 되돌린다.
- 목표 설계 유지 대안: 사용자가 rules.md의 B4·B18·B19를 schemaVersion 6 및 v6 fixture 경로로 변경하라고 명시적으로 승인한다.
- 상태: 2026-09-05 사용자 `A안 승인`으로 B4·B18·B19를 v6 좌표로 변경해 해결했다.

### r6.1→r6.2 설계 검토 반영

- [x] O2: `allVd`를 일반 폼과 같은 VD별 z 공간으로 확정했다.
- [x] O1: 수기 hex 대신 결정적 `H(canonicalInput)`과 제품 코드를 import하지 않는 reference fixture 생성기로 해소했다.
- [x] 승인 전 hotfix 예외를 제거하고 이미 커밋된 v5 수정만 historical baseline으로 남겼다.
- [x] Add-on 다섯 번째 훅을 제거하고 B5 resize 어휘의 ENGINE generic `observeResize` primitive로 교체했다.
- [x] A5 semantic recorder를 `{seq,op:ensure|update|remove,id,kind,propsHash}`로 복원하고 ENGINE spy trace를 분리했다.
- [x] REPAIR/FATAL을 비영속 boot 결과로 두고 recovery status/raw/replace 계약을 확정했다.
- [x] STATE가 VD 정책을 소비해 generic change-set을 만들고 BRIDGE는 workspace를 읽지 않도록 정리했다.

### 현재 좌표

```text
branch       : main
제품 기준선  : fc4de20 (R2a push 완료); R2b는 현재 tranche commit을 Git log로 대조
문서 tranche : 전체 독립 T12 FAIL + project-envelope-a/b 독립 PASS
worktree     : R2b 순수 JSON 검증 및 scoped 비교 완료; Git 상태 대조
현재 STATE   : state/workspace.json schemaVersion 6
목표 STATE   : schemaVersion 7 envelope + 프로젝트 내부 v6
설계 상태    : 기존 v6 APPROVED; project-envelope-a/b APPROVED/구현; foundation-r7 DRAFT
OPEN         : 전체 T12 차단 14개 / project-envelope-a/b 0
게이트       : B T12·static·semantic·recorder PASS; 전체 새 범위 독립 재검토 필요
다음 설계 ID : README.md D7.project-storage.followup, D3/D4.foundation-r7, T12-R7-004
다음 행동    : R2c v6 strict validator/프로젝트 CRUD/저장 ack·실패 계약 확정 후 독립 검토. review_envelope_b로 검토 재개됨
검증 잔여    : 실시간 구현/부하/복구, 프로젝트 격리, 브라우저 acceptance, 전체 ARCH PASS
```

### Gate 0 — 코드 착수 전

- [x] 사용자가 제공한 r6.1 독립 개정의 공개 시그니처·trace 검토 R1~R20을 확인했다.
- [x] rules.md 대조에서 나온 R21~R31까지 반영하고 T12 불일치 0을 확인했다.
- [x] T12 PASS 후 설계 상태를 REVIEWED로 판정했다.
- [x] 사용자가 2026-09-05 설계 전체를 최종 APPROVED했다.
- [x] 승인 전 제품 코드를 수정하지 않았다.

### Tranche 1 — STATE v6 [D3.v6.*, D4.v6.*, D7.v6.slot-commands]

- [x] `deskspec.js`에 v6 default/validate/reconcile과 labelKey를 구현했다.
- [x] v5→v6 migration과 백업·원자 저장 실패 계약을 구현했다.
- [x] 슬롯 활성화·이름검증·초기화·복제 patch 순수 함수를 구현했다.
- [x] fixture round-trip, 중복 라벨, 8개 초과, ID 재매핑, z 정규화 테스트를 통과했다.
- [x] green 상태의 Tranche 1 커밋으로 반영하고 push한다.

### Tranche 2 — BRIDGE 정합성 [D7.v6.desired-diff, D7.v6.z-list, D8.v6.*, D9.v6.*]

- [x] STATE projection이 globalOn/slot enabled/visible/allVd/activeVd 공식을 적용하고 `desk.js`에는 generic change-set만 전달하게 했다.
- [x] unmount 전 live.delete, kind 교체, 결정적 순서, z-only setZ를 구현했다.
- [x] 독립 reference canonical hash fixture와 A5 recorder event를 구현했다.
- [x] T1~T11 semantic trace와 N=1000 locality/idempotence를 통과했다.
- [x] green 상태의 Tranche 2 커밋으로 반영하고 push한다.

### Tranche 3 — ENGINE frame [D6.v6.frame-api, D7.v6.z-list]

- [x] `frame.js` 공개 primitive, size observer, destroyed-handle 오류를 계약에 맞춘다.
- [x] `snapRect`의 축별 후보·tie-break·할당 상한을 구현한다.
- [x] pointer 이벤트 객체를 전달하고 Bridge가 trusted 입력만 raise하게 한다.
- [x] z·위치 변경 시 contentSize callback 0, 크기 변경 시 batch당 callback 최대 1 테스트를 통과한다.
- [x] green 후 해당 tranche만 커밋하고 push한다.

- 검증: `tests/frame-v6.mjs`, `tests/desk-bridge-v6.mjs`, 기존 STATE/projection/candles 테스트와 `check.py` PASS. 실제 브라우저 조작감은 Tranche 7에서 확인한다.

### Tranche 4 — ADDON chart 안정화 [D5.v6.chart-range, D5.v6.market-cache, D5.v6.candles-compare]

- [x] trusted wheel/pointer 표식이 있는 range callback만 barSpacing을 저장하게 한다.
- [x] 프로그램 setBarSpacing과 draw가 STATE write를 만들지 않는 테스트를 추가한다.
- [x] refCount/useSeq 기반 market data cache와 32-entry eviction을 구현한다.
- [x] 다종목 C1~C5와 다른 item operation 0을 재검증한다.
- [x] green 후 해당 tranche만 커밋하고 push한다.

- 검증: chart-stability-v6 및 multisymbol-candles의 D5 회귀 검사, 기존 JS 검사와 Python 13개 테스트 PASS. 브라우저 실조작은 Tranche 7 잔여.

### Tranche 5 — UI 슬롯·링크 [D7.v6.slot-commands, D7.v6.symbol-link, D10.v6.*]

- [x] 상단을 8개 고정 슬롯으로 렌더하고 disabled 슬롯을 `+N`으로 표시한다.
- [x] add를 최저 disabled 슬롯 활성화로, delete를 확인형 reset으로 교체한다.
- [x] rename modal이 비교키 중복에서 닫히지 않고 STATE write 0이 되게 한다.
- [x] `vd|all`, `follow|pin`, `all|1..10` 종목연동을 단일 root patch로 구현한다.
- [x] U1~U6와 마지막 슬롯 보호 acceptance를 통과한다.
- [x] green 후 해당 tranche만 커밋하고 push한다.

- 검증: tests/ui-slots-v6.mjs — 8개 슬롯, +N 활성화, 중복 modal 유지, 고정 종목·그룹·범위 분리, 마지막 슬롯 보호 PASS. 실제 브라우저 시각 acceptance는 Tranche 7 잔여.

### Tranche 6 — 탐색·생산성·복구 [D7.v6.navigator, D7.v6.snapshot-import, D4.v6.recovery-mode]

- [x] 전체 화면 탐색기와 슬롯별 visible count/error dot을 구현한다.
- [x] `Ctrl+1`~`Ctrl+8`, `Ctrl+K` 명령 팔레트를 구현한다.
- [x] 빈 슬롯 VD 복제와 name snapshot CRUD를 구현한다.
- [x] 1단계 undo와 workspace JSON import/export 검증·diff 확인 modal을 구현한다.
- [x] 부팅 전 recovery status 확인과 FATAL 복구 화면을 recovery API에 연결한다.
- [ ] U7~U13과 취소 경로 STATE write 0을 통과한다.
- [x] green 후 해당 tranche만 커밋하고 push한다.

- 자동 검증: workspace-tools-v6의 snapshot/import/undo, 검색·정렬·상태 검증 PASS. 현재 사용자 workspace export/import 왕복 검증 PASS. 큰 화면의 정상 좌표를 기본 viewport clamp로 오판하던 검증 결함 수정.
- 실제 사용자 상태를 snapshot/import/undo 테스트로 변경하지 않았다. 브라우저 U7~U13 acceptance는 아직 남아 있다.

### Tranche 7 — 전체 acceptance

- [ ] `tests/fixtures/desk-traces.v6.json`을 D11의 실제 event 배열로 확정한다.
- [ ] `check.py --static --semantic --recorder --t12`가 각 gate를 독립 결과로 출력하게 한다.
- [ ] 실제 브라우저에서 8슬롯, 중복 이름 거부, reset/undo, VD 전환, allVd, 링크그룹, 탐색기, clone, snapshot, import/export를 확인한다.
- [ ] chart에서 1초 간격 `~form` 자기발진과 z 변경 resize가 0임을 로그로 확인한다.
- [ ] T1~T13, U1~U13, C1~C5 모두 PASS일 때만 ARCH PASS를 기록한다.
- [ ] 최종 문서 좌표를 갱신하고 커밋·push한다.

## 재시도 금지

- DRAFT 또는 REVIEWED 상태에서 제품 코드 수정.
- 동적 `vdN` ID 추가와 9번째 슬롯 생성.
- 중복 라벨을 로그만 남기고 STATE에 쓰는 경로.
- UI가 frame/addon live handle을 직접 생성·복원하는 경로.
- `frame.js` 또는 `core.js`에 VD·chart·종목 의미를 넣는 변경.
- `desk.js` 또는 `runtime.js`에 screen kind별 분기와 복원 전용 상태를 넣는 변경.
- z-only 변경에서 `cat.resize()`를 호출하는 경로.
- 프로그램 range callback이 `barSpacing`을 PATCH하는 경로.
- v5 원본과 기존 `state/workspace.v5.bak` 덮어쓰기.
- 외부 cloud·네이티브 window를 v6 범위에 끼워 넣는 변경.
