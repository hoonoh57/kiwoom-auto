# todo.md

## 한 일

- [x] 키움 HTS형 가상화면과 경쟁 UX 비교 결과를 v6 목표 범위로 변환했다.
- [x] 기존 동적 VD ID·order 설계와 실제 고유 이름 결함을 architecture remediation으로 분류했다.
- [x] r6.0에서 `design.md`를 schemaVersion 6 기준 D1~D14 설계도로 교체하고 당시 OPEN 0으로 결정했다.
- [x] `vd1`~`vd8` 고정 슬롯, enabled 상태, NFKC 기반 고유 라벨, v5→v6 무손실 마이그레이션 순서를 확정했다.
- [x] VD 종목연동·공유그룹·전체 탐색기·상태 badge·복제·snapshot·undo·import/export·스냅·명령 팔레트를 축별로 배치했다.
- [x] z-order와 geometry 비용을 분리하고 trusted pointer만 raise하도록 설계했다.
- [x] chart `barSpacing` 사용자 입력 gate와 32-entry/1200-bar LRU cache 계약을 확정했다.
- [x] 다종목 캔들 overlay/pane/독립축/비교모드 설계를 v6에 통합했다.
- [x] canonical 설계 fixture `state/workspace.v6.fixture.json`을 작성했다.
- [x] 기존 v5 다종목 설계를 v6 개정 기준선으로 승계하고 D13 구현 순서를 Gate 0~Tranche 7로 고정했다.
- [x] r6.0 커밋에서 `design.md`와 `todo.md`의 기준 commit·schemaVersion·설계 상태·OPEN·Gate·Tranche 순서를 동기화 검증했다.

## 할 일

REMEDIATION_REQUIRED

### 해결됨 — RC-recovery-frozen

- 충돌 규칙: B13의 frozen `app/store.py`와 `app/main.py /api/node` 계약, D4.v6.recovery-mode의 손상 원문 내보내기·교체 요구.
- 구체 사례: 현재 `store._load_raw()`는 JSON parse 실패를 `{}`로 바꾸므로 UI가 손상 여부와 원문을 구분하거나 원본을 내보낼 수 없다. 기존 `/api/node`에는 raw 상태 조회·교체 계약이 없다.
- 규칙 유지 대안: JSON parse 실패 복구 화면과 손상 원문 내보내기를 v6 범위에서 제거하고 현재 빈 객체 복구 동작을 유지한다.
- 목표 설계 유지 대안: 사용자가 B13을 "기존 `/api/node`는 유지하고 generic recovery status/export/replace 계약 추가 허용"으로 변경하라고 명시적으로 승인한다. 기능 의미는 persistence 경계에 넣지 않는다.
- 상태: 2026-09-05 사용자 `A-1 승인`으로 B13에 기존 CRUD 보존+generic recovery API 추가를 허용해 해결했다.

### 해결됨 — RC-v6-schema

- 충돌 규칙: A2.6의 D2↔Part B 1:1 요구, B4의 `schemaVersion 5`, B18의 `workspace.v5.fixture.json`, B19의 trace 목표 경로.
- 구체 사례: 개정 `design.md`와 canonical fixture는 schemaVersion 6인데 Part B는 schemaVersion 5만 프로젝트 STATE 좌표로 허용한다. 이 상태에서는 C1과 계층 매핑 PASS를 동시에 만족할 수 없다.
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

현재 좌표

```text
branch       : main
제품 기준선  : 95d97a8 docs: approve multi-vd workspace v6 design
문서 tranche : 95d97a8 r6.2 APPROVED
worktree     : Tranche 1 STATE v6 구현
현재 STATE   : state/workspace.json schemaVersion 5
목표 STATE   : schemaVersion 6
설계 상태    : APPROVED (r6.2, 전체 D1~D14)
OPEN         : 0
게이트       : C1 완료, C2 완료, C3(T12) 완료, C4(APPROVED) 완료
모델 운용    : gpt-5.6-sol high 유지; deterministic 저위험 구현 진입 전에 low 전환 가능 시점 고지
다음 설계 ID : D3.v6.*, D4.v6.*, D7.v6.slot-commands
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

- [ ] `desk.js` desired가 globalOn/slot enabled/visible/allVd/activeVd 공식을 정확히 사용하게 한다.
- [ ] unmount 전 live.delete, kind 교체, 결정적 순서, z-only setZ를 구현한다.
- [ ] 독립 reference canonical hash fixture와 A5 recorder event를 구현한다.
- [ ] T1~T11 semantic trace와 N=1000 locality/idempotence를 통과한다.
- [ ] green 후 해당 tranche만 커밋하고 push한다.

### Tranche 3 — ENGINE frame [D6.v6.frame-api, D7.v6.z-list]

- [ ] `frame.js` 공개 primitive, size observer, destroyed-handle 오류를 계약에 맞춘다.
- [ ] `snapRect`의 축별 후보·tie-break·할당 상한을 구현한다.
- [ ] pointer 이벤트 객체를 전달하고 Bridge가 trusted 입력만 raise하게 한다.
- [ ] z·위치 변경 시 contentSize callback 0, 크기 변경 시 batch당 callback 최대 1 테스트를 통과한다.
- [ ] green 후 해당 tranche만 커밋하고 push한다.

### Tranche 4 — ADDON chart 안정화 [D5.v6.chart-range, D5.v6.market-cache, D5.v6.candles-compare]

- [ ] trusted wheel/pointer 표식이 있는 range callback만 barSpacing을 저장하게 한다.
- [ ] 프로그램 setBarSpacing과 draw가 STATE write를 만들지 않는 테스트를 추가한다.
- [ ] refCount/useSeq 기반 market data cache와 32-entry eviction을 구현한다.
- [ ] 다종목 C1~C5와 다른 item operation 0을 재검증한다.
- [ ] green 후 해당 tranche만 커밋하고 push한다.

### Tranche 5 — UI 슬롯·링크 [D7.v6.slot-commands, D7.v6.symbol-link, D10.v6.*]

- [ ] 상단을 8개 고정 슬롯으로 렌더하고 disabled 슬롯을 `+N`으로 표시한다.
- [ ] add를 최저 disabled 슬롯 활성화로, delete를 확인형 reset으로 교체한다.
- [ ] rename modal이 비교키 중복에서 닫히지 않고 STATE write 0이 되게 한다.
- [ ] `vd|all`, `follow|pin`, `all|1..10` 종목연동을 단일 root patch로 구현한다.
- [ ] U1~U6와 마지막 슬롯 보호 acceptance를 통과한다.
- [ ] green 후 해당 tranche만 커밋하고 push한다.

### Tranche 6 — 탐색·생산성·복구 [D7.v6.navigator, D7.v6.snapshot-import, D4.v6.recovery-mode]

- [ ] 전체 화면 탐색기와 슬롯별 visible count/error dot을 구현한다.
- [ ] `Ctrl+1`~`Ctrl+8`, `Ctrl+K` 명령 팔레트를 구현한다.
- [ ] 빈 슬롯 VD 복제와 name snapshot CRUD를 구현한다.
- [ ] 1단계 undo와 workspace JSON import/export 검증·diff 확인 modal을 구현한다.
- [ ] 부팅 전 recovery status 확인과 FATAL 복구 화면을 recovery API에 연결한다.
- [ ] U7~U13과 취소 경로 STATE write 0을 통과한다.
- [ ] green 후 해당 tranche만 커밋하고 push한다.

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
