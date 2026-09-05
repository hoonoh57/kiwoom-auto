# design.md — Multi-VD Workspace Blueprint v6

```text
설계 상태 : APPROVED (개정 r6.2)
대상 버전 : schemaVersion 6
OPEN      : 0
승인 범위 : D1~D14 전체 — 2026-09-05 사용자 최종 승인
```

이 문서는 현재 코드를 정당화하는 기록이 아니다. 목표 동작을 먼저 고정하고 현재 구현과의 차이를 `todo.md`의 remediation으로 관리한다. 경쟁 제품에서 채택한 UX 원칙은 고정 화면 슬롯, 한 번의 화면 전환, 화면별 창 배치 보존, 화면 간 종목연동, 전체 화면 검색이다. 브라우저가 보장하지 못하는 운영체제 항상 위와 네이티브 다중 모니터 제어는 D1의 비범위로 고정한다.

문서 안의 모든 규칙은 그 규칙을 소비하는 계층 ID를 함께 가진다. 규칙과 계층이 어긋나면 D2.v6.no-cross-axis가 우선한다.

## D1 — 범위와 비범위

### D1.v6.gate

Gate 0이 끝나기 전에는 v6 스키마·v6 계약을 구현하는 제품 코드를 쓰지 않는다. Gate 0은 T12 독립 검토가 D6/D8/D11/D13의 공개 시그니처와 trace를 전부 일치 판정하고, 사용자가 `APPROVED`를 명시하는 두 단계다. APPROVED는 설계 범위 단위로 부여할 수 있으며, 부여된 범위의 tranche만 착수한다.

### D1.v6.historical-baseline

Gate 0 이전에 커밋된 v5 수정은 관측 baseline으로만 기록한다. 이 기록은 승인 전 제품 코드 변경 권한을 만들지 않는다. 새 버그 수정도 A2.5의 설계 완성·T12·사용자 APPROVED 순서를 통과해야 한다.

### D1.v6.absorbed-v5

Gate 0 이전에 이미 반영된 v5 hotfix를 baseline으로 흡수한다. 아래 세 건은 `D1.v6.observed-gaps`의 결함 목록에서 제외되며, v6 구현 시 재발 방지 대상이 아니라 승계 대상이다.

| 흡수 항목 | v5 변경 내용 | v6 승계 위치 |
|---|---|---|
| 네이티브 대화상자 제거 | `window.prompt`·`window.confirm`을 인앱 modal로 대체. 억제 환경에서 이름변경·삭제가 무음 실패하던 문제 해소 | D13.v6.public-signatures의 `askText`·`askOk` |
| VD 라벨 채번 | 라벨·order를 VD 개수에서 뽑던 규칙을 최대 번호+1과 사용 중 라벨 회피로 대체 | D7.v6.slot-commands의 고유 숫자 선택 규칙 |
| order 재번호 | 복원 경로에서 `order`를 표시 순서 보존한 채 0..N-1로 촘촘히 재부여 | v6는 `order`를 제거하고 `slot`으로 대체하므로 D4.v6.migration-v5 3항에 흡수 |

흡수된 hotfix는 실제 `workspace.json`의 `order` 값과 라벨을 이미 변경했다. 따라서 D4.v6.migration-v5는 order가 촘촘한 입력과 그렇지 않은 입력을 모두 받아야 한다.

### D1.v6.revision-baseline

이 설계는 기존 schemaVersion 5 설계의 개정판이다. 기존에 승인·구현된 다종목 캔들 `code/tf/overlay/pane/scaleId/compareMode` 계약은 D3.v6.candle-source, D5.v6.candles-compare, D11.v6.candle-traces로 승계한다. v5의 동적 VD ID·order·중복 가능한 표시 이름만 v6 고정 슬롯 계약으로 대체한다. v6가 APPROVED되기 전에 v5 제품 코드와 실제 workspace를 변경하지 않는다.

### D1.v6.scope

만들 것:

1. `vd1`~`vd8`의 고정 슬롯과 슬롯 활성화·초기화·고유 표시 이름.
2. 클릭과 `Ctrl+1`~`Ctrl+8` 전환, `Ctrl+K` 명령 팔레트.
3. VD별 자식폼 배치, 전체 VD 폼, z-order, 이동·크기·최소화·최대화와 최소화 폼 복원 표시줄.
4. 종목연동 범위 `vd|all`, 폼별 `follow|pin`, 공유그룹 `all|1..10`.
5. 전체 화면 탐색기, 폼 검색·VD 이동·포커스, 슬롯별 폼 수와 오류 표시.
6. 빈 슬롯으로 VD 복제, 이름이 있는 레이아웃 저장·복원·삭제, 1단계 되돌리기.
7. workspace 패키지 JSON 내보내기·가져오기와 v5→v6 마이그레이션.
8. 8px 프레임 스냅, 신뢰된 포인터 입력만 z-order 변경.
9. 차트 사용자 범위 변경만 `barSpacing`에 기록하여 자기발진 제거.
10. 차트 데이터 LRU warm cache 32개와 다종목 캔들 비교 기능 유지.
11. 스키마 손상 시 자동 수리와, 수리 불가일 때 내보내기·가져오기만 가능한 복구 모드.

### D1.v6.nonscope

만들지 않을 것:

1. 9번째 VD와 런타임 VD ID 생성.
2. 브라우저 창을 벗어난 네이티브 독립창, 운영체제 항상 위, 모니터별 좌표 복원.
3. 증권사 서버 저장화면 번호 0950~0999와 키움 서버 동기화.
4. 외부 클라우드 계정, 원격 백업, 계정 간 충돌 병합.
5. 여러 브라우저 탭의 동시 편집 잠금과 실시간 공동 편집.
6. 키움 HTS 외형의 픽셀 단위 복제.
7. 폼 닫기·이동·크기 변경의 되돌리기. undo는 D3.v6.snapshot-fields의 세 파괴 명령만 대상으로 한다.

### D1.v6.allvd-policy

allVd는 모든 enabled VD에 같은 form을 표시하는 visibility 속성이고 항상 위 속성이 아니다. 각 enabled VD의 `z`는 그 VD 일반 폼과 allVd form ID 참조를 같은 배열에 저장하며, raise는 현재 active VD 배열 안에서 대상 ID를 말단으로 이동한다. form 객체와 live handle은 하나만 존재한다. VD별 `z`의 ID 반복은 form 복제가 아니라 정렬 참조다.

### D1.v6.observed-gaps

관측된 v5 코드에서 D1.v6.absorbed-v5로 해소된 항목을 제외한 잔여 격차는 다음이다. `desk.js`의 desired 계산은 geometry와 z를 하나의 해시에 묶어 z 변경만으로 Add-on 전체 재계산을 유발한다. 종목연동은 `link`·`shareGroup` 축이 없어 VD 범위만으로 동작한다. recorder와 propsHash 정규화가 없다. `chart.js`에는 프로그램 적용이 다시 `barSpacing` 저장을 부르는 경로가 남아 있다. VD는 여전히 동적 ID·`order` 기반이다. 모두 목표 설계가 아닌 remediation 대상이다.

## D2 — 계층 매핑

### D2.v6.layers

```text
STATE   state/workspace.json, web/js/deskspec.js
  -> BRIDGE  web/js/desk.js
  -> ADDON   web/js/screens/<kind>.js, web/js/screens.js
  -> ENGINE  web/js/frame.js

chart screen 내부:
STATE form.body.items
  -> BRIDGE  web/js/runtime.js
  -> ADDON   web/js/addons.js
  -> ENGINE  web/js/core.js
```

`app/store.py`는 JSON 경로 CRUD와 직렬화 형식만 제공한다. `web/js/app.js`는 desired-state 입력과 관측 출력만 담당한다. VD 정책·링크 정책·snapshot 변환은 `deskspec.js`의 순수 함수가 계산하고 `desk.js`는 결과 item 집합을 generic diff로 반영한다. `frame.js`는 VD·화면번호·종목·screen kind를 해석하지 않는다. Screen Add-on은 자기 content host와 자기 feature 데이터만 소유한다.

### D2.v6.no-cross-axis

| 기능 의미 | 유일 소유축 | 금지 위치 |
|---|---|---|
| VD 슬롯·라벨·링크·snapshot 스키마 | STATE | ENGINE, ADDON, BRIDGE의 feature 분기 |
| 폼 desired/live 집합 차이 | BRIDGE | UI, STATE serializer, ENGINE |
| chart·quote·order·log 의미 | ADDON | ENGINE, BRIDGE |
| DOM frame·차트 primitive·스냅 수학 | ENGINE | ADDON 재구현, STATE |
| JSON 직렬화 형식과 키 정렬 | persistence(`store.py`) | STATE의 키 순서 규정, BRIDGE |
| max 상태의 화면 좌표 계산 | ENGINE | STATE, BRIDGE |
| max 복귀 좌표(`prevRect`) 보관 | STATE | ENGINE |

## D3 — item 모델

### D3.v6.root-fields

| 필드 | 타입 | 필수 | 기본값·범위 | 불변성 |
|---|---|---:|---|---|
| `schemaVersion` | integer | 예 | `6` | 파일 버전에서 불변 |
| `globalOn` | boolean | 예 | `true` | 변경 가능 |
| `activeVd` | string | 예 | 활성화된 `vd1..vd8` | 변경 가능 |
| `symLink` | enum | 예 | `vd`, `all` | 변경 가능 |
| `layout.sidebarW` | integer | 예 | `300`, 220..520 | 변경 가능 |
| `layout.snapPx` | integer | 예 | `8`, 0..24 | 변경 가능 |
| `seq.form` | integer | 예 | 다음 양의 폼 번호 | 단조 증가 |
| `seq.snapshot` | integer | 예 | 다음 양의 snapshot 번호 | 단조 증가 |
| `vds` | object | 예 | 정확히 8개 | 키 집합 불변 |
| `forms` | object | 예 | `fN` 키 | 변경 가능 |
| `snapshots` | object | 예 | `sN` 키 | 변경 가능 |
| `undo` | object/null | 예 | `null` | 파괴 명령 직전 상태 1개 |

### D3.v6.vd-fields

VD 키와 `slot`은 생성 후 바뀌지 않는다.

| 필드 | 타입 | 필수 | 기본값·범위 |
|---|---|---:|---|
| `slot` | integer | 예 | 키 `vdN`의 N, 1..8 |
| `label` | string | 예 | 기본 `String(slot)`, Unicode code point 1..8개 |
| `enabled` | boolean | 예 | `vd1=true`, 나머지 false |
| `z` | string[] | 예 | 이 VD 소유 non-allVd ID와 enabled VD의 allVd ID 참조, 바닥→위, 중복 없음 |

enabled VD의 `z`에는 그 VD가 소유한 non-allVd form과 모든 enabled VD가 소유한 allVd form이 각각 한 번 들어간다. 동일 allVd ID가 여러 VD의 `z`에 나타나도 `forms[id]` 객체와 live handle은 하나다. disabled VD의 `z`는 빈 배열이다.

라벨 비교키는 `trim()` 후 `normalize('NFKC')` 후 ASCII `A..Z`만 `a..z`로 바꾼 문자열이다. 8개 슬롯의 비교키는 활성 여부와 관계없이 모두 고유하다. 비활성 슬롯까지 고유성을 요구하는 이유는 활성화가 이름 충돌로 실패하지 않게 만드는 것이다. 그 대가로 보이지 않는 슬롯과 충돌할 수 있으므로 D10.v6.boundaries의 중복 메시지는 충돌 슬롯 번호를 반드시 포함한다. 빈 문자열은 오류다.

### D3.v6.form-fields

| 필드 | 타입 | 필수 | 기본값·범위 | 불변성 |
|---|---|---:|---|---|
| `id` | `fN` | 키 | 전역 유일, N>=1 | 생성 후 불변 |
| `screen` | string | 예 | 등록 kind | 생성 후 불변, D3.v6.screen-immutability 참조 |
| `vd` | `vd1..vd8` | 예 | 생성 시 activeVd | 이동 시 변경 |
| `allVd` | boolean | 예 | false | 변경 가능 |
| `visible` | boolean | 예 | true | `setFormVisible`로만 변경 |
| `title` | string/null | 예 | null | 변경 가능 |
| `code` | 6자리 ASCII 숫자/null | 예 | kind 기본값 | 변경 가능 |
| `tf` | string/null | 예 | kind 기본값 | 변경 가능 |
| `link` | enum | 예 | `follow`, `pin` | 변경 가능 |
| `shareGroup` | enum | 예 | `all`, 문자열 `1`..`10` | 변경 가능 |
| `rect` | integer rect | 예 | kind defRect | 변경 가능 |
| `winState` | enum | 예 | `normal|min|max` | 변경 가능 |
| `prevRect` | integer rect | 예 | 최초 rect | 변경 가능 |
| `body` | object | 예 | Add-on defaultBody | 변경 가능 |

### D3.v6.screen-immutability

UI가 제공하는 어떤 명령도 기존 폼의 `screen`을 바꾸지 않는다. 그러나 STATE는 수동 파일 편집과 `importWorkspace`로 들어온 입력을 신뢰하지 않는다. 따라서 D7.v6.desired-diff의 kind 변경 분기는 죽은 코드가 아니라 외부 입력 방어 경로이며, 발동 시 `[REPAIR] screen-changed id`를 남긴다.

### D3.v6.snapshot-fields

`snapshots.sN`은 `{name,activeVd,symLink,layout,vds,forms}`다. `name`은 라벨 비교키와 같은 규칙을 적용한 1..32 code point이며 snapshot 안의 `vds`와 `forms`는 D3의 스키마를 따른다. `seq`, `snapshots`, `undo`는 snapshot 내부에 들어가지 않는다. `undo`는 `{reason,snapshot}`이며 reason은 `resetVd|restoreSnapshot|importWorkspace`다. 이 세 명령만 되돌릴 수 있는 것은 D1.v6.nonscope 7항의 결정이다.

### D3.v6.candle-source

chart의 각 `candles` item은 `code`, `tf`, `placement=overlay|pane`, `paneId`, `scaleId=auto|right|left|compare`, `compareMode=price|percent|indexed100`, `baseTime`, `baseValue`를 소유한다. null code/tf는 form 값을 상속한다. 원가격 자동축은 첫 item right, 둘째 left, 셋째부터 compare다. percent와 indexed100은 compare 축을 공유한다. pane은 item 전용 pane의 right 축을 쓴다.

## D4 — STATE 스키마·fixture·마이그레이션

### D4.v6.canonical

정식 예시는 `state/workspace.v6.fixture.json`이다. 직렬화 형식은 persistence가 소유하며 STATE는 키 순서를 규정하지 않는다. 현재 형식은 UTF-8, LF, 키 이름 오름차순 정렬, 들여쓰기 1칸, 파일 끝 newline 1개이고 이는 `app/store.py`의 `json.dump(..., ensure_ascii=False, indent=1, sort_keys=True)`와 같다. fixture도 같은 형식으로 생성한다. 비교 테스트는 텍스트가 아니라 파싱된 객체 동등성으로 판정한다.

### D4.v6.repair-vs-fatal

부팅 입력의 결함은 REPAIR와 FATAL로만 분류한다. REPAIR는 결정적 규칙으로 유효 상태를 만들고 `[REPAIR] rule detail`을 남기며 결과를 PATCH 1회로 저장한다. FATAL은 상태를 쓰지 않고 D4.v6.recovery-mode로 진입한다.

| 조건 | 분류 | 처리 |
|---|---|---|
| JSON parse 실패 또는 root가 객체 아님 | FATAL | 원본 무변경, 복구 모드 |
| `schemaVersion` > 6 | FATAL | 원본 무변경, 복구 모드 |
| VD key/slot 불일치 | REPAIR | 키 `vdN`의 N을 정본으로 `slot` 재기록 |
| VD 키가 8개가 아니거나 `vd1..vd8` 밖 | REPAIR | D4.v6.migration-v5 3항 대응표로 재배치 |
| disabled VD가 form 소유 | REPAIR | 해당 슬롯 `enabled=true` |
| 모든 슬롯 disabled | REPAIR | `vd1`을 enabled |
| `activeVd` 없음·disabled | REPAIR | 가장 낮은 enabled slot |
| 라벨 빈 값·초과·중복 | REPAIR | D4.v6.migration-v5 4항 숫자 선택 규칙 |
| `z` 오염 | REPAIR | D4.v6.migration-v5 5항 |
| form의 `vd`가 `vd1..vd8` 밖 | REPAIR | `activeVd`로 이관 |
| 미등록 `screen` | 보존 | STATE 유지, error frame, 다른 폼 operation 0 |
| form 필드 누락·범위 밖 | REPAIR | D3 기본값·clamp |

FATAL을 두 경우로만 좁힌 이유는, 상태 파일 하나 때문에 사용자가 앱에 진입조차 못 해 내보내기로 자력 복구할 길이 없어지는 것을 막는 것이다.

### D4.v6.recovery-mode

앱은 `/api/node`보다 먼저 `GET /api/state/recovery`를 호출한다. 응답은 `{exists,parseOk,rootObject,schemaVersion,errorCode}`이며 errorCode는 `NONE|UTF8|JSON|ROOT_TYPE|IO`다. parseOk와 rootObject가 모두 true일 때만 정상 부팅으로 진행한다. 파일이 없으면 `{exists:false,parseOk:true,rootObject:true,schemaVersion:null,errorCode:'NONE'}`다.

FATAL에서는 desk를 만들지 않고 복구 화면만 렌더한다. 복구 화면은 오류 요약과 원본 경로를 표시하고 `내보내기`, `가져오기`, `기본 상태로 시작` 세 명령만 제공한다. `GET /api/state/recovery/raw`는 현재 파일의 정확한 bytes를 `application/octet-stream` attachment로 반환하고 파일이 없으면 404다. `PUT /api/state/recovery`는 JSON object body만 받으며, 기존 파일이 있으면 새 상태를 저장하기 전에 원본 bytes를 첫 미사용 `workspace.broken.json`, `workspace.broken.1.json`, `workspace.broken.2.json` 순 경로에 exclusive create로 복사한다. 백업 실패 또는 새 상태 원자 저장 실패는 기존 파일을 유지하고 500을 반환한다. 성공 응답은 `{ok:true,backup:string|null}`다.

`가져오기`는 선택한 package를 D7.v6.snapshot-import로 검증한 뒤 package.state를 PUT한다. `기본 상태로 시작`은 `defaultStateV6()`를 PUT한다. 세 명령 외의 STATE write는 0이다. 복구 여부와 오류는 STATE에 저장하지 않는 ephemeral boot 결과다. persistence 경계는 VD·form·screen 의미를 해석하지 않는다.

### D4.v6.migration-v5

1. `schemaVersion=5` 원본을 `state/workspace.v5.bak`에 복사한다. 파일이 있으면 덮어쓰지 않는다.
2. 기존 VD를 `(order 정수 오름차순, idNum(id) 오름차순, id UTF-16 오름차순)`으로 정렬한다. `order`가 촘촘한 입력과 중복·공백이 있는 입력을 모두 받는다.
3. 정렬된 VD를 차례로 `vd1..vdN`에 대응한다. 9개 이상이면 앞 7개를 `vd1..vd7`에 대응하고 나머지 전부를 `vd8`로 병합한다. 병합 시 `vd8`의 `z`는 병합 순서대로 이어 붙이고 `[REPAIR] vd-merge count`를 남긴다. 모든 form.vd를 같은 대응표로 바꾼다. 나머지 슬롯은 비활성으로 생성한다.
4. 기존 label은 trim한 값이 유효하고 비교키가 앞선 슬롯과 다를 때 보존한다. 빈 값·8 code point 초과·중복이면 대상 slot 숫자부터 증가시켜 처음 사용되지 않은 숫자 문자열을 쓴다. 빈 슬롯도 같은 숫자 선택 규칙을 쓴다.
5. allVd 전역 순서는 슬롯 1..8의 기존 `z`를 차례로 읽을 때의 첫 출현 순서이며, 한 번도 나오지 않은 allVd는 `(owner slot,idNum,ID)` 오름차순으로 붙인다. 각 enabled VD의 `z`는 기존 순서에서 그 VD 소유 non-allVd와 유효 allVd 첫 출현만 보존하고, 누락된 소유 non-allVd와 allVd를 각각 idNum·ID 및 전역 순서로 말단에 붙인다. disabled VD의 `z`는 비운다.
6. `enabled=true`는 마이그레이션된 기존 VD, false는 빈 슬롯이다. form이 없는 기존 VD도 true다.
7. activeVd는 대응된 기존 activeVd를 사용하고 없으면 가장 낮은 enabled 슬롯을 사용한다.
8. form 기본 누락값은 D3 값으로 채운다. `seq.form`은 기존 값과 `max form N + 1` 중 큰 값이다. `seq.snapshot=1`, `snapshots={}`, `undo=null`을 넣고 `order`를 제거한다.
9. 전체 검증이 통과한 메모리 객체에만 `schemaVersion=6`을 기록하고 단일 파일 교체로 저장한다. 검증 실패는 FATAL로 취급해 v5 원본을 유지하고 복구 모드로 진입한다.

### D4.v6.write-queue

UI write는 `patch(path,body)` 한 경로로만 간다. STATE의 `impactOfPatch(before,path,body)`가 D7 change-set을 먼저 만들고, 로컬 desired 반영과 change-set render 예약 뒤 직렬 queue가 서버 PATCH를 호출한다. 한 animation frame 안의 change-set은 ID 합집합, `scope > delta`, `rebuild > raise > keep` 우선순위로 합친다. 실패 시 `[PATCH-FAIL] path message`를 bus에 기록하고 다음 write를 계속한다. snapshot 복원·VD 초기화·import는 누락 키에 `ds.DEL`을 넣은 하나의 root patch로 제출한다.

### D4.v6.viewport-write

브라우저 창 크기 변경은 STATE를 직접 쓰지 않는다. bounds 변경은 BRIDGE가 관측해 max 폼의 화면 좌표만 다시 계산하고, `winState=normal` 폼의 `rect`는 그대로 둔다. D10의 rect clamp는 bounds 변경이 멈춘 뒤 250ms debounce로 한 번만 평가하고, 실제로 clamp가 필요한 폼만 하나의 root patch로 기록한다. clamp가 필요 없으면 write 0이다.

## D5 — kind 카탈로그와 feature 계약

### D5.v6.screen-contract

```js
register(kind, {
  normalize(raw),
  ensure(ctx, id, props),
  update(ctx, handle, prev, next),
  remove(ctx, handle)
})

screenMeta(kind) -> {
  no, label, keywords, single, needCode, needTf, defRect, minSize,
  defaultBody(ctx), reconcileBody(body, ctx)
}
```

Add-on registry는 A2의 네 함수만 받는다. UI/STATE용 screen metadata는 별도 read-only catalog record이며 lifecycle 함수가 아니다. 초기 kind는 `chart(0615)`, `quote(0101)`, `order(8949)`, `log(1001)`다. `chart|quote|order`는 `needCode=true`, chart만 `needTf=true`, 네 kind 모두 `single=false`다. 계약 필드 누락은 `ScreenContractError(kind,field)`이고 해당 폼만 error 상태가 된다.

`update`는 D8.v6.props-scope의 normalized props 변화만 통보받는다. 크기 통보는 lifecycle 훅이 아니다. 크기에 반응하는 Add-on은 ensure에서 D6.v6.frame-api의 `observeResize`를 한 번 구독하고 observer handle을 자기 liveHandle에 넣는다. callback은 자기 content host의 width·height만 받아 Core resize primitive를 호출하며 데이터 요청과 STATE write를 하지 않는다. remove는 `disconnectResize`를 한 번 호출한다. z 변경은 content 크기를 바꾸지 않으므로 callback을 만들지 않는다.

### D5.v6.chart-range

chart Add-on은 chart host의 trusted `wheel` 또는 trusted primary `pointerdown`에서 `rangeUserPending=true`로 두고 같은 시점에 만료 시각을 기록한다. range callback은 이 값이 false면 write 0이다. true이면 기존 800ms debounce를 재시작한다. 만료 시 engine barSpacing과 STATE 값 차이가 `0.01` 초과일 때 한 번 patch하고, 차이와 무관하게 false로 되돌린다.

사용자 입력 뒤 range callback이 오지 않는 경우를 대비해, `rangeUserPending`은 입력 시점부터 1500ms가 지나면 callback 없이도 false로 만료된다. 두 만료 경로 중 먼저 도달한 것이 적용되고, 만료된 플래그는 다음 trusted 입력에서만 다시 true가 된다. 이 규칙이 없으면 플래그가 영구히 true로 남아 이후의 프로그램 `setBarSpacing`이 사용자 입력으로 오인된다.

Add-on이 `setBarSpacing`으로 만든 callback은 trusted 입력 표식이 없으므로 STATE를 쓰지 않는다. `scrollToRealTime()`은 명시적 "실시간" 버튼 명령에서만 호출한다.

### D5.v6.market-cache

chart의 marketData capability는 key `code|tf`별 `{bars,refCount,useSeq,unsubscribe}`를 가진다. acquire는 useSeq를 단조 증가시키고 refCount를 올린다. release는 refCount를 내리고 0이면 unsubscribe를 한 번 실행하되 bars를 보존한다. refCount 0 entry가 32개를 넘으면 `(useSeq,key)` 오름차순 첫 entry를 제거한다. 각 bars는 최신 1200개를 보존한다. cache는 live handle과 desired 상태를 저장하지 않는다.

### D5.v6.candles-compare

`candles` Add-on은 item 한 개만 normalize한다. price는 OHLC를 보존한다. percent는 각 X에 `(X/baseValue-1)*100`, indexed100은 `(X/baseValue)*100`을 적용한다. bar 없음 또는 baseValue<=0은 `CandleDataError(itemId)`이며 다른 item operation은 0이다.

baseValue가 null이면 Add-on ensure/update가 baseTime 이상 최초 bar close를 liveHandle의 derived value로 계산한다. 이 값은 STATE, Bridge, 다른 item에 쓰지 않는다. 재시작은 같은 bars와 baseTime에서 같은 값을 다시 계산한다. 사용자가 baseValue를 직접 입력한 경우에만 그 양수를 STATE에 저장한다.

## D6 — Core primitive 목록

### D6.v6.frame-api

```text
createFrame(host,id,rect,on) -> FrameHandle
setFrameRect(handle,rect) -> void
setFrameZ(handle,zIndex) -> void
setFrameVisible(handle,boolean) -> void
setFrameTitle(handle,text,shareGroup) -> void
setFrameState(handle,normal|min|max,bounds) -> void
getContentHost(handle) -> HTMLElement
destroyFrame(handle) -> void
snapRect(candidate,bounds,peerRects,threshold) -> rect
observeResize(element,callback) -> ResizeObserverHandle
disconnectResize(handle) -> void
```

각 handle primitive는 O(1)이며 create는 frame DOM 1개와 content host 1개를 할당한다. destroy 후 호출은 `InvalidFrameHandle(id)`다.

`setFrameState`는 `max`에서 전달된 bounds로 화면 좌표만 계산하고 STATE를 읽거나 쓰지 않는다. 복귀 좌표 `prevRect`는 STATE가 소유하며, `max` 진입 직전 rect를 STATE에 기록하고 `normal` 복귀 시 STATE가 rect를 되돌린 결과가 `setFrameRect`로 내려온다. ENGINE은 복귀 좌표를 보관하지 않는다.

`snapRect`는 입력을 변경하지 않고 새 rect 1개만 할당한다. candidate의 left/right를 bounds와 peer의 left/right에, top/bottom을 bounds와 peer의 top/bottom에 비교한다. 축별 절대 이동량이 threshold 이하인 후보 중 `(절대 이동량, 목표 좌표, left 또는 top 우선)` 순 첫 값을 택한다. x와 y는 독립 계산하며 크기는 바꾸지 않는다. peerRects는 ID 오름차순으로 전달한다.

`observeResize`는 generic resize primitive다. 같은 width·height를 연속 관측하면 callback 0회, 값이 바뀌면 microtask batch 끝에 마지막 값으로 1회 호출한다. callback 인자는 `{width,height}` 정수이며 observer당 마지막 크기 record 1개만 보관한다. disconnect 뒤 callback은 0회다.

### D6.v6.chart-api

`web/js/core.js`는 chart, pane, series, priceScale, timeScale, marker, priceLine 생성·수정·삭제 primitive만 공개한다. 모든 단일-handle 호출은 O(1), setData는 bar 수 M에 O(M), update는 O(1)이다. Core는 code, VD, screen kind, 비교 모드를 받지 않는다. left와 right price scale 표시 여부는 전달된 generic option만 반영한다.

### D6.v6.time-random

제품 모듈은 현재 시간과 난수를 직접 호출하지 않는다. debounce scheduler는 `{set(fn,ms),clear(token)}` capability, 파일 교체 suffix는 persistence가 주입한 monotonic integer를 사용한다. ID는 STATE seq만 사용한다.

이 규칙은 desired 계산·diff·해시·직렬화에만 적용된다. 다음은 명시적 예외이며 결과를 desired 상태나 해시 입력으로 되돌리지 않는다. 첫째 서버의 데이터 신선도 판정과 주문 차단(`fetchedAt`, `STALE_BLOCK_SEC`), 둘째 시세·봉 데이터의 timestamp 자체, 셋째 로그 줄의 표시 시각, 넷째 D5.v6.chart-range의 만료 판정에 쓰이는 scheduler 내부 시간이다. 예외 경로는 순수 함수 밖에 두고 capability로 주입한다.

## D7 — Bridge diff·명령 알고리즘

### D7.v6.desired-diff

```text
changeSet = {
  mode: initial|delta|scope,
  items: 영향 ID 중 effective=true인 generic desired item 배열,
  absentIds: 영향 ID 중 effective=false 또는 삭제된 ID 배열,
  order: {mode:keep|raise|rebuild,id:null|formId}
}
item = {id,kind,enabled:true,visible:true,props:{addonRaw,frame},order}
frame = {rect,winState,title,shareGroup}
initial: STATE가 모든 form에 D9를 적용해 items와 order를 생성
delta: STATE가 영향 ID에만 D9를 적용해 items 또는 absentIds에 배치
scope: STATE가 전역·activeVd·slot 변화의 영향 ID만 같은 방식으로 생성
absent ID가 live에 있음: live.delete 후 remove
item ID가 live에 없음: registry.normalize(kind,addonRaw) 후 ensure
item ID가 live에 있고 kind 변경: live.delete 후 remove old, normalize 후 ensure new
item ID가 live에 있고 propsHash 변경: update
item ID가 live에 있고 frame title/shareGroup 변경: setFrameTitle
item ID가 live에 있고 geoHash 변경: setFrameRect, setFrameState
적용 순서 = ID별 remove/ensure/update/frame geometry -> order
```

STATE의 `projectDeskChange(before,after,impact)`가 VD·allVd·globalOn·visible 정책과 zList를 전부 소비한다. BRIDGE는 workspace, VD key, screen 이름의 의미를 읽지 않는다. live authority는 `Map<formId,{kind,propsHash,frameMeta,frame,addonHandle,geoHash,zIdx,error}>` 하나다. update 대상도 `(idNum,ID)` 오름차순이다. unmount와 destroy 전에 Map에서 delete한다. 예외는 해당 단계 `[DESK!]` 로그만 남기고 다음 ID로 진행한다.

해시는 두 개로 분리한다. `propsHash`는 D8.v6.props-scope의 screenProps만, `geoHash`는 `{rect,winState}`만 포함한다. 같은 값이 두 해시에 동시에 들어가지 않는다. z 변경은 어떤 해시에도 들어가지 않고 `setFrameZ`만 호출한다. 이 분리가 없으면 창을 드래그하는 동안 Add-on `update`가 호출되어 차트 전체가 다시 계산된다.

semantic recorder는 한 ID의 apply 결과에서 ensure 또는 remove가 없고 propsHash·geoHash·order 중 하나 이상이 바뀌면 update를 정확히 한 번 기록한다. 이 update event는 generic desired item 변경 기록이며 Add-on update 호출 횟수와 같지 않다. Add-on update는 propsHash 변경에만 실행한다.

ensure 직후에는 propsHash·geoHash·zIdx를 초기값으로 채우고 같은 apply에서 update 또는 frame geometry를 다시 적용하지 않는다. content 크기가 실제로 달라지면 D6 observer가 Add-on의 단일-item callback을 호출한다. 최소화 복원 목록은 UI가 STATE의 formEffective·winState와 zList를 읽어 렌더하며 BRIDGE live 상태를 소유하지 않는다.

`impactOfPatch` 규칙은 다음으로 고정한다. `forms/fN` 또는 root body의 forms.fN만 바뀌면 delta ids는 해당 ID다. activeVd 변경은 이전·다음 VD의 non-allVd ID이고 order=rebuild다. globalOn 변경은 모든 form ID다. `vds/vdN/enabled` 변경은 그 VD 소유 ID와 모든 allVd ID이고 order=rebuild다. rect·body·code·visible 같은 form 내부 변경은 해당 ID다. allVd 변경은 모든 enabled VD의 z 정규화와 order=rebuild를 포함한다. root replace·migration·snapshot restore·import는 scope ids=이전 forms와 다음 forms의 합집합, order=rebuild다. 현재 active VD z의 말단 raise는 delta ids=[], order=raise와 target ID다. 그 밖의 z 배열 교체는 order=rebuild다. `projectDeskChange`는 이 impact와 before/after를 받아 changeSet을 만들며 BRIDGE에 STATE 객체를 넘기지 않는다.

### D7.v6.z-list

zList는 active VD의 `z`에서 formEffective인 ID의 첫 출현을 그대로 보존한 배열이다. 일반 폼과 allVd 폼은 같은 순서 공간을 쓴다. raise는 현재 active VD의 `z`에서 대상 ID를 제거한 뒤 말단에 추가한다. allVd raise도 현재 VD의 순서만 바꾸며 다른 VD의 `z`는 유지한다. focus callback은 `e.isTrusted===true`인 pointerdown만 raise한다.

order=raise는 target frame에 현재 live 최대 zIdx+1만 setFrameZ하고 target.zIdx만 바꾼다. order=rebuild는 zList 전체를 순회해 index가 다른 handle만 setFrameZ한다. keep은 setFrameZ 0이다. 최대 zIdx가 1,000,000을 넘은 다음 raise는 rebuild로 승격해 0..N-1로 재번호한다.

불변식은 다음 하나다. live의 `zIdx`는 zList index와 같은 값이 아니라 **동일한 상대 순서만 보장하는 단조 값**이다. raise는 의도적으로 두 값을 어긋나게 만들고, 일치를 회복하는 유일한 연산은 rebuild다. 어떤 코드도 `zIdx`를 zList index로 역산하거나 배열 첨자로 쓰지 않는다. 순서를 알아야 하면 zList를 다시 계산한다.

### D7.v6.symbol-link

source code는 항상 source에 쓴다. source.link가 pin이면 종료한다. follow이면 target을 `(idNum,ID)` 순회한다. target 조건은 등록 kind의 needCode=true, target.link=follow, target.shareGroup=source.shareGroup이다. `symLink=all`이면 enabled VD 전체, `symLink=vd`이면 target.vd=source.vd인 폼만 쓴다. allVd도 소유 vd로 판정한다. 하나의 root patch로 source와 targets를 갱신한다.

### D7.v6.slot-commands

- `activateSlot(N)`: disabled면 enabled=true로 만들고 기존 enabled VD 중 slot이 가장 낮은 VD의 z에서 allVd ID 상대 순서를 복사해 새 z로 설정한 뒤 activeVd를 vdN으로 쓴다. `Ctrl+N`도 같은 경로다.
- `addVd()`: 가장 낮은 disabled slot을 activate한다. 없으면 `[VD+] 상한 도달`만 기록한다.
- `renameVd(id,label)`: D3 비교키가 다른 7개와 충돌하면 write 0, `[VD~] 중복 이름 label (slot N)`을 기록하고 modal을 유지한다.
- `resetVd(id)`: enabled 슬롯이 1개면 거부한다. 확인 뒤 undo를 현재 snapshot으로 설정한다. 소유 폼을 forms와 모든 VD z에서 삭제하고 enabled=false, label을 고유한 숫자로 정규화, z=[]로 만든다. active면 가장 낮은 enabled slot로 전환한다.
- `cloneVd(source,target)`: source enabled, target disabled일 때만 실행한다. source z에서 source 소유 non-allVd form만 새 fN으로 복제해 target vd, allVd=false로 바꾼다. source z의 allVd ID와 새 ID의 상대 순서를 보존한 배열을 target z로 설정하고 target을 enabled·active로 만든다.
- `setFormVisible(id,boolean)`: 해당 form의 `visible`만 쓴다. false는 D9 formEffective를 false로 만들어 handle을 remove하고, true는 fresh ensure 경로로 되돌린다. 탐색기 행 명령과 명령 팔레트가 이 명령의 유일한 진입점이며 `visible`을 바꾸는 다른 경로는 없다.

reset label 숫자는 target slot부터 증가시켜 7개 비교키와 처음 충돌하지 않는 문자열이다.

### D7.v6.navigator

`listForms(st,deskSnapshot,query,screenCatalog)`는 enabled slot 오름차순, owner z index, idNum, ID 순이다. 검색 문자열과 `screen no|screen label|title|code|form id|VD label`을 D3 비교키로 비교해 부분 포함인 행만 남긴다. 행 선택은 owner slot을 활성화하고 form을 raise한다. allVd 행은 현재 slot을 유지하고 form만 raise한다. 행 명령은 `포커스`, `VD 이동`, `표시 전환(setFormVisible)`, `닫기`다. status는 `error > hidden > minimized > mounted > inactive` 우선순위다. 슬롯 badge는 소유 form 중 visible 개수이며 error가 하나 이상이면 red dot 1개를 표시한다.

### D7.v6.snapshot-import

- save: 현재 active 영역을 깊은 JSON 복사해 새 sN에 저장한다. 이름 비교키 중복은 거부한다.
- restore: 현재 상태를 undo에 저장하고 snapshot의 active 영역으로 root patch를 만든다. seq.form은 현재 값과 복원 form 최대 N+1 중 큰 값, seq.snapshot과 snapshots는 보존한다.
- undo: undo.snapshot을 restore하되 새 undo를 만들지 않고 undo=null로 쓴다.
- export: `{format:'kiwoom-auto-workspace',version:1,state}`를 생성하며 state.undo=null이다.
- import: format/version과 D3/D4를 전부 검증한 후 diff 요약 modal을 표시한다. 확인하면 현재 상태를 undo에 저장하고 imported active 영역·snapshots를 적용한다. seq 두 값은 현재 값과 import의 값과 import 최대 ID+1 중 큰 값이다.

## D8 — propsHash 정규화

### D8.v6.canonical-hash

객체 키는 UTF-16 code unit 오름차순으로 재귀 정렬하고 배열 순서는 보존한다. null은 보존, -0은 0으로 바꾼다. undefined, function, symbol, bigint, NaN, Infinity는 `CanonicalValueError(path)`다. number는 ECMAScript JSON number 표현, string은 `JSON.stringify` escape를 사용한다. 공백 없는 UTF-8 bytes에 FNV-1a 32-bit를 적용하고 소문자 8자리 hex로 출력한다.

### D8.v6.props-scope

두 해시의 입력을 다음으로 고정한다. 어느 키도 두 해시에 동시에 들어가지 않는다.

```text
normalizedProps = registry.normalize(kind, addonRaw)
propsHash = canonicalHash(normalizedProps)
geoHash   = canonicalHash({rect:{h,w,x,y}, winState})
```

`rect`와 `winState`는 propsHash에 들어가지 않는다. `vd`, `allVd`, `visible`, `globalOn`은 STATE projection에서만 소비한다. `link`와 `shareGroup`은 종목 patch 계산에서만 소비한다. `title`과 frame 표시용 shareGroup은 frameMeta 직접 비교로 처리한다. 이 값들과 z는 두 해시에 들어가지 않는다.

### D8.v6.vectors

`H(X)`는 D8.v6.canonical-hash를 입력 X에 적용한 정확한 8자리 hex다. 설계 기대값은 수기 hex가 아니라 아래 `H(canonicalInput)` 표현이다. Tranche 2의 fixture 생성기는 제품 `canonicalHash`를 import하지 않고 D8 규칙에서 파생한 독립 reference 함수를 사용하며, 생성된 literal hex와 제품 결과가 다르면 test failure다.

```text
P1      {"body":{},"code":"005930","tf":"1m"}                              -> H(P1)
P1-code 위 입력에서 code만 "000660"                                             -> H(P1-code)
G1      {"rect":{"h":100,"w":100,"x":0,"y":0},"winState":"normal"}              -> H(G1)
G1-move 위 입력에서 x만 8                                                       -> H(G1-move)
```

검증 조건은 값 자체가 아니라 다음 세 성질이다. 같은 입력은 같은 hex를 낸다. 키 순서만 다른 입력은 같은 hex를 낸다. P1과 G1의 입력 집합은 서로소이므로 rect 변경이 propsHash를 바꾸지 않고 code 변경이 geoHash를 바꾸지 않는다.

## D9 — effective 계산식

### D9.v6.form-series

```text
formEffective   = st.globalOn && form.visible &&
                  (form.allVd || form.vd === st.activeVd)
seriesEffective = formEffective && item.enabled && item.visible
```

min 폼은 formEffective=true를 유지하고 content만 숨긴다. disabled slot이 form을 소유하면 effective 계산 전에 D4.v6.repair-vs-fatal이 슬롯을 활성화해 수리한다. 비활성 VD 일반 폼은 remove되고 재활성화는 fresh ensure와 같은 경로를 쓴다.

## D10 — 경계·오류 처리 표

### D10.v6.boundaries

| 입력 조건 | 결과 | write/log |
|---|---|---|
| label 빈 값 또는 8 code point 초과 | modal 유지 | write 0, `[VD~] 잘못된 이름` |
| label 비교키 중복 | modal 유지 | write 0, `[VD~] 중복 이름 label (slot N)` |
| 8 slot 모두 enabled에서 add | 상태 유지 | write 0, `[VD+] 상한 도달` |
| 마지막 enabled slot reset | 거부 | write 0, `[VD-] 마지막 가상화면` |
| reset 확인 취소 | 상태 유지 | write 0, `[VD-] 취소 id` |
| activeVd가 없거나 disabled | 가장 낮은 enabled slot | reconcile PATCH 1 |
| VD key/slot 불일치 | 키를 정본으로 slot 수리 | `[REPAIR] vd-slot`, PATCH 1 |
| VD 키 집합이 vd1..vd8 아님 | 대응표로 재배치, 초과분 vd8 병합 | `[REPAIR] vd-merge`, PATCH 1 |
| disabled VD가 form 소유 | 해당 슬롯 활성화 | `[REPAIR] vd-enable`, PATCH 1 |
| JSON parse 실패 또는 schemaVersion>6 | 복구 모드 | 서버 write 0, `[FATAL]` |
| z의 없는 ID·타 VD ID·중복 | 제거, 소유 누락 form 말단 추가 | `[REPAIR] z-fix`, PATCH 1 |
| 미등록 screen | STATE 보존, error frame | 다른 폼 operation 0 |
| form의 screen이 외부 입력으로 변경 | remove old, ensure new | `[REPAIR] screen-changed id` |
| rect 밖 | minSize 후 title 32px 노출 위치로 clamp | 250ms debounce 후 필요한 폼만 PATCH 1 |
| 창 크기 변경, clamp 불필요 | max 폼 화면 좌표만 재계산 | write 0 |
| unmount/destroy 예외 | live에서 이미 삭제, 다음 ID 진행 | `[DESK!] stage id error` |
| untrusted pointerdown | focus/raise 무시 | write 0 |
| 프로그램 range callback | 무시 | write 0 |
| trusted 입력 후 range callback 없음 | 1500ms에 pending 만료 | write 0 |
| baseValue null | Add-on liveHandle에 bars 기반 derived value 계산 | STATE write 0 |
| snapshot 이름 중복 | modal 유지 | write 0 |
| clone target enabled | 거부 `CloneTargetNotEmpty` | write 0 |
| import parse/schema 오류 | modal에 첫 error path 표시 | write 0 |
| import 확인 취소 | 상태 유지 | write 0, `[IMPORT] 취소` |
| server PATCH 실패 | 로컬 상태 유지, queue 계속 | `[PATCH-FAIL]` |
| 같은 STATE 두 번 apply | 두 번째 lifecycle 변화 없음 | operation 0 |

## D11 — 골든 trace

### D11.v6.event-shape

semantic recorder는 A5의 고정 형태만 쓴다.

```text
{seq,op:ensure|update|remove,id,kind,propsHash}
```

ensure는 생성 시 screen propsHash, remove는 제거 직전 screen propsHash를 기록한다. update는 propsHash·geoHash·order 중 하나 이상이 변한 live ID마다 한 번 기록하며 event의 propsHash는 변경 후 screen propsHash다. Add-on `update`는 propsHash가 바뀐 경우에만 호출한다.

ENGINE spy trace는 semantic recorder와 분리된 test double 출력 `{seq,call,id,argsHash}`다. call은 `setFrameRect|setFrameState|setFrameZ|resize`다. 제품 STATE와 persistent log에 spy trace를 저장하지 않는다. `seq`는 각 trace 안의 단조 정수이며 semantic 동일성 비교에는 사용하지 않는다.

### D11.v6.arch-traces

P1·G1은 D8.v6.vectors의 결정적 `H(X)` 기대값을 쓴다.

```text
T1  f1 ON              ensure f1 chart P1/G1
T2  f1..f1000 ON       ensure 1000개, idNum 오름차순, op 종류 ensure 하나
T3  f500 OFF           remove f500만
T4  f500 ON            ensure f500만
T5  global OFF/ON      remove 1000개 내림차순 / ensure 1000개 오름차순
T6  saved fresh apply  동일 입력 fresh trace와 동일
T7  같은 STATE 2회     두 번째 []
T8  f1 rect 변경       semantic update f1 H(P1) 1개; ENGINE setFrameRect 1; Add-on update 0
T9  N=1/10/1000        ensure 횟수만 1/10/1000
T10 신규 kind 등록     ENGINE/BRIDGE/STATE diff 0
T11 f1 body 변경       semantic update f1 H(P1-변형) 1개; Add-on update 1; 나머지 999개 op 0
T12 설계 모호성        코드 미열람 독립 결과의 공개 시그니처·trace가 D6/D11/D13과 일치
T13 추적성             설계 ID 없는 공개 코드 0, 설계 밖 공개 동작 0, 미구현 ID는 todo에 존재
```

### D11.v6.ux-traces

```text
U1 disabled vd5 클릭   PATCH vds/vd5 enabled=true + activeVd=vd5; desk diff는 vd5/allVd desired만
U2 VD 이름 중복        STATE write 0; desk op 0; 로그에 충돌 slot 포함
U3 vd2 reset           undo 1개 + vd2 owned remove만; 다른 VD owned op 0
U4 vd1->vd3 전환       vd1 일반 remove, vd3 일반 ensure, allVd ensure/remove와 Add-on update 0; VD별 순서가 다르면 setFrameZ
U5 follow group 3      같은 scope/group/follow/needCode target만 code update
U6 pin source 변경     source code update 1, target update 0
U7 clone vd1->vd6      source 폼 수 K개의 새 fN, source handle op 0
U8 navigator f20 선택  owner 활성화 후 f20 raise 1
U9 frame 포인터 focus  trusted=true일 때 z patch 1, false일 때 0
U10 program range      STATE write 0
U11 user wheel range   debounce 뒤 barSpacing write 최대 1
U12 snapshot restore   undo 생성과 root patch 1; desk는 실제 delta item만 op
U13 import 취소        STATE write 0; desk op 0
U14 창 크기 변경       clamp 불필요면 write 0, max 폼만 setFrameRect/setFrameState
U15 setFormVisible off remove 1, 재설정 시 ensure 1
U16 최소화 목록 복원   UI patch winState=normal 1; ENGINE setFrameRect/setFrameState 대상 1 + setFrameZ 1
U17 FATAL 상태 파일    복구 모드 진입, 서버 write 0, 내보내기 가능
U18 f1 raise           semantic update f1 H(P1) 1개; ENGINE setFrameZ 1; Add-on update 0
U19 f1 최소화          semantic update f1 H(P1) 1개; ENGINE setFrameState 1; UI 목록 행 1
```

### D11.v6.candle-traces

item propsHash도 D8.v6.canonical-hash를 쓰며 아래 canonical 입력 자체가 기대값의 정본이다.

```text
C1 c1 005930 overlay price right      ensure propsHash=H(C1-input)
   입력 {"code":"005930","compareMode":"price","paneId":"main","placement":"overlay","scaleId":"right","tf":"1m"}
C2 c2 000660 overlay indexed100       ensure propsHash=H(C2-input)
   입력 {"baseTime":0,"baseValue":100,"code":"000660","compareMode":"indexed100","paneId":"main","placement":"overlay","scaleId":"compare","tf":"1m"}
C3 c2 code=035720                     update c2 propsHash=H(C3-input); c1 op 0
   입력 C2-input에서 code만 "035720"
C4 c2 pane 이동                       remove c2 후 ensure c2; c1 op 0
C5 같은 STATE 재적용                  []
C6 baseValue null 파생                STATE write 0, liveHandle에 derived value 1개, 재적용 op []
```

## D12 — 성능 예산

### D12.v6.budgets

| N | 최초 ensure | 같은 STATE | item 1개 변경 | 임시 할당 상한 |
|---:|---:|---:|---:|---:|
| 1 | 1 | 0 | 1 | desired record 1 + op 1 |
| 10 | 10 | 0 | 1 | desired record 10 + op 10 |
| 1000 | 1000 | 0 | 1 | desired record 1000 + op 1000 |

initial과 root scope apply는 O(N), delta apply는 O(Δ)다. lifecycle op도 O(Δ)다. z raise는 setFrameZ 1회, Add-on update 0회, resize callback 0회, zList 재계산 0회다. 위치만 바뀐 drag는 setFrameRect 1회와 resize callback 0회다. width 또는 height가 바뀐 resize는 setFrameRect 1회와 observer batch당 resize callback 최대 1회이며 Add-on update는 0회다. VD 전환은 나가는 일반 폼 수+들어오는 일반 폼 수에 비례한다. allVd handle 생성·삭제·Add-on update는 0이고 VD별 상대 순서가 다를 때 setFrameZ만 실행한다. 최소화 목록은 min 폼 집합이 바뀔 때 UI DOM delta 1회다. navigator 검색은 form 수 N에 O(N), 결과 record N개 이하를 할당한다. market cache는 active key 수+inactive 32개이고 key당 bar 1200개 이하다. debounce timer는 chart form당 1개 이하, 창 크기 clamp timer는 전역 1개 이하다.

## D13 — 명명·배치·공개 API

### D13.v6.files

```text
web/js/deskspec.js       v6 schema, reconcile, repair, migration, slot/link/snapshot 순수 계산 (STATE)
web/js/desk.js           generic form desired/live diff와 recorder (BRIDGE)
web/js/frame.js          frame DOM, snapRect, resize observer primitive (ENGINE)
web/js/screens.js        screen 등록부
web/js/screens/chart.js  chart screen, range gate, market cache 사용 (ADDON)
web/js/screens/quote.js  quote screen (ADDON)
web/js/screens/order.js  order screen (ADDON)
web/js/screens/log.js    log screen (ADDON)
web/js/runtime.js        chart item generic diff (BRIDGE)
web/js/addons.js         chart item translator (ADDON)
web/js/core.js           chart primitive (ENGINE)
web/js/app.js            modal·최소화 목록·탐색기·명령 팔레트·복구 화면 desired input/UI
app/store.py             generic JSON persistence와 직렬화 형식
state/workspace.v6.fixture.json     D4 canonical fixture
tests/fixtures/desk-traces.v6.json  D11 recorder fixture와 D8 해시 벡터
tests/reference/canonical-hash.mjs  제품 모듈을 import하지 않는 D8 reference 계산기
```

### D13.v6.public-signatures

```js
// STATE
defaultStateV6()
reconcileV6(raw)                     // -> {st,patch,repairs,fatal}
migrateV5(raw)
labelKey(value)
validateVdLabel(st,id,value)         // -> {ok,reason,conflictSlot}
impactOfPatch(before,path,body)
projectDeskChange(before,after,impact)
effectiveForms(st)
zList(st)
symbolPatch(st,sourceId,code,screenCatalog)
activateSlotPatch(st,slot)
resetVdPatch(st,id)
cloneVdPatch(st,sourceId,targetId)
setFormVisiblePatch(st,id,visible)
saveSnapshotPatch(st,name)
restoreSnapshotPatch(st,snapshotId)
undoPatch(st)
exportWorkspace(st)
importWorkspacePatch(st,pkg)
listForms(st,deskSnapshot,query,screenCatalog)

// BRIDGE
canonicalHash(value)
createDesk({host,catalog,frame,patch,log,recorder,scheduler})
  -> {apply(changeSet),mounted,snapshot,destroy}
createRuntime({core,registry,recorder}) -> {apply,mounted,snapshot,destroy}

// ENGINE
createFrame(host,id,rect,on) -> FrameHandle
snapRect(candidate,bounds,peerRects,threshold) -> rect
observeResize(element,callback) -> ResizeObserverHandle
disconnectResize(handle) -> void

// PERSISTENCE RECOVERY
GET /api/state/recovery -> {exists,parseOk,rootObject,schemaVersion,errorCode}
GET /api/state/recovery/raw -> application/octet-stream
PUT /api/state/recovery (JSON object) -> {ok:true,backup:string|null}

// UI
openNavigator()
openCommandPalette()
openRecovery(report)
askText(title,value,maxLen,validate)
askOk(title,yesLabel)
```

`listForms`는 D7.v6.navigator와 이 절에서 모두 4인자다. 모든 공개 함수와 test는 `// Design: D...` 또는 test 이름의 `[D...]`로 설계 ID를 참조한다. Screen kind 추가는 `screens/<kind>.js`와 `screens.js` 등록 한 줄만 바꾼다. ENGINE·BRIDGE·STATE generic diff에는 kind 이름 분기를 추가하지 않는다.

### D13.v6.implementation-order

구현 순서는 고정한다.

```text
Gate 0     T12 독립 검토 -> REVIEWED -> 사용자 APPROVED
Tranche 1  STATE v6·마이그레이션·repair          D3, D4, D7.slot-commands
Tranche 2  BRIDGE desired/diff/hash/recorder      D7.desired-diff, D8, D9, D11.event-shape
Tranche 3  ENGINE frame·resize observer·trusted focus·snapRect  D6.frame-api, D7.z-list
Tranche 4  ADDON chart range gate·market cache·size observer D5.chart-range, D5.market-cache
Tranche 5  UI 고정 슬롯·고유 이름·종목연동       D7.slot-commands, D7.symbol-link
Tranche 6  UI 탐색기·복제·snapshot·undo·입출력·복구 D7.navigator, D7.snapshot-import, D4.recovery-mode
Tranche 7  전체 trace·브라우저 acceptance         D10, D11, D12
```

각 tranche는 표에 적힌 설계 ID만 수정하고 해당 테스트가 green인 상태에서 끝낸다. 다음 tranche는 직전 tranche 커밋·push 뒤 시작한다. 같은 tranche에서 두 축의 제품 코드를 동시에 수정하지 않는다. Tranche 1의 STATE 변환 결과를 고정한 뒤 Tranche 2가 소비하고, Tranche 2의 generic Bridge 계약과 독립 reference 해시 fixture를 고정한 뒤 Tranche 3과 4가 각 축에서 구현한다.

## D14 — OPEN QUESTIONS

없음.

사용자가 제공한 r6.1 독립 개정의 공개 시그니처·trace 검토 결과 R1~R20을 r6.2에 반영했고, rules.md 대조에서 발견된 R21~R31까지 해소해 불일치 0으로 T12를 통과했다. 사용자가 2026-09-05 v6 설계 전체를 최종 승인했다.

## R — 개정 이력 r6.0 -> r6.2

| ID | 변경 | 사유 |
|---|---|---|
| R1 | D0 신설, hotfix lane과 흡수 표 추가 | 이미 반영된 v5 수정 3건이 "APPROVED 전 변경 금지"와 충돌 |
| R2 | D1.v6.observed-gaps 갱신 | 라벨 중복·번호 건너뜀은 HEAD에서 해소되어 stale |
| R3 | D8.v6.props-scope 신설, propsHash에서 rect·winState 제거 | 드래그마다 Add-on update가 도는 구조. v5 geoHash에 z를 섞어 차트 전체 redraw를 유발한 결함과 동형 |
| R4 | D5 계약에 `geometry` 훅 추가 | rect를 propsHash에 넣은 근본 원인이 크기 통보 훅 부재 |
| R5 | D7.v6.desired-diff에 geometry 단계와 적용 순서 명시 | live에 geoHash가 있는데 소비 규칙이 없었음 |
| R6 | D7.v6.z-list에 zIdx 불변식 명시 | zList index와 raise의 max+1이 같은 이름으로 두 정의를 가짐 |
| R7 | D1.v6.allvd-policy 신설, O2 등록 | allVd가 앱 내부 항상 위가 되는데 명시가 없었음 |
| R8 | D3.v6.screen-immutability 신설 | 불변 필드에 대한 kind 변경 분기의 존재 이유 부재 |
| R9 | `listForms` 4인자로 통일 | D7과 D13의 시그니처 불일치 |
| R10 | D11.v6.event-shape 신설, `touch` 제거, op 어휘 확정 | 정의되지 않은 op와, order 계열 op의 기록 형태 부재 |
| R11 | D8.v6.vectors를 symbolic reference로 교체 | 입력 정의 변경으로 기존 hex 무효. 손으로 만든 값을 넣지 않음 |
| R12 | D11 캔들 해시에 canonical 입력 요구 | 입력이 없어 fixture로 재현 불가 |
| R13 | D4.v6.repair-vs-fatal, D4.v6.recovery-mode 신설 | 부팅 중단 조항이 사용자를 자력 복구 불가 상태로 만듦 |
| R14 | v5 VD 9개 이상을 vd8 병합으로 수리 | `VdLimitError` 부팅 중단은 v5 무제한 VD 사용자를 벽돌로 만듦 |
| R15 | 중복 라벨 메시지에 충돌 slot 포함 | 비활성 슬롯과 충돌하면 원인을 알 수 없음 |
| R16 | `setFormVisible` 명령 신설 | `visible`을 소유한 명령이 없었음 |
| R17 | taskbar primitive와 U16·T13 추가 | 최소화 폼의 복원 경로가 설계에서 누락 |
| R18 | `rangeUserPending` 1500ms 만료 추가 | callback 부재 시 플래그가 영구 true로 남아 자기발진 재발 |
| R19 | baseValue 확정을 deferred write로 이동 | apply 중 STATE 쓰기가 T7·C5의 재적용 0을 깨뜨림 |
| R20 | D4.v6.canonical을 store.py 형식에 정렬, D4.v6.viewport-write·D6.v6.time-random 예외·prevRect 소유축 명시 | 키 순서 규정이 실제 직렬화와 불일치, clamp write 정책·시간 예외·max 좌표 소유축 미정의 |
| R21 | rules.md B4·B18·B19를 v6 좌표로 변경 | 2026-09-05 사용자 A안 승인으로 schema 좌표 충돌 해소 |
| R22 | allVd를 VD별 공용 z 참조로 변경 | visibility와 항상 위 의미 분리 |
| R23 | O1을 `H(canonicalInput)`과 독립 reference fixture로 해소 | 수기 hex와 제품 구현 자기검증 방지 |
| R24 | 다섯 번째 geometry 훅을 generic size observer로 대체 | A2의 네 함수 Add-on 계약 유지 |
| R25 | semantic recorder와 ENGINE spy trace 분리 | A5 event 스키마와 primitive 성능 검증 동시 충족 |
| R26 | hotfix lane을 historical baseline으로 변경 | A2.5 승인 전 코드 예외 제거 |
| R27 | recovery status/raw/replace 계약 확정 | 2026-09-05 사용자 A-1 승인과 B13 frozen 경계 정합화 |
| R28 | taskbar ENGINE primitive를 UI 최소화 목록으로 대체 | B5 primitive 어휘 유지와 UI desired-input 책임 정합화 |
| R29 | baseValue deferred write를 Add-on live 파생값으로 대체 | Add-on의 STATE write 요청과 BRIDGE workflow 제거 |
| R30 | D11 T12/T13을 모호성·추적성 테스트로 복원 | A5 예약 테스트 번호와 일치 |
| R31 | D0 항목을 D1에 흡수 | B15의 D1~D14 설계 ID 범위 준수 |


## D1.rest-api — 실제 키움 데이터 전환 (APPROVED, 2026-09-06 사용자 모두 진행)

2026-09-06 사용자 요청: `hoonoh57/kiwoom-desk`를 참조하여 자체 생성 mock 데이터를 키움 REST 응답으로 교체한 후 v6 작업을 계속한다.
참조: 해당 저장소 `server/index.ts`, `src/api/KiwoomClient.ts`, `src/api/trSchema.ts`.
기존 D1~D14 v6 APPROVED는 유지한다. 이 추가 범위는 설계 검토·승인 전 제품 코드에 반영하지 않는다.

### D2.rest-api.boundary

`app/kiwoom.py`는 외부 키움 Request/Response adapter, `app/data.py`는 파생 시장 데이터 캐시, `app/config.py`는 접속 설정이다. ENGINE/BRIDGE에는 인증·TR·재시도 정책을 넣지 않는다. 기존 `/api/node`와 workspace schemaVersion 6은 변경하지 않는다. `/api/health`와 데이터 API의 오류 표시는 UI가 소비한다.

### D3.rest-api.source

자체 MockAdapter와 가상 봉·현재가·잔고·주문번호 생성 경로를 제거한다. 데이터 소스는 키움 REST만 사용한다. 모의/실투자는 별도 접속 설정이며 현재 `KIWOOM_USE_PAPER=1`을 유지한다. 실투자 전환은 별도 사용자 지시 대상이다.
기존 `KIWOOM_APPKEY`/`KIWOOM_SECRETKEY` 쌍을 우선 사용하고, 둘 다 비었을 때만 참조 저장소의 모드별 `KIWOOM_MOCK_APP_KEY`/`KIWOOM_MOCK_SECRET_KEY` 또는 `KIWOOM_REAL_APP_KEY`/`KIWOOM_REAL_SECRET_KEY` 쌍을 사용한다. 불완전한 쌍은 설정 오류이며 서로 다른 쌍을 혼합하지 않는다.

### D4.rest-api.cache

기존 출처 없는 `data/*.json`은 읽거나 병합하지 않고 그대로 보존한다. 새 시장 캐시 schemaVersion은 2이고 source는 `kiwoom-paper` 또는 `kiwoom-real`이다. 경로는 `data/<source>/<code>_<tf>.json`이다. 기존 필드에 source를 추가하며 source/code/tf/schemaVersion 불일치는 빈 캐시로 취급한다. 가격 0으로 오류를 대신하거나 생성 데이터로 복귀하지 않는다. 계좌 응답·토큰·키를 시장 캐시나 workspace에 저장하지 않는다.

### D5.rest-api.contract

기존 adapter 공개 메서드 candles(code,tf,count=None,since=0), quote(code), balance(), order(code,side,qty,price), get()의 역할을 유지한다.
인증은 `/oauth2/token`; expires_dt는 KST로 해석하며 동시 발급은 lock으로 합친다. 토큰은 서버 메모리에만 보관한다. 조회 요청의 401/8005는 토큰 재발급 후 1회 재시도한다. 주문은 자동 재시도하지 않는다. 조회/주문의 HTTP 오류·키움 오류·비JSON 응답을 성공으로 취급하지 않는다.
차트 TR: tick=ka10079, 1m/5m/30m=ka10080, 1d=ka10081, 1w=ka10082, 1M=ka10083. 배열 키는 각각 stk_tic_chart_qry, stk_min_pole_chart_qry, stk_dt_pole_chart_qry, stk_stk_pole_chart_qry, stk_mth_pole_chart_qry로 고정한다. 첫 배열을 임의 선택하지 않는다. 시간은 KST 명시 변환, OHLC/거래량은 부호 제거, 변화액·등락률은 부호 유지한다. 필수 값 누락·비수치 값은 오류다.
연속 조회는 cont-yn/next-key를 소비하며 count(기본 600, 최대 1200) 충족, since 경계 도달, 연속키 종료 중 최초 조건에서 멈춘다. 최대 20페이지, 반복 키는 오류다. 일부 페이지 실패 시 부분 결과를 정상 최신 데이터로 저장하지 않는다. 중복 시각은 먼저 받은 최신 페이지의 행을 유지하고 시간 오름차순으로 반환한다.
현재가 ka10001, 예수금 kt00001(qry_tp=3), 평가잔고 kt00018(qry_tp=1,dmst_stex_tp=KRX)를 사용한다. 잔고는 acnt_evlt_remn_indv_tot 배열을 명시적으로 읽는다. cash는 예수금 조회 결과에서 가져온다. 주문 TR kt10000/kt10001은 기존 사용자 주문 경로에서만 실행한다.

### D10.rest-api.errors

키 미설정: health는 서버 상태와 설정 미완료를 반환하고 화면은 안내를 표시한다. 조회는 명시적 오류이며 허위 데이터는 0건이다. 통신 실패: 같은 source의 기존 캐시만 제공하고 error와 이전 fetchedAt을 유지한다. 1700 유량 초과: 오류를 전달하고 자동 폭주 재시도를 하지 않는다. 요청은 adapter에서 직렬화하고 최소 600ms 간격을 둔다. 주문 테스트는 외부 주문 요청 0건이다.

### D11.rest-api.acceptance

독립 응답 fixture로 인증 동시성, KST 토큰 만료, 401/8005 조회 1회 재시도, 주문 재시도 0회, TR별 배열 추출, 부호 처리, 연속키·중복·정렬·count, 기존 mock 캐시 배제, source 간 격리, 예수금/잔고 분리, 오류 시 fetchedAt 불변을 검증한다.
실제 연결 acceptance는 키움 인증·현재가·각 지원 주기의 차트·잔고 조회만 수행한다. 주문을 전송하지 않는다. API 키가 없으면 자동 검증과 실제 연결 검증을 구분해 기록한다.

### D13.rest-api.sequence

이 범위를 기존 Tranche 4보다 먼저 수행한다: 설계 검토 및 승인 → adapter/config → 시장 캐시 격리 → health/UI 오류 표시 → 자동 검증 → 실제 읽기 전용 연결 검증 → v6 잔여 작업 재개.

### D14.rest-api.open

실제 연결 인증 설정을 확인했다. 현재 프로젝트 인증 설정 구성과 실제 조회 성공을 확인했다. 키 값 자체를 대화나 로그에 기록하지 않는다. 2026-09-06 사용자 `모두 진행`으로 추가 설계 승인 완료.


## D3.v6.legend-selection — 종목 레전드 선택

승인 범위: 사용자가 4축 유지·캔들 item ID 선택 방안을 제시받고 `진행`으로 승인했다.
STATE의 chart body.ui.selectedItemId는 string|null이며 기본값 null이다. form 내부 item ID이고 종목코드가 아니다. 등록 meta.selectable=true인 item만 대상이다. 기존 필드 누락은 null로 정규화한다. 없는 ID·선택 불가능한 kind·비활성·숨김 item은 null로 정규화한다. 삭제/비활성/숨김 명령은 대상 선택을 같은 patch에서 null로 만든다. 다른 item으로 자동 대체하지 않는다. 전역 OFF는 선택 ID를 보존한다.

## D5.v6.legend-selection — 등록 메타데이터와 표시

캔들 Add-on은 meta.selectable=true와 기존 source 계약으로 선택 가능한 종목임을 선언한다. chart screen UI는 이 등록 메타데이터만 읽으며 kind 이름 분기를 추가하지 않는다. body.order 순서로 레전드 버튼을 만든다. 각 버튼은 effective code, tf, item ID를 표시하고 disabled/hidden item은 선택 불가로 표시한다. 같은 종목·주기라도 item ID로 구별한다. 선택 버튼에 aria-pressed=true를 쓰고 테두리와 배경으로 강조한다. 레전드는 패널을 닫아도 표시한다.

## D7.v6.legend-selection — 선택 명령과 4축 경계

UI 클릭은 ctx.patchBody({ui:{selectedItemId:id}}) 하나만 요청한다. 같은 ID 재선택과 유효하지 않은 대상 선택은 write 0이다. UI는 chart/series handle을 조작하지 않는다. STATE가 선택 ID를 영속하며 ADDON이 메타데이터·source·표시 의미를 소유한다. BRIDGE와 ENGINE의 선택 전용 API·kind 분기·live selection 저장소는 추가하지 않는다. 선택만 변경하면 series ensure/update/remove, geometry primitive, data subscription 변경 모두 0이다.
향후 전략 대상은 {formId,itemId}로 식별한다. 레전드 선택 변경으로 이미 연결된 전략의 대상을 이동시키지 않는다. 이번 범위는 선택 기능만이며 전략 실행·자동 주문은 추가하지 않는다.

## D11.v6.legend-selection — acceptance

L1 레전드 B 클릭: STATE patch 1, selectedItemId=B, series operation 0, data subscription 변경 0.
L2 같은 B 재클릭: STATE patch 0.
L3 동일 code/tf의 A/B: item ID로 각각 선택 가능.
L4 선택 대상 삭제/비활성: 동일 patch로 selectedItemId=null; 다른 item 선택 0.
L5 저장 후 재적용: 선택 표시 복원, selection 전용 ensure 0.
L6 선택만 변경: engine geometry/series primitive 호출 0.
L7 stale ID 및 legacy 필드 누락: null로 정규화. 명시적으로 등록된 신규 selectable kind는 ENGINE/BRIDGE/STATE diff 수정 0.
