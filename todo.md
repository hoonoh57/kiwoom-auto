# todo.md

## 한 일

- [x] 키움 HTS형 가상화면과 경쟁 UX 비교 결과를 v6 목표 범위로 변환했다.
- [x] 기존 동적 VD ID·order 설계와 실제 고유 이름 결함을 architecture remediation으로 분류했다.
- [x] `design.md`를 schemaVersion 6 기준 D1~D14 설계도로 교체하고 OPEN 0으로 결정했다.
- [x] `vd1`~`vd8` 고정 슬롯, enabled 상태, NFKC 기반 고유 라벨, v5→v6 무손실 마이그레이션 순서를 확정했다.
- [x] VD 종목연동·공유그룹·전체 탐색기·상태 badge·복제·snapshot·undo·import/export·스냅·명령 팔레트를 축별로 배치했다.
- [x] z-order와 geometry 비용을 분리하고 trusted pointer만 raise하도록 설계했다.
- [x] chart `barSpacing` 사용자 입력 gate와 32-entry/1200-bar LRU cache 계약을 확정했다.
- [x] 다종목 캔들 overlay/pane/독립축/비교모드 설계를 v6에 통합했다.
- [x] canonical 설계 fixture `state/workspace.v6.fixture.json`을 작성했다.
- [x] 기존 v5 다종목 설계를 v6 개정 기준선으로 승계하고 D13 구현 순서를 Gate 0~Tranche 7로 고정했다.
- [x] `design.md`와 `todo.md`의 기준 commit·schemaVersion·설계 상태·OPEN·Gate·Tranche 순서를 동기화 검증했다.

## 할 일

REMEDIATION_REQUIRED

현재 좌표

```text
branch       : main
제품 기준선  : 078cd98 enforce-unique-vd-labels
문서 tranche : 이 todo.md를 포함한 v6 blueprint 커밋
worktree     : 문서 tranche 커밋 후 clean
현재 STATE   : state/workspace.json schemaVersion 5
목표 STATE   : schemaVersion 6
설계 상태    : DRAFT
OPEN         : 0
게이트       : C1 완료, C2 완료, C3(T12) 대기, C4(APPROVED) 대기
다음 설계 ID : D6.v6.*, D11.v6.*, D13.v6.public-signatures
```

### Gate 0 — 코드 착수 전

- [ ] 코드를 보지 않은 독립 검토자가 `design.md`만 읽고 공개 시그니처와 T1~T11/U1~U13/C1~C5 trace를 작성한다.
- [ ] 독립 결과를 D6/D11/D13과 비교하고 불일치 0을 확인한다.
- [ ] T12 PASS 후 `design.md`와 이 파일의 상태를 REVIEWED로 바꾼다.
- [ ] 사용자에게 설계 범위의 명시적 `APPROVED`를 받는다.
- [ ] 승인 전 제품 JS·Python·CSS·STATE 실파일·테스트 실행코드를 수정하지 않는다.

### Tranche 1 — STATE v6 [D3.v6.*, D4.v6.*, D7.v6.slot-commands]

- [ ] `deskspec.js`에 v6 default/validate/reconcile과 labelKey를 구현한다.
- [ ] v5→v6 migration과 백업·원자 저장 실패 계약을 구현한다.
- [ ] 슬롯 활성화·이름검증·초기화·복제 patch 순수 함수를 구현한다.
- [ ] fixture round-trip, 중복 라벨, 8개 초과, ID 재매핑, z 정규화 테스트를 통과한다.
- [ ] green 후 해당 tranche만 커밋하고 push한다.

### Tranche 2 — BRIDGE 정합성 [D7.v6.desired-diff, D7.v6.z-list, D8.v6.*, D9.v6.*]

- [ ] `desk.js` desired가 globalOn/slot enabled/visible/allVd/activeVd 공식을 정확히 사용하게 한다.
- [ ] unmount 전 live.delete, kind 교체, 결정적 순서, z-only setZ를 구현한다.
- [ ] canonical propsHash와 A5 recorder event를 구현한다.
- [ ] T1~T11 semantic trace와 N=1000 locality/idempotence를 통과한다.
- [ ] green 후 해당 tranche만 커밋하고 push한다.

### Tranche 3 — ENGINE frame [D6.v6.frame-api, D7.v6.z-list]

- [ ] `frame.js` 공개 primitive와 destroyed-handle 오류를 계약에 맞춘다.
- [ ] `snapRect`의 축별 후보·tie-break·할당 상한을 구현한다.
- [ ] pointer 이벤트 객체를 전달하고 Bridge가 trusted 입력만 raise하게 한다.
- [ ] z 변경 시 resize 0, geometry 변경 시 resize 1 테스트를 통과한다.
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

### Tranche 6 — 탐색·생산성 [D7.v6.navigator, D7.v6.snapshot-import]

- [ ] 전체 화면 탐색기와 슬롯별 visible count/error dot을 구현한다.
- [ ] `Ctrl+1`~`Ctrl+8`, `Ctrl+K` 명령 팔레트를 구현한다.
- [ ] 빈 슬롯 VD 복제와 name snapshot CRUD를 구현한다.
- [ ] 1단계 undo와 workspace JSON import/export 검증·diff 확인 modal을 구현한다.
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
