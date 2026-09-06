# kiwoom-auto

키움 TR/WSS를 통해 다종목 시세·계좌·주문을 연계하고, 전략·조건식 등 기능을 ADDON으로 확장하는 작업공간이다. 범용 핵심 불변, 4축 경계, 변경분에 비례하는 처리, 전 단위 JSON 영속·복원을 목표로 한다. 실시간 기반의 구현 완료를 의미하지 않는다.

## 문서와 세션 복구

- [rules.md](rules.md): 핵심 헌법, 작업 방식, 설계·검증 절차의 유일한 규칙 원본.
- [todo.md](todo.md): 한 일·할 일·현재 좌표·승인 범위·검증 증거와 다음 작업.
- README.md: 프로젝트 설명과 아래 상세 설계. 기존 design.md의 설계 ID와 내용을 이 문서로 이전했다.

새 세션에서 `세션복구!`를 입력하면 rules.md → todo.md → 실제 Git 상태 확인 → todo.md가 지정한 이 문서의 설계 절 확인 순서로 작업을 재개한다. 해당 세션이 이 저장소 파일에 접근할 수 있어야 한다.

## 실행

Windows에서 기존 환경 설정 후 `start.bat`로 실행한다. 기본 접속 주소는 http://127.0.0.1:8077 이다. 인증 정보는 저장소 문서에 기록하지 않는다. 구현·검증의 최신 상태는 todo.md를 따른다.

## 상세 설계 — Multi-VD Workspace Blueprint v6

아래 승인은 기존 v6 범위에 한정된다. realtime-foundation 추가 범위는 DRAFT이며 해당 D14의 OPEN 항목이 남아 있다.

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


## D5.v6.market-time-display

사용자 요청: NXT 08:00/KRX 09:00 봉이 UTC 자정으로 보이는 표시 오류 수정. 원본 UTC epoch와 저장 캐시는 유지한다. chart Add-on에서 Asia/Seoul, hourCycle=h23 포맷터를 만들어 기존 generic chart.applyOptions로 전달한다. ENGINE/BRIDGE는 거래소·한국시간 의미를 소유하지 않는다. intraday 시간축은 HH:mm(틱은 HH:mm:ss), 일/주/월은 한국 날짜를 표시하며 crosshair는 한국 날짜·시간을 표시한다. timeframe 변경 때 포맷터를 갱신한다. 세션 필터·거래소 데이터 소스는 바꾸지 않는다.
D11 검증: 2026-09-03T23:00:00Z → 09-04 08:00, 2026-09-04T00:00:00Z → 09-04 09:00; 한국 자정은 00:00이며 24:00이 아님. epoch 불변, 브라우저 timezone과 무관한 결과.


## D3.v6.indicator-sync — 종목별 지표와 동기화

사용자 승인: 선택 종목의 지표 설정을 다른 종목에도 적용하고 각 종목 데이터로 각각 계산하는 방식을 `예`로 확정했다. 4축 경계는 유지한다.
chart body.indicatorSync={enabled:boolean,sourceId:string|null}, 기본 OFF/null. ON 시 현재 selectedItemId를 기준으로 고정한다. 선택 변경만으로 기준을 바꾸지 않는다. OFF는 현재 복사된 설정을 유지하며 이후 독립 편집한다. 새 지표는 선택 종목에 targetItemId로 귀속한다. 기존 targetItemId 없는 지표는 첫 ON 때 선택 종목에 귀속한다.
지표 props.targetItemId는 같은 form의 selectable item ID, props.syncOriginId는 동기화 기준 지표 ID이다. body.itemSeq는 지표 복사 시 증가하는 양의 정수이며 기존 ID 숫자 최댓값+1 이상이다. id는 삭제 후 재사용하지 않는다.

## D7.v6.indicator-sync — 순수 STATE 명령

ON 명령은 기준 종목의 지표 집합을 다른 selectable 종목에 복사하는 단일 body patch다. 대상 종목의 기존 지표 설정은 기준 집합으로 맞춘다. 같은 origin/target의 기존 ID는 유지한다. 기준 지표 추가/수정/삭제/ON-OFF는 동기화 ON 동안 같은 명령에서 전파한다. 기준 종목 삭제는 동기화를 OFF하고 그 종목의 지표도 제거한다. 숨김/비활성 캔들은 지표도 렌더하지 않지만 설정은 보존한다. 기준을 선택하지 않으면 ON은 거부한다.
render projection은 저장된 지표 targetItemId를 effective code/tf/pane/scale로 해석한 generic raw item을 생성한다. 저장 값과 handle을 섞지 않는다. ADDON은 단일 지표의 전달받은 code/tf 데이터만 계산한다. BRIDGE의 kind 분기·전체 복원·ENGINE의 종목 지식은 추가하지 않는다.

## D5.v6.indicator-sync — ADDON 등록 계약

MA/거래량/MACD/RSI/누적거래대금은 meta.indicator=true로 등록한다. 지표별 데이터 키는 code|tf이고 version은 그 키의 barsHash다. MA는 대상 캔들과 같은 pane/가격축, 별도 지표는 targetItemId:기본pane의 독립 pane에 놓는다. 비교 표시 캔들의 MA는 같은 percent/indexed100 기준으로 변환한다. 각 지표 handle은 자기 series만 소유한다. 다른 종목 데이터 변화는 해당 종목 지표만 update한다.

## D11.v6.indicator-sync — 검증

S1 ON: 기준 지표 설정은 동일, 대상별 dataKey는 서로 다름. S2 길이 변경: 기준/복사 지표만 변경, 캔들 lifecycle 0. S3 OFF 후 기준 편집: 다른 종목 지표 변화 0. S4 동일 ON 재적용: ID·seq·patch 변화 0. S5 캔들 삭제/숨김: 그 대상 지표만 제거/숨김, 다른 대상 handle 보존. S6 저장 재적용은 같은 정상 diff 경로, 동기화 전용 BRIDGE/ENGINE 변경 0. S7 종목별 다른 봉에서 계산한 MA 값이 서로 다름.

## D1.realtime-foundation.requirements — 실시간 연계 기반 (DRAFT, 2026-09-06)

사용자 확정 목표: 전략개발 연계, 조건식 연계, 키움계좌 실시간 연계가 같은 데이터 기반을 사용하며, 복잡한 ADDON 추가 전에도 단순 TR 조회부터 매매에 필요한 WSS 업데이트와 서버 상태 동기화를 갖춘다. 이 절은 요구사항이며 기존 v6 승인과 구분한다. 현재 polling을 실시간 기반 완성으로 간주하지 않는다.

필수 완료 조건:
- TR: 인증, 연속 조회, 요청 제한, 오류 전달, 동일 요청 공유와 최신성 표시. 주문 요청은 조회 재시도 정책과 분리한다.
- WSS: 인증 확인, heartbeat, 구독/해지 응답 확인, 연결 세대 구분, 재접속/재인증/재구독 및 상태 표시. 같은 소스를 여러 화면이 사용해도 구독은 공유한다.
- 시세: 초기 TR 데이터와 WSS 증분을 결합하고 종목/시장/주기별로 격리한다. 이전 연결·종목의 늦은 결과가 새 데이터에 혼입되지 않아야 한다.
- 계좌/주문: 주문 접수와 체결을 구분하고 부분체결·정정·취소·거부를 반영한다. 주문 응답 유실은 결과 불명으로 보존하며 무조건 재전송하지 않는다. 재연결 후 미체결·체결·잔고를 서버 조회와 대조한다.
- 조건식/전략 연계: 향후 ADDON에 제공할 이벤트와 데이터 최신성 계약을 정의한다. 조건검색 목록/초기 결과/실시간 편입·이탈 및 재구독 시 결과 대조를 범위에 포함한다. 복잡한 전략 자체는 별도 범위다.
- 성능: 전체 화면 재조회 대신 변경 대상에 전달하고 버퍼/큐 상한과 과부하 대응을 정의한다. 주문·체결 이벤트를 화면 갱신 병합 정책으로 버리지 않는다. 수신→계산→화면 반영 지연과 backlog를 측정한다.
- 정합성: 연결됨과 동기화 완료를 구분한다. 단절/지연/복구 중에는 정상으로 표시하지 않는다. 누락 구간의 완전 재생을 전제하지 않고 조회로 확인 가능한 상태를 대조한다. 정합성 미확인 상태에서 신규 자동 주문을 실행하지 않는다.
- 경계: ENGINE generic primitive, ADDON 단일 item 의미, BRIDGE feature-blind diff, STATE desired-only를 유지한다. 토큰·WSS handle·재시도·서버 실측 상태는 workspace JSON에 저장하지 않는다. 상세 계층 매핑은 구현 전 확정한다.

공식 확인 근거: https://openapi.kiwoom.com/guide/apiguide?jobTpCode=15 및 https://github.com/Kiwoom-Securities/Kiwoom-REST-API . 공식 실시간 문서의 주문체결(00)/잔고(04), WSS 및 모의 환경 KRX 지원 안내를 기준으로 상세 계약을 검증한다. 시간 표시 KST 수정과 NXT 데이터 지원 검증은 별개다.

## D1.realtime-foundation.purpose — 범용 핵심과 ADDON 확장 최상위 목표

2026-09-06 사용자 명시: 핵심은 성능을 보장하는 범용 로직으로 유지하고 기능 의미는 ADDON으로 확장한다. 수천 기능에서도 핵심 로직 불변, 성능 계약 유지, 영속성 유지, 여러 종목 동시매매에 필요한 WSS/TR 유지·복원이 일관돼야 한다. 이후 구현 완료 판정은 이 목표를 포함한다.

- 새 기능은 등록 계약과 단일 item 변환으로 추가한다. 기능 추가 때문에 ENGINE/BRIDGE/STATE의 범용 알고리즘이나 feature별 분기가 늘어나면 설계 결함이다. 핵심 결함의 범용 수정은 근거·설계·회귀 검증을 요구하며 기능 우회 구현을 허용하는 뜻이 아니다.
- 기능 종류 수, 전체 저장 item 수, 활성 item 수, 고유 구독 수, 초당 이벤트 수를 별도 부하 변수로 둔다. 등록/저장만 된 무관한 기능 수가 정상 이벤트 처리의 전체 순회·재계산·재구독을 유발해서는 안 된다. 최초 로딩/전체 교체 비용은 증분 처리 비용과 별도 계약으로 측정한다.
- 변경 이벤트는 영향받는 item/의존 대상에만 전달한다. 공유 데이터 소스는 중복 TR/WSS 자원을 만들지 않는다. 실제 활성 계산량 증가는 처리 비용을 갖는다는 사실을 숨기지 않으며, 지원 부하에서 지연·메모리·큐 예산을 충족하고 한계 초과를 명시적으로 감지한다. 무한 활성 부하에서 지연 불변을 주장하지 않는다.
- 프로젝트/VD/폼/ADDON 설정 영속성과 정상 적용 경로의 복원은 기능 개수와 무관하게 같은 계약을 따른다. WSS/TR 재연결·재구독·대조는 공통 인프라 경로로 처리하며 ADDON별 재시도/복원 상태기계를 만들지 않는다.
- 다종목 주문은 종목·계좌·주문 식별을 보존한다. 일부 조회/구독/주문 실패가 다른 대상의 상태를 덮어쓰지 않아야 한다. 세션 복원은 구독 의도를 복구하고 서버 상태를 재확인하며 일회성 주문을 재전송하지 않는다.

## D12.realtime-foundation.scale — 성능 불변성 검증 요구

기능/item 수 1·10·1000에서 동일한 활성 부하를 주고 단일 변경의 대상 계산 수, lifecycle operation 수, TR/WSS 요청 수를 비교한다. 무관한 대상 operation은 0이어야 한다. 활성 종목/이벤트 부하를 늘리는 별도 시험에서 수신→계산→화면 지연 p95/p99, 주문 처리 지연, backlog, 메모리 및 복구 시간을 측정한다. 공급자 제한과 시험 환경을 포함한 수치 예산은 D14 OPEN 4에서 확정한다. 단절/인증 만료/지연/중복/조회 실패/프로세스 재시작을 같은 부하에서 검증하기 전에는 성능·복원 보장 완료로 기록하지 않는다.

## D4.realtime-foundation.persistence — 전 단위 JSON 복원 필수 계약

2026-09-06 사용자 명시: 프로젝트, 가상화면, 개별 자식폼, 개별 ADDON의 상태와 값은 JSON을 통해 다음 세션에 동일한 로직으로 복원한다. 4축 경계는 이후 모든 기능과 성능 개선에서도 양보하지 않는다.

- 영속 대상은 각 단위의 사용자 설정과 desired 값 전체다. ID·소속·순서·활성/표시·선택·배치·종목/주기·연동·지표/전략/조건식 파라미터 등 구현되는 모든 필드는 소유 단위와 JSON 경로를 명시한다. DOM이나 메모리에만 유효한 사용자 설정을 남기지 않는다.
- 프로젝트별 문서는 격리한다. 가상화면→자식폼→ADDON 소속과 참조는 안정적인 ID로 유지한다. 프로젝트 격리의 구체 스키마/전환 API는 상세 설계에서 확정하며 현재 구현 완료로 간주하지 않는다.
- 정상 편집과 다음 세션 시작은 모두 JSON desired → 동일한 정규화/projection → generic BRIDGE diff → 등록된 단일 ADDON → ENGINE primitive 경로를 사용한다. 복원 전용 ADDON/BRIDGE 분기, 별도의 생성 순서 상태기계, 화면 값 역추출을 추가하지 않는다.
- STATE는 desired-only다. 상속 원본/null과 명시값을 보존하고 effective 파생값을 다시 저장하지 않는다. 핸들·소켓·promise·retry·연결완료 상태는 저장하지 않는다. 시세·잔고·체결 같은 서버 관측값은 재조회/재구독으로 확인하며 과거 JSON을 현재 서버 상태로 승격하지 않는다. 필요 캐시·거래 감사기록은 workspace desired와 분리해 상세 계약을 정한다.
- 저장 실패/스키마 오류는 명시적으로 드러내며 기존 유효 문서를 보존한다. 버전 변경은 결정적 마이그레이션과 참조 무결성 검사를 거친다.
- 재적용은 idempotent여야 한다. 프로젝트 전환/재시작 시 정상 해제·적용 경로로 자원을 처리하고 다른 프로젝트의 데이터와 구독이 섞이지 않아야 한다. 설정 복원 자체가 과거 일회성 매매 명령을 재실행해서는 안 된다.

## D11.realtime-foundation.persistence — 복원 acceptance 요구

P1 각 단위에서 기본값이 아닌 모든 지원 필드를 설정하고 JSON 왕복 및 새 세션에서 값/소속/참조/선택을 비교한다. P2 숨김·비활성 VD/폼/ADDON도 설정을 보존한다. P3 동일 JSON을 두 번 적용하면 두 번째 lifecycle 변경은 0이다. P4 한 ADDON 값 변경은 무관한 item의 lifecycle을 변경하지 않는다. P5 정상 적용과 재시작 적용의 정규화 descriptor 및 최초 생성 trace가 일치한다. P6 프로젝트 A→B→A 전환 후 설정은 원본과 일치하고 구독/데이터가 교차하지 않는다. P7 복원 중 주문 전송 0, 서버 정합성 확인 전 정상 동기화 표시 0이다. P8 신규 등록 ADDON도 같은 검사 경로로 복원되며 ENGINE/BRIDGE의 kind별 예외 추가는 0이다. 상세 fixture/trace는 DRAFT 설계 확정 때 작성한다.

## D14.realtime-foundation.open — 상세 설계 잔여

이 범위는 DRAFT이며 OPEN 4개다. 기존 승인 범위의 OPEN 상태와 구분한다.
1. 공식 카탈로그별 필드, TR/WSS 지원 범위, 환경별 제한과 조회/주문 rate budget 확정.
2. 서버 데이터 서비스의 계층 매핑과 공개 계약, 구독 수명, snapshot/delta 경합 및 재동기화 완료 판정 확정.
3. 이벤트 식별·중복/역순·유실 대응, 주문 결과 불명/계좌 대조 정책과 저장 경계 확정.
4. 지원 부하와 측정 조건, 지연/큐/메모리 상한, D11 장애·복구 trace 및 독립 T12 검토 확정.

## D1.foundation-r7.scope — 순차 보완 실행 설계안

상태: DRAFT. 2026-09-06 사용자 지시는 설계 완성과 순차 보완 작업의 진행 승인으로 기록한다. Part B 좌표 확장은 후속 사용자 `예`로 승인·반영됐다. 상세 계약 검토와 독립 T12는 남아 있으므로 제품 구현 승인 완료/ARCH PASS로 승격하지 않는다. 기존 v6 승인 범위는 유지한다.

범위는 국내주식 데이터/주문 기반, 프로젝트 격리, 전 단위 영속 복원, 기존 차트의 증분 처리, 조건검색 연계, 오류·연결 상태 UI 및 검증기다. 복잡한 전략 알고리즘/수식 편집기/백테스터는 후속 ADDON 범위다. 현재 모의 환경을 유지한다. 실투자 접속 전환과 외부 주문을 발생시키는 실증은 별도 명시적 사용자 지시가 있어야 한다. 다종목 동시 운용은 논리적 동시 운용이며 서버 요청은 공급자 유량 제한을 따른다.

관측 결함: runtime.js의 activePanes/desired/apply가 항목 전체를 순회하고 정렬한다. chart.js가 지표 projection과 JSON.stringify를 전체 body에 적용한다. 지표별 lifecycle locality 통과는 전체 계산 비용 locality 통과가 아니다. 차트 15초 polling, 현재가 5초 polling, WSS 없음, 단일 workspace.json, 실제 브라우저 및 전체 acceptance 잔여를 기존 구현 사실로 기록한다.

## D2.foundation-r7.boundary — 승인된 좌표 확장

2026-09-06 사용자 `예`로 다음 Part B 좌표 확장을 승인했고 rules.md에 반영했다. Part A의 4축 의미와 I1~I12는 유지한다. 이 승인은 좌표 확장 범위이며 독립 T12 및 상세 명세 완료를 뜻하지 않는다.

| 축/경계 | 기존 위치 | 추가 위치와 책임 |
| --- | --- | --- |
| ENGINE | web/js/core.js, frame.js | web/js/engine/: 키 기반 의존 인덱스·배치·버퍼. app/engine/: 범용 HTTP/stream 자원, 제한된 작업 큐, clock, append journal primitive. Kiwoom TR/종목/주문 의미 없음 |
| ADDON | web/js/addons.js, screens/ | app/addons/: protocol/시세/계좌/주문/조건식의 단일 item 정규화와 primitive 조합. 등록된 codec/reducer는 자기 입력/자기 데이터만 처리. 공통 재시도/collection orchestration 소유 금지 |
| BRIDGE | web/js/runtime.js, desk.js | app/runtime.py: generic desired diff만 소유. feature별 분기 없음. 구독·연결·큐는 ENGINE capability 사용 |
| STATE | workspace.json v6 | workspace.json v7 프로젝트 envelope. 프로젝트 내부 workspace는 v6 유지. UI 명령/projection은 web/js/project-state.js, 서버 persistence는 기존 generic 경로 CRUD 유지 |
| 외부 adapter | app/kiwoom.py 등 | app/kiwoom.py는 기존 HTTP 계약 호환 facade. 새 내부 primitive/ADDON 조립은 공개 계약을 통해 이관하며 완료 후 중복 transport 제거 |

공통 재접속 기계는 ENGINE의 protocol-blind session primitive 한 곳에 둔다. 로그인/heartbeat/구독 메시지는 ADDON이 제공하는 선언적 codec 계약으로 번역한다. 키움 필드명·TR 코드가 ENGINE/BRIDGE에 들어가면 FAIL이다. 실시간 데이터 이벤트는 primitive 입출력이며 workspace STATE 쓰기가 아니다. 일회성 주문은 append journal을 사용하는 명시적 command이고 desired 복원 경로에서 실행하지 않는다.

Part B 반영: B1/B2/B3 위치 추가, B4 v7 envelope+내부 v6, B5 범용 자원 primitive, B7 프로젝트별 ID/완전 참조, B18 v7 fixture와 v6 원본. B13의 기존 /api/node·generic CRUD·vendor 계약은 유지하며 새 서비스 endpoint 추가만 허용한다. 그 외 불변식은 변경하지 않았다.

## D3.foundation-r7.model — 프로젝트와 참조

영속 root는 {schemaVersion:7, projectSeq, activeProjectId, projectOrder, projects}. projectSeq는 1 이상의 안전한 정수이며 신규 ID 발급 후 단조 증가한다. projectOrder는 중복 없는 전체 프로젝트 ID 배열이다. projects는 ID→{name,enabled,props,workspace} 사전이다. name은 NFKC 비교키 기준 프로젝트 간 유일하며 trim 후 1~32 Unicode 문자다. enabled 기본 true, props 기본 {connectionRef:"default",dataEnabled:true,automationEnabled:false}. connectionRef는 서버 설정 별칭이며 키/계좌번호/토큰을 포함하지 않는다. workspace는 기존 v6 전체 문서다. activeProjectId는 존재하는 enabled 프로젝트 하나다. 마지막 enabled 프로젝트 비활성/삭제는 거부한다.

UI 선택과 데이터 운용은 분리한다. 다른 프로젝트로 화면을 전환해도 enabled/dataEnabled 프로젝트의 명시적 운용 구독은 유지하며 보이지 않는 차트의 그리기만 중단한다. automationEnabled는 의도만 저장하고 서버 정합성 확인 및 세션 실행 허용이 없는 상태에서 주문을 실행하지 않는다. 프로젝트 비활성은 해당 프로젝트의 자원 참조만 해제하며 동일 connectionRef의 계좌 감시는 미결 주문이 있으면 유지한다.

완전 참조는 {projectId,formId,itemId}; 경로/문자열 종목코드만으로 item을 식별하지 않는다. form/item 번호는 기존 프로젝트 내부 규칙을 유지한다. 신규 데이터 item도 {id,kind,enabled,visible,props}와 같은 등록 계약을 따른다. 미등록 kind의 원문은 보존하고 unsupported로 표시하며 자원 생성은 0이다.

## D4.foundation-r7.persistence — 마이그레이션과 단일 저장 원본

기존 workspace.json v6를 원문 바이트 보존 백업 workspace.v6.bak로 한 번만 복사한다. 백업이 존재하면 덮어쓰지 않는다. v6 전체를 projects.p1.workspace에 삽입하고 name="기본 프로젝트", projectSeq=2, activeProjectId="p1", projectOrder=["p1"]로 감싼다. 내부 ID·값·숨김 항목·snapshot은 변경하지 않는다. 변환 문서 전체 검증 후 기존 generic 원자 저장 경로로 교체한다. 실패 시 원본 파일 유지, FATAL 표시, 서버 변경 0이다. v5는 기존 v5→v6 결정적 변환 뒤 같은 envelope 변환을 적용한다.

모든 편집은 project-qualified JSON 경로 명령으로 수행한다. localStorage/별도 UI JSON은 authority가 아니다. 정상 편집·프로젝트 전환·새 세션은 같은 projection/diff를 사용한다. 프로젝트 전체 export/import는 v7, VD snapshot은 소속 프로젝트 내부 v6 규칙을 따른다. import 검증은 외부 연결/주문을 실행하지 않으며 취소 시 STATE write 0이다.

시세 캐시와 주문 감사 journal은 desired와 분리한다. journal은 명령 ID별 전송 여부/응답 불명 판별을 위한 거래 증거이고 UI 설정 복원의 원본이 아니다. 디스크 기록 실패 시 신규 주문 전송 0. 과거 journal의 미확정 건은 조회 대조 대상으로만 읽으며 재전송하지 않는다. 이 journal의 상세 필드·회전·결과 불명 대조 규칙은 D14의 독립 검토 대상으로 남긴다.

## D5.foundation-r7.catalog — 공식 연계 카탈로그

공식 검토 기준: Kiwoom-Securities/Kiwoom-REST-API commit 234560d213acd8871ae344b5481aecd2f30287fa의 kiwoom/_data/kiwoom_api_spec.json 및 kiwoom/core/ws_client.py. 구현에서는 공식 필드의 타입·필수값·응답 배열·페이지 정보를 검증한 등록 스펙으로 보관한다. 원격 최신 main을 매 부팅 자동 적용하지 않는다.

| 기능 | wire 계약 | 완료 검증 |
| --- | --- | --- |
| 인증 | OAuth token, WSS LOGIN/응답 확인, PING echo | 토큰 동시 발급 공유, 만료/로그인 거부, 비밀값 로그 0 |
| 초기 봉/현재가 | 기존 ka10079~ka10083, ka10001 | 명시 배열, 출처/시장 분리, 페이지 실패 시 최신 승격 0 |
| 시세/호가/장상태 | WSS 0B/0D/0s REG·REMOVE | 구독 공유, ack 실패, 늦은 연결 데이터 격리 |
| 잔고/예수금 | kt00018/kt00001 + WSS 04 | 초기 snapshot과 실시간 절대값 반영·주기적 서버 대조 |
| 주문 감시 | ka10075/ka10076 + WSS 00 | 접수/체결 구분, 부분체결, 원주문 연결, 외부 주문 반영 |
| 주문 요청 | kt10000/kt10001/kt10002/kt10003 | 제출/정정/취소, 결과 불명, 중복 실행 차단 |
| 조건검색 | ka10171~ka10174: CNSRLST/CNSRREQ/CNSRCLR | 목록·일반 결과·실시간 초기 결과·편입/이탈·해제 |

각 kind의 스키마는 필요한 필드를 명시한다. 기본 source는 paper/KRX. market은 KRX/NXT/SOR enum이며 paper의 비KRX 요청은 UNSUPPORTED_MARKET로 거부한다. 실전 지원으로 자동 전환하지 않는다. 종목의 정규화는 instrument와 시장을 분리하고 wire 변환만 provider codec에서 처리한다. 조건검색 시장은 확인된 공식 KRX 계약을 사용한다. 일반 TR은 등록 스펙만 추가해 조회할 수 있어야 하며 임의 URL proxy는 제공하지 않는다.

## D6.foundation-r7.primitives — 공개 계약 제안

모든 시간·network·파일 I/O는 주입한다. ENGINE은 opaque key와 codec/reducer capability만 받으며 feature kind를 분기하지 않는다.

| 공개 계약 | 사후 조건 |
| --- | --- |
| acquire(key, descriptor) → lease | 동일 key·동일 descriptor는 underlying resource 공유. 서로 다른 descriptor 충돌은 오류 |
| release(lease) | 중복 release 무해. 마지막 ref에서 구독 해지/자원 해제 |
| request(key, descriptor, signal) → result | 동일 조회 in-flight 공유. waiter 취소는 다른 waiter 취소가 아님. sideEffect descriptor는 공유/재전송 금지 |
| observe(key, listener) → off | key에 등록된 listener만 통지. off 이후 통지 0 |
| publish(key, event) | key index로 대상 결정, 전체 catalog 순회 0 |
| flush(keys) | dirty 대상만 deterministic 순서 처리. 메모리/큐 예산 초과는 명시 오류 |
| append(commandId, record) → durable receipt | 성공 반환 전에 내구성 확보. 실패 시 side effect 실행 금지 |

이 표는 시그니처의 방향을 확정하는 제안이다. descriptor/lease/error의 전체 필드와 동시 호출 trace가 독립 T12에서 확정되기 전에는 해당 제품 코드를 쓰지 않는다.

## D7.foundation-r7.flow — 정상 실행과 연결 복구

1. 저장 root 검증/마이그레이션 후 프로젝트별 desired를 정규화한다. enabled 프로젝트의 운용 item과 활성 화면의 시각 item을 동일 generic change-set으로 투영한다.
2. BRIDGE는 제거→생성→변경 순서로 단일 item 등록 계약을 호출한다. 변경 집합 내부는 ID 코드포인트 오름차순, 제거는 내림차순이다. full apply는 최초 부팅/전체 import에만 사용하고 정상 tick에서는 key index로 직접 변경 대상을 전달한다.
3. session primitive는 transport 연결→인증 ack→현재 ref 집합의 등록 ack 순서로 실행한다. session generation을 증가시키고 이전 generation 완료 응답은 폐기한다. 재연결도 같은 acquire 경로를 사용한다.
4. snapshot 요청 전 실시간 수신을 시작하고 연결 세대별 event 번호를 부여한다. 시장/계좌 reducer별 중복·경합 규칙으로 snapshot과 event를 조합한다. wire에 전역 sequence가 없으면 완전 순서/무손실 재생을 가정하지 않는다.
5. 계좌·미체결·체결 조회와 구독 ack가 완료돼야 READY 후보가 된다. 미확정 주문/누락/버퍼 overflow가 있으면 DEGRADED를 유지한다. 가격만 오래됐다는 이유와 연결 실패는 구분해 표시한다.
6. 주문 명령은 fresh+READY 검증→명령 journal 내구 기록→단 한 번 전송→응답 기록 경로다. HTTP 응답은 체결 확인이 아니다. 불명 결과는 조회로 대조하며 유사한 종목/수량만으로 특정 주문에 자동 연결하지 않는다.

연결 상태는 DISCONNECTED/CONNECTING/AUTHENTICATING/SUBSCRIBING/SYNCING/READY/DEGRADED/ERROR로 표시하되 runtime 메모리 값이다. 상태가 저장 JSON에 들어가면 FAIL이다. backoff 기본 1/2/4/8/16/30초, 이후 30초, 인증 거부 재발급 1회, 연속 거부는 ERROR로 정지한다. 가짜 시세나 정상 상태로 fallback하지 않는다.

## D8.foundation-r7.keys — 데이터 격리와 비교

키는 배열의 canonical JSON으로 직렬화한다. 종목 데이터 키는 [source,connectionRef,market,instrument,channel,timeframe], 계좌 데이터는 [source,connectionRef,accountAlias,channel], item 키는 [projectId,formId,itemId]다. 토큰을 key에 포함하지 않는다. 문자열 연결 구분자에 의존하지 않는다. 기존 canonicalHash 계약을 사용하며 정규화된 값만 hash한다. side-effect commandId는 별도 불변 ID다.

동일한 desired 재적용으로 provider generation이나 commandId를 새로 만들지 않는다. sequence/time/status는 runtime 데이터이며 desired hash에 포함하지 않는다. unknown 필드 삭제나 null→기본값 덮어쓰기로 사용자 설정을 잃지 않도록 kind normalize와 영속 validation을 분리한다.

## D9.foundation-r7.effective — 실행 허용 조건

visualEffective = project.enabled && project.id==activeProjectId && 기존 formEffective && seriesEffective.
dataEffective = project.enabled && project.props.dataEnabled && item.enabled; 시각적 visible은 운용 구독을 해제하지 않는다.
autoOrderEligible = dataEffective && project.props.automationEnabled && sessionArmed && accountReady && sourceFresh && !unresolvedCommand && !overloaded.

sessionArmed는 false로 부팅하는 비영속 실행 허용값이다. 설정 복원만으로 이전 주문을 실행하지 않는다. 수동 명령은 명시적 사용자 실행과 계좌/데이터 정합성 검증을 요구한다. 장애 중 정정·취소의 허용 범위는 주문별 대조 규칙이 완성될 때 별도 표로 확정한다.

## D10.foundation-r7.errors — 기본 실패 처리

| 조건 | 결과 |
| --- | --- |
| 연결/로그인/구독 ack 누락 | READY 금지, 시간초과 표시, 공통 연결 재시도 |
| 공급자 유량 거부 | 조회 큐를 제한, 오류/대기 표시, 주문 자동 재전송 0 |
| 초기 snapshot 페이지 실패 | 기존 값 stale 표시, 완전 snapshot으로 교체 0 |
| 이전 프로젝트/연결 결과 도착 | generation/key 검사로 폐기, 새 대상 값 변경 0 |
| 주문 전송 후 응답 유실 | UNKNOWN 기록, 조회 대조, 자동 재전송 0 |
| 계좌/체결 이벤트 유실 의심 | DEGRADED, 신규 자동 주문 중지, 서버 대조 |
| 이벤트 큐 상한 초과 | 표시 병합과 거래 데이터 구분, overflow 기록, 재대조, 정상으로 숨김 금지 |
| JSON 저장 실패/참조 오류 | 기존 유효 파일 보존, 오류 표시, 성공 응답 0 |
| 등록되지 않은 kind | 원문 설정 보존, unsupported 표시, lifecycle 0 |
| 같은 commandId 재요청 | 기존 기록 반환, 두 번째 wire 전송 0 |

## D11.foundation-r7.acceptance — 합격 행렬

| 검사 | 설계 기대 결과 |
| --- | --- |
| F01 | N=1/10/1000 동일 item 알고리즘, 무관한 kind 변경 0 |
| F02 | 단일 key 이벤트의 normalize/update 수는 그 key 의존 대상 수만큼, 전체 item touch 0 |
| F03 | 같은 JSON 2회 적용의 두 번째 ensure/update/remove 0 |
| F04 | 새 세션과 fresh apply의 descriptor/최초 lifecycle trace 동일 |
| F05 | 프로젝트 A→B→A 설정/ID 보존, 구독 ref 공유, 데이터 혼입 0 |
| F06 | 로그인 거부·heartbeat 단절·재연결 시 중복 session 0, 구독 복구 후에만 READY |
| F07 | TR 진행 중 이벤트/늦은 응답/순서 변경에서도 이전 generation 덮어쓰기 0 |
| F08 | 부분체결/중복 체결/정정/취소/결과 불명에서 수량 중복 합산·재전송 0 |
| F09 | 조건검색 초기 목록과 I/D 이벤트, 재접속 후 누락 종목 재대조 |
| F10 | 숨김/비활성/unknown ADDON까지 JSON 왕복 보존, import 취소 write 0 |
| F11 | 큐 overflow/디스크 실패/장시간 부하에서 오류가 표시되고 메모리 상한 유지 |
| F12 | 신규 등록 ADDON 추가 시 ENGINE/BRIDGE/STATE 알고리즘 diff 0 |

기존 T1~T13/U1~U13/C1~C5와 persistence P1~P8은 계속 유효하다. 실제 event 배열과 독립 기대값 파일을 먼저 만들고 구현 출력에서 기대값을 추출하지 않는다. 실제 키움 검증은 오프라인 fixture와 분리하며 장중 미실증을 PASS로 기록하지 않는다.

## D12.foundation-r7.budgets — 시험 예산 제안

공급자 보장치가 아닌 이 프로젝트의 초기 목표다. 기준 환경은 Windows x64 4 logical cores/16GiB, foreground Chromium 1탭, 서버 1프로세스. 측정 시 OS/CPU/런타임 버전을 결과에 기록한다.

- 등록/저장 1000 item, 활성 100 data item, 고유 종목 20, 합계 초당 1000 입력 event를 30분 주입한다. 동일 활성 부하에서 저장 item 1/10/1000 비교는 별도 F01/F02로 수행한다.
- 입력 수신→정규화 dispatch p95 20ms/p99 50ms, 입력 수신→foreground 화면 반영 p95 100ms/p99 250ms를 목표로 한다. 공급자 전송 지연과 TR queue 대기 시간은 별도 측정한다.
- warm-up 5분 후 heap/RSS 증가 30분간 50MiB 이내. 이벤트 backlog 10000건 또는 16MiB 중 먼저 도달한 상한에서 overflow를 명시한다. 차트별 최대 1200봉, inactive cache 32개는 유지한다.
- HTTP 시작 간격 기본 1200ms, in-flight 1, 대기 256건, 요청 timeout 15초. 이는 현재 모의 조회의 보수적 기본값이며 실전 처리량 보장으로 쓰지 않는다. 주문 큐를 일반 차트 조회보다 먼저 처리하되 발송 시 freshness를 다시 확인한다.
- 정상 delta는 O(K+E_changed)이며 전체 초기 load는 O(N+E)로 분리한다. 실제 저장은 문서 크기에 비례하므로 market tick에서 desired serialize/write는 0이어야 한다.
- 복구 시간은 연결 성공 후 구독 ack 및 필수 TR 대조 완료까지 측정한다. 공급자 지연 때문에 고정 완료 시간을 허위 보장하지 않는다. 60초 미완료 시 명시적 DEGRADED와 미완료 단계 표시, 복구 시도는 공통 정책으로 계속한다.

## D13.foundation-r7.sequence — 보완 순서와 완료 산출물

| 단계 | 선행 조건 | 산출물/통과 조건 |
| --- | --- | --- |
| R0 설계/좌표 | 현재 사용자 진행 지시 | Part B 제안 확정, 스키마 fixture/공개 계약/골든 trace 완성, 독립 T12 |
| R1 검증기 | 기존 v6 승인 및 R0의 검사 계약 | static/semantic/recorder/t12 독립 실행, 미실행을 PASS로 출력하지 않음 |
| R2 프로젝트 STATE | R0 승인 | v7 마이그레이션, 프로젝트 전환/저장/import, P1~P8 중 영속 항목 |
| R3 범용 데이터 primitive | R0 승인 | key index/lease/queue/clock/session 및 feature-blind bridge, N=1000 locality |
| R4 Kiwoom TR ADDON | R3 | 등록 스펙, 조회 공유/페이지/유량/인증, 기존 facade 단일 경로 이관 |
| R5 WSS 시세 | R4 | LOGIN/PING/REG/REMOVE, snapshot+delta, 시장/종목 격리 |
| R6 계좌·주문 | R5 | 서버 대조, journal, 부분체결·정정·취소·UNKNOWN, 외부 전송 없는 장애 시험 |
| R7 조건검색 | R5 | 목록/초기/편입·이탈/해제/재연결 결과 대조 |
| R8 UI·지표 증분 | R2/R5 | polling 제거, 선택 종목/지표 귀속, key 의존 대상만 계산/렌더 |
| R9 전체 실증 | R1~R8 | 기존 acceptance + F01~F12 + 부하/장애 + 장중 실제 읽기 검증 |

각 단계는 설계→회귀 기대값→경계 1개 구현→검증→todo 갱신→commit/push 순으로 진행한다. 어떤 단계도 후속 단계가 있다는 이유로 미완료를 완료 처리하지 않는다. 본 표는 한 번의 코드 변경으로 전 단계를 합치라는 지시가 아니다.

## D6.foundation-r7.resource-types — 공통 자원 타입 계약

아래는 D6.primitives 표를 구체화한 설계 계약이다. 제품 구현 완료를 뜻하지 않는다.

- ResourceKey는 canonical JSON 배열을 직렬화한 비어 있지 않은 string(UTF-8 2048 bytes 이하)이다. 빈 key/상한 초과는 INVALID_INPUT, 자원 생성 0이다.
- Descriptor는 {version:1,mode:"request"|"stream",sideEffect:boolean,profileId:string,config:JSON object,delivery:"ordered"|"latest",queueLimit:int,byteLimit:int}. sideEffect 기본 false, stream에서는 true를 거부한다. profileId는 등록된 선언적 protocol profile의 불변 ID다. config에는 비밀값 대신 credentialRef를 둔다. 미등록 profile은 UNSUPPORTED_PROFILE. queueLimit 범위 1~10000, byteLimit 범위 1024~16777216, 기본은 각각 10000/16777216. ordered는 모든 이벤트를 순서대로 전달, latest는 같은 key의 미전달 표시값만 대체한다. 원시 체결/주문 이벤트는 ordered로 등록한다.
- DescriptorHash는 정규화 Descriptor 전체의 기존 canonicalHash다. 동일 key에 다른 hash로 acquire하면 KEY_CONFLICT를 반환하고 기존 자원은 유지한다. 갱신은 기존 lease release 후 다른 key 또는 마지막 lease가 해제된 key의 acquire로 표현한다.
- Lease는 {id:int,key:string}의 비영속 opaque handle이다. id는 ENGINE 인스턴스 내 1부터 단조 증가하며 재사용하지 않는다. 이미 해제된 lease의 release는 no-op, 다른 인스턴스의 lease는 INVALID_HANDLE이다. 역직렬화된 JSON 객체를 유효 lease로 받지 않는다.
- Error는 {code:string,retryable:boolean,message:string,key:string|null}이다. 허용 code는 INVALID_INPUT/INVALID_HANDLE/UNSUPPORTED_PROFILE/KEY_CONFLICT/TIMEOUT/CANCELLED/AUTH_REJECTED/REMOTE_ERROR/OVERFLOW/IO_ERROR/PROTOCOL_ERROR/CLOSED. message에는 credential/계좌번호/원시 주문 body를 넣지 않는다. raw cause는 노출하지 않는다.
- 수신 Event는 {key,generation:int,seq:int,receivedAt:int,payload:JSON}. generation은 연결 시도마다 증가, seq는 generation 내 수신 프레임 처리 순서로 1부터 증가한다. receivedAt은 주입된 monotonic clock의 밀리초다. 거래소 시간과 혼용하지 않는다.
- observe는 등록 이후 event만 전달한다. 현 snapshot 조회는 별도 read(key) 계약으로 {value,quality,generation,updatedAt}|null을 반환한다. 여러 listener는 등록 순서로 호출한다. 한 listener 예외는 해당 listener 오류로 보고하고 나머지는 계속 호출한다. callback 도중 off된 listener는 그 이후 호출하지 않는다.
- request waiter는 개별 취소 가능하다. 모든 waiter 취소 후 아직 발송 전이면 underlying 작업을 제거한다. 발송 후 원격 취소나 rollback을 가정하지 않는다. sideEffect 요청은 공유 캐시/자동 재시도를 적용하지 않는다. request의 정확한 wire status 판정은 profile codec이 정규화한다.
- 자원 해제 도중 같은 key acquire는 기존 종료를 되돌리지 않는다. 새 generation 자원을 생성하되 provider 연결당 control 큐에서 REMOVE ack 후 REG를 직렬 처리한다. timeout은 구세대 연결을 닫고 새 연결의 정상 acquire로 처리한다. ADDON이 별도 pending/restore 기계를 만들지 않는다.
- flush는 같은 turn의 dirty key 집합만 코드포인트 순으로 처리한다. 같은 key의 반복 표시 업데이트는 1회, ordered 원시 이벤트는 병합하지 않는다. publish는 다른 key를 스캔하지 않는다. 전체 정렬은 초기 desired 목록과 명시적 전체 교체에 한정한다.

## D10.foundation-r7.reconciliation — 데이터 충돌 처리 계약

| 상황 | 정규화/대조 규칙 |
| --- | --- |
| snapshot 요청 전/중 event | 구독 ack 후 같은 generation의 원시 event를 버퍼링. snapshot 완료 시 순서 증명 가능한 event만 병합. 시간만 같다는 이유로 동일 체결로 간주하지 않음 |
| 종목 체결의 고유 ID 없음 | 연속 같은 가격/수량을 무조건 중복 제거하지 않음. 수신 순서로 처리하며 재연결 구간은 TR 재조회로 봉을 교체. 분봉은 잠정값 표시 후 종료 봉을 TR로 재확인 |
| 가격/잔고 절대값 event | 델타 수량으로 더하지 않고 해당 값으로 투영. snapshot과의 우선순위를 증명 못하면 DEGRADED, 관련 TR 재조회 |
| 체결번호가 있는 계좌 event | source/계좌별칭/거래일/주문번호/체결번호 키로 동일 건 중복 합산 차단. 핵심 필드 충돌 시 임의 덮어쓰기 대신 대조 필요 상태 |
| 체결번호 없음/부분 필드 | 응답 원문에서 완전 상태를 추정하지 않음. 제공된 필드만 반영, 미체결/체결 TR 요청을 같은 key로 합침 |
| snapshot 도중 계좌 변경 | 요청 시작/완료 사이 관련 event 존재 시 snapshot만으로 READY 선언 금지. 후속 조회로 대조하며 이벤트가 계속돼 안정 상태가 확인되지 않으면 DEGRADED 유지 |
| 조건식 초기 응답과 I/D | 동일 조건식/generation에 받은 초기 결과 뒤 버퍼의 I/D를 수신 순서로 적용. 중복 I/D는 set 연산으로 무해. 응답과 event 경합을 검증 못한 경우 초기 결과 재조회로 대조 |
| 시세 없음 | 장중 무체결 종목과 transport 단절을 구분. 마지막 데이터 시각과 연결 heartbeat를 별도로 표시하며 가짜 봉을 만들지 않음 |
| 날짜 경계 | 거래일이 없는 HHmmss만으로 이전 날짜를 확정하지 않음. reconnect/날짜 전환 시 초기 snapshot 재조회, KST 기준 세션 날짜가 검증되기 전 자동매매 eligible=false |

이 계약은 불확실한 데이터를 정상으로 승격하지 않는 보수적 기준이다. 공급자가 snapshot cut/전역 sequence를 제공하지 않는 경로에서 선형화된 무손실 동기화를 주장하지 않는다. 실제 데이터별 대조가 READY로 수렴하는지 R5/R6 장중 acceptance에서 검증해야 한다.

## D4.foundation-r7.command-journal — 주문 증거와 재실행 방지

위치 제안은 data/<source>/commands/<connectionAlias>/YYYYMMDD.jsonl이다. workspace와 분리하며 alias는 [a-zA-Z0-9_-]{1,64}로 검증한다. 파일 경로에 계좌번호·토큰을 넣지 않는다. 한 프로세스의 connectionAlias별 단일 writer만 append한다. 다중 서버 프로세스 운용은 거부한다.

record는 {version:1,seq,commandId,event,recordedAt,payload}. seq는 파일 내 1부터 단조 증가한다. commandId는 UI/서버 command ingress가 발급한 UUID 문자열이며 같은 명령 재요청은 동일 ID를 유지한다. recordedAt은 주입 UTC epoch milliseconds다. event는 PREPARED/ACKNOWLEDGED/REJECTED/UNKNOWN/RECONCILED다.

PREPARED payload는 {projectId,formId,itemId,connectionAlias,instrument,market,action,quantity,price,originalOrderId,requestHash}. action은 BUY/SELL/AMEND/CANCEL. quantity는 정수, price와 originalOrderId는 null 허용 여부를 wire catalog가 검증한다. PREPARED append+flush+fsync 성공 후에만 wire 전송한다. 동일 commandId와 다른 requestHash는 CONFLICT로 거부한다. PREPARED만 남은 재시작도 UNKNOWN으로 처리하며 전송하지 않는다.

ACKNOWLEDGED는 providerOrderId와 provider 응답 결과만 기록한다. 체결완료를 뜻하지 않는다. REJECTED는 명백한 원격 거부에서만 사용하며 timeout/비JSON/연결 유실은 UNKNOWN이다. UNKNOWN은 자동 재전송 금지이며 주문번호가 확인되면 주문/체결 조회로 RECONCILED 기록한다. 주문번호 없이 종목·수량·시각이 유사한 후보만 있으면 미확정으로 남기고 후보와 확인 필요 상태를 표시한다. 조회 결과에 없다는 이유만으로 전송되지 않았다고 판정하지 않는다.

동일 commandId 요청은 최초 PREPARED payload와 현재 기록을 반환한다. append 실패는 IO_ERROR, wire 전송 0이다. 잘린 마지막 줄/seq 불연속/같은 ID의 충돌 기록은 읽기 복구 오류로 표시하고 해당 connection의 신규 주문을 막는다. 파일 자동 삭제/회전 중 덮어쓰기는 하지 않으며 날짜별 새 파일에 이어간다. 보존/정리 정책은 실제 거래 사용 전 별도 설계로 지정한다. 원문 키/토큰은 기록하지 않는다.

## D5.foundation-r7.wire-profile — protocol 선언과 응답 상관관계

ProtocolProfile은 {id,version,transport,endpointRef,credentialRef,openTimeoutMs,ackTimeoutMs,idleTimeoutMs,controlLimit,codecId}다. id/codecId는 [a-zA-Z0-9_.-]{1,64}, version=1, transport는 http|websocket. endpointRef는 설정의 등록 별칭이고 외부 입력 URL은 금지한다. 기본 openTimeoutMs=15000, ackTimeoutMs=15000, idleTimeoutMs=90000, controlLimit=256이며 양의 정수만 허용한다. HTTP idleTimeoutMs는 적용하지 않는다. codecId의 구현은 ADDON 등록부에 있고 ENGINE은 codecId의 의미를 해석하지 않는다.

codec의 순수 계약은 encode(operation,args,credential)→JSON, classify(frame)→{type:"heartbeat"|"ack"|"event"|"invalid",correlation:string|null,payload:JSON}, accepts(operation,args,ack)→boolean, decode(channel,row)→{value,quality,missing}다. credential은 송신 시점에만 전달하고 descriptor/hash/event/로그에 저장하지 않는다. codec는 session/queue/live collection을 참조하지 않는다. ENGINE은 heartbeat/ack/event의 공통 실행만 소유한다.

| operation | 송신/상관관계 | 성공 조건 |
| --- | --- | --- |
| login | LOGIN + token / LOGIN | return_code가 정수 0 또는 문자열 "0"일 때만 성공. 필드 누락/다른 타입 실패 |
| subscribe | REG, grp_no="1", refresh="1", data=[{item:[wireCode],type:[channel]}] / REG | 같은 generation의 유일 pending control과 trnm 일치, return_code=0. grp_no/data echo가 있으면 요청과 일치해야 함 |
| unsubscribe | REMOVE, grp_no="1", data=[{item:[wireCode],type:[channel]}] / REMOVE | subscribe와 같은 검증, refresh 필드 생략 |
| conditions-list | CNSRLST / CNSRLST | return_code=0, data 배열 |
| conditions-query | CNSRREQ, seq, search_type="0", stex_tp="K", cont_yn/next_key / CNSRREQ+seq | return_code=0 및 seq 일치. 연속 조회 20페이지/반복키 거부 |
| conditions-live | CNSRREQ, seq, search_type="1", stex_tp="K" / CNSRREQ+seq | return_code=0 및 seq 일치, 초기 결과 저장 후 REAL 반영 |
| conditions-stop | CNSRCLR, seq / CNSRCLR+seq | return_code=0 및 seq 일치 |

account 채널 00/04의 wireCode는 빈 문자열이다. quote/trade 호가 채널의 wireCode는 KRX=6자리, NXT=6자리_NX, SOR=6자리_AL. 계좌 모니터링은 connection당 00/04 각 1개를 공유한다. 모의 환경은 KRX만 허용한다. WSS control은 연결 전체에 pending 1개만 허용한다. REAL/PING은 pending을 완료시키지 않는다. heartbeat는 수신 JSON을 그대로 echo하며 control rate 대기와 분리한다.

ack timeout/상관관계 불일치는 PROTOCOL_ERROR/TIMEOUT으로 연결을 닫고 새 generation에서 재시작한다. 늦은 구세대 응답이 신규 요청의 완료가 되면 FAIL이다. pending 없는 ack는 경고 카운트만 증가시키고 무시한다. 서버 ack에 요청 ID가 없는 REG/REMOVE는 같은 연결의 순차 응답 계약을 전제로 한다. 동일 trnm의 중복 응답을 완전히 식별할 수 있다고 주장하지 않는다. wire 이상이 의심되면 재접속/재대조한다.

메시지 수신 공백 90초는 연결 stale로 처리한다. PING echo는 1초 이내 송신 목표이고 이벤트/그리기 큐에 막히지 않는다. 새 구독의 성공 응답 없이는 confirmed로 표시하지 않는다. HTTP와 WSS 유량 설정은 별도이며 WSS control 최소 간격 200ms를 프로젝트 기본 제한으로 적용한다. 이를 공급자 공식 허용량이라고 표시하지 않는다. socket이 없는 상태에서 pending control을 생성하지 않는다. control 상한 초과는 OVERFLOW이며 요청을 몰래 삭제하지 않는다.

## D5.foundation-r7.normalized-events — 필드와 단위

wire 값은 문자열로 받고 정수/십진수 문법을 검증한다. 공백 trim 후 정규식 [+-]?[0-9]+(\.[0-9]+)?만 허용한다. 금액/비율은 canonical decimal string(앞 0/불필요한 소수 0 제거, -0→0)으로 보존한다. 차트 입력으로 변환할 때만 유한 number 범위를 검증한다. 수량은 비음수 safe integer로 정규화한다. 누락/빈 문자열은 null이며 0으로 채우지 않는다. 유효하지 않은 숫자는 INVALID_INPUT, 해당 row의 시장/계좌 값 update 0이다. 가격의 방향 부호는 abs 처리하고 change/rate는 부호를 보존한다.

정규화 event는 {channel,instrument,market,accountAlias,timeText,fields,quality,missing}. channel은 wire type, instrument는 접두/시장 접미를 분리한 코드이며 accountAlias는 서버 검증 후 별칭만 전달한다. timeText는 HHmmss 검증 문자열 또는 null. quality는 complete|partial, missing은 필수 내부 필드 누락 목록을 이름 오름차순으로 저장한다. missing이 있으면 부분 필드를 표시할 수 있으나 매매 판단 eligible=false다. wire의 불필요한 원문 개인정보는 UI에 전달하지 않는다.

| channel | 필수 내부 필드 ← wire | 추가 필드 ← wire |
| --- | --- | --- |
| 0B | price←abs(10), tradeQty←abs(15), cumulativeQty←13, timeText←20 | change←11, rate←12, turnoverMillion←14, open/high/low←abs(16/17/18) |
| 0D | timeText←21, asks[1..10].price/qty←abs(40+i)/(60+i), bids[1..10]←abs(50+i)/(70+i) | totalAskQty←121, totalBidQty←125 |
| 00 | orderId←9203, instrument←9001, status←913, timeText←908 | orderQty←900, orderPrice←abs(901), remainingQty←902, cumulativeAmount←903, originalOrderId←904, executionId←909, executionPrice←abs(910), executionQty←911, side←907, rejectReason←919, market←2134 |
| 04 | instrument←9001, holdingQty←930, availableQty←933 | averagePrice←abs(931), acquisitionAmount←932, price←abs(10), creditType←917, loanDate←916 |
| condition | conditionId←841, instrument←9001, membership←843 | timeText←20, side←907 |
| 0s | sessionCode←215, timeText←20 | remainingTime←214 |

0B/0D의 market은 승인된 subscription key를 기준으로 하고 wire.item과 일치해야 한다. 00의 2134는 0=SOR,1=KRX,2=NXT이며 누락 시 market=null로 두고 대조한다. 04는 시장별 잔고를 임의 추정하지 않고 계좌/종목/신용구분/대출일 키로 대조한다. 00/04의 9201은 서버 credential에 연결된 실제 계좌와 일치하는지 검사하며 UI에는 accountAlias만 전달한다. 불일치는 PROTOCOL_ERROR와 account DEGRADED다.

종목 prefix A는 국내주식으로 분리하고 J/Q는 현재 범위에서 UNSUPPORTED_INSTRUMENT다. 시장 접미는 _NX/_AL 중 하나만 허용한다. 00의 status는 접수/체결/확인/취소/거부 원문을 보존하며 모르는 값은 partial 처리한다. side는 1=SELL,2=BUY, 나머지는 null/partial이다. 원주문 0000000은 null. 00의 누적 체결금액을 체결 수량으로 해석하지 않는다. 0B turnoverMillion은 백만원 단위를 그대로 명명하며 원 단위로 표시할 때만 1000000을 곱한다. condition membership은 I/D만 허용한다.

주문 수량/잔고 key별 충돌·날짜·부분 필드 처리는 D10.reconciliation을 따른다. 계좌 event를 수량 delta로 무조건 합산하거나, 같은 HHmmss를 중복 체결 key로 사용하는 것은 금지한다. 시간문자열만 제공되는 채널은 broker 거래일이 확인되기 전 epoch를 확정하지 않는다.

## D11.v6.check-runner — 기존 승인 검증의 실행·보고

기존 v6 Tranche 7의 검사 명령을 다음과 같이 분리한다. 이 변경은 검증 도구 범위이고 r7 제품 구현 게이트를 우회하지 않는다. `check.py` 인자 없음은 static만 실행해 `[PASS] static`을 출력한다. --static/--semantic/--recorder/--t12는 조합 가능하고 실행 순서는 이 순서로 고정한다. 모르는 인자는 argparse 오류(exit 2)다. 게이트 실패는 exit 1, 선택한 실행 게이트 전부 성공일 때 exit 0. 실행하지 않은 gate/ARCH PASS를 출력하지 않는다.

static은 기존 C1~C7을 유지한다. B2에 승인된 app/addons의 기능 어휘는 C1 검사에서 제외한다. C3/C4는 소스 검사이므로 static으로 분류한다. 필수 검사 파일이 없으면 FAIL이며 건너뛰지 않는다. 현재 deskspec schema는 내부 v6 fixture와 대조하고, project-state.js가 추가되면 envelope v7 fixture와 대조한다. 대상 파일·JSON 파싱 실패는 FAIL이다.

semantic은 tests의 등록된 JS 회귀 파일 전체와 test_kiwoom_rest.py/test_state_recovery.py/test_check_runner.py를 실행한다. 이는 기존 회귀 범위 PASS이며 미구현 r7/F01~F12 또는 실제 브라우저/전체 ARCH PASS를 뜻하지 않는다. 각 child timeout은 60초이며 실패/미설치/시간초과를 FAIL로 기록한다. stdout/stderr는 artifacts/check.log에 남기고 사용자 출력은 gate별 결과 또는 규정의 4줄 오류만 쓴다. 실제 키움 주문을 호출하는 테스트는 추가하지 않는다.

recorder는 desk-bridge-v6.mjs의 실제 recorder callback 이벤트를 artifacts/desk-recorder.v6.json에 저장한다. {schemaVersion:1,harnesses:[{id,events}]} 형식이며 각 harness의 seq를 유지한다. 기존 fixture 비교 assertion을 그대로 실행하고 성공한 실행에 한해서만 아티팩트를 쓴다. 생성되지 않은 과거 아티팩트로 PASS를 판정하지 않는다.

t12는 tests/reference/<scope>.t12-review.json의 독립 재구성을 검사한다. 기본 scope는 foundation-r7이고 --t12-scope project-envelope-a, project-envelope-b, project-commands-c로 통과된 최소 범위를 별도 검사한다. scope 옵션은 --t12와 함께만 사용한다. 증거 누락/형식 오류/문서 변경/차단 결함/시그니처·기대값 불일치는 FAIL이다. PASS 라벨만으로 통과시키지 않는다. 전체 r7은 차단 결함이 남아 있다.

project-commands-c는 D1.project-commands-c부터 D14.project-commands-c.end 직전까지의 원문을 snapshot에 보존하고 같은 SHA/범위 비교로 시그니처 4개와 PCC1~14 기대값을 비교한다.

project-envelope-a의 검토 당시 README 원문은 tests/reference/project-envelope-a.review-source.json에 보존한다. 그 원문의 SHA256이 독립 보고서와 일치하고, 현재 README의 D1.project-envelope-a부터 다음 D14.foundation-r7.review 직전까지가 원문과 LF 정규화 기준 동일해야 한다. rules.md 원문 SHA256도 일치해야 한다. 시그니처 3개와 PEA1~PEA12의 기대값/빈 lifecycle trace를 contract fixture와 비교한다. project-envelope-b도 같은 방식으로 별도 원문 snapshot을 사용하며 D1.project-envelope-b부터 D7.project-storage.followup 직전까지, 시그니처 1개와 PEB1~PEB14를 비교한다. 해당 scope PASS를 전체 r7 PASS로 출력하지 않는다. 원문 snapshot은 검토 증거이며 상시 규칙 문서가 아니다.

## D1.project-envelope-a — 최초 구현용 독립 범위

이 절의 범위는 web/js/project-state.js의 순수 함수 3개뿐이다. 프로젝트 UI/CRUD/파일 쓰기/백업/구독/lifecycle/주문은 실행하지 않는다. r7 전체와 독립된 최소 구현 단위이며 아래 D1~D14를 전부 적용한다. 독립 T12 결과와 사용자 진행 승인은 todo.md에 기록한다. 신규 프로젝트 UI까지 완성됐다는 의미가 아니다.

### D2.project-envelope-a.boundary

STATE 위치는 rules.md B4의 web/js/project-state.js다. 다른 모듈 import 0, 전역 I/O·DOM·clock·random 접근 0. ENGINE/ADDON/BRIDGE 파일 변경 0. export는 PROJECT_SCHEMA=7과 아래 함수 3개뿐이다.

### D3.project-envelope-a.types

입력 text는 JSON 문자열이다. workspace는 object이고 schemaVersion=6이며 실제 v6 의미 검증은 주입된 validateWorkspace에게 위임한다. 함수가 root version만으로 전체 v6 유효성을 인정하지 않는다. callback은 동기 (workspaceObject)→boolean이며 true만 합격이다. 함수 내부는 text 파싱/유한수 검사/clone만 수행한다. callback은 clone을 받으므로 callback이 수정해도 반환 workspace는 원문 파싱 결과 그대로다. callback의 오류·false·Promise 반환은 WORKSPACE_INVALID다.

ProjectId는 p 뒤 양의 십진 정수, 앞자리 0 없음, 숫자 부분이 Number.MAX_SAFE_INTEGER 이하인 문자열이다. 오류는 Error 인스턴스, name="ProjectStateError", code와 message 모두 아래 오류 코드 문자열과 같다. 추가 필드는 없다.

### D4.project-envelope-a.envelope

출력 E(W)는 {schemaVersion:7,projectSeq:2,activeProjectId:"p1",projectOrder:["p1"],projects:{p1:{name:"기본 프로젝트",enabled:true,props:{connectionRef:"default",dataEnabled:true,automationEnabled:false},workspace:W}}}. 모든 기본 필드는 명시적으로 저장한다. W의 모든 JSON 키/값/순서 배열/unknown kind·unknown props는 보존한다. JSON object 키 순서는 동일성 판정에서 제외한다. 이 함수는 v5/v7 입력을 자동 이관하지 않는다.

### D5.project-envelope-a.catalog

새 ADDON 등록 없음. validateWorkspace는 기존 v6 검증과 연결할 주입 계약이며 이 범위에서는 가짜 제품 validator를 제공하지 않는다.

### D6.project-envelope-a.api

1. wrapWorkspaceJson(text, validateWorkspace) → envelope (동기): 먼저 text가 string이고 callback이 function인지 검사한다. 아니면 INVALID_ARGUMENT. JSON.parse가 실패하거나 reviver가 비유한 number를 발견하면 INVALID_JSON. 파싱 root가 null/array/non-object 또는 schemaVersion!==6이면 WORKSPACE_VERSION. callback에는 파싱값의 JSON deep clone을 1회 전달한다. callback이 true를 반환하면 원래 파싱값으로 E(W)를 반환한다. callback 오류는 원문을 노출하지 않고 WORKSPACE_INVALID. 입력 string 불변, 반환 root/W/배열은 매 호출마다 별개 객체다.
2. projectWorkspacePath(projectId) → string (동기): ProjectId 규칙 검사 실패면 INVALID_PROJECT_ID. 성공 문자열은 "projects/"+projectId+"/workspace"다. 추가 경로 인자/임의 segment를 받지 않으며 프로젝트 존재를 검사하지 않는다.
3. selectProject(root, projectId) → root (동기): root는 사전에 검증한 canonical v7 envelope라는 전제다. 실행 시 root가 non-null non-array object이고 schemaVersion===7이며 projects가 non-null non-array object인지 우선 검사, 실패는 ROOT_INVALID. 그 다음 projectId 규칙, projects의 own property 존재, 대상.enabled===true를 순서대로 검사한다. 오류는 각각 INVALID_PROJECT_ID/PROJECT_NOT_FOUND/PROJECT_DISABLED. 같은 activeProjectId면 원래 root 객체를 그대로 반환한다. 다르면 activeProjectId만 교체한 shallow root copy를 반환한다. projects/projectOrder/내부 W의 identity와 값은 그대로다. 입력 root나 대상 객체를 변경하지 않는다. 전체 root 의미 검증/정규화는 수행하지 않는다.

### D7.project-envelope-a.commands

wrap은 초기 변환만 수행하며 선택은 같은 root desired 명령 경로에 제공할 순수 변환이다. API 연결/저장은 후속 범위다. 세 함수는 ensure/update/remove를 호출하지 않으므로 모든 입력에서 lifecycle trace=[]이고 외부 request/STATE 파일 write=0이다.

### D8.project-envelope-a.equality

새 hash 함수 없음. JSON 결과 비교는 object 키 순서 무시/array 순서 유지/값과 타입 정확 비교다. select의 무변경은 object identity까지 동일해야 한다. wrap의 -0은 JSON number 0과 동일하게 취급한다. Infinity/NaN은 허용하지 않는다.

### D9.project-envelope-a.effective

select는 enabled=true 프로젝트만 선택한다. dataEnabled/automationEnabled 값을 변경하지 않는다. 선택으로 새 계좌 실행 허용을 만들지 않는다.

### D10.project-envelope-a.errors

오류 우선순위는 D6의 검사 순서다. 존재하지 않는 target과 잘못된 root가 동시에 있으면 ROOT_INVALID, target ID가 잘못되면 존재 검사 전에 INVALID_PROJECT_ID다. callback은 version/parse 검사 실패 시 호출 0회, 정상 파싱 v6에서 1회다. Promise callback 결과를 await하지 않는다. callback 반환값은 true 엄격 비교다.

### D11.project-envelope-a.vectors

독립 재구성 기준: W={schemaVersion:6,marker:"keep",opaque:{items:[{kind:"future",visible:false,props:{n:3}}]}}. 테스트의 accept callback은 true, reject callback은 false, mutate callback은 받은 clone의 marker="changed" 후 true다. 테스트 W는 opaque 보존 검사 입력이고 실제 v6 전체 schema fixture라고 주장하지 않는다.

| id | 입력/동작 | 기대 |
| --- | --- | --- |
| PEA1 | wrap(JSON.stringify(W),accept) | E(W), callback 1회, lifecycle=[] |
| PEA2 | wrap(JSON.stringify(W),mutate) | E(W), marker="keep", lifecycle=[] |
| PEA3 | wrap("{",accept) | INVALID_JSON, callback 0회 |
| PEA4 | wrap('{"schemaVersion":7}',accept) | WORKSPACE_VERSION, callback 0회 |
| PEA5 | wrap(JSON.stringify(W),reject) | WORKSPACE_INVALID, callback 1회 |
| PEA6 | path("p12") / path("p01") / path("p1/x") | "projects/p12/workspace" / INVALID_PROJECT_ID / INVALID_PROJECT_ID |
| PEA7 | select(E(W),"p1") | root identity 동일, lifecycle=[] |
| PEA8 | root=E(W)에 p2={name:"두 번째",enabled:true,props:{connectionRef:"default",dataEnabled:true,automationEnabled:false},workspace:W2}, projectSeq=3, projectOrder=["p1","p2"] 추가; select(root,"p2") | 새 root, activeProjectId="p2", projects/order/W identity 동일, 원 root.activeProjectId="p1" |
| PEA9 | PEA8의 p2.enabled=false; select(root,"p2") | PROJECT_DISABLED |
| PEA10 | select(E(W),"p9") | PROJECT_NOT_FOUND |
| PEA11 | wrap('{"schemaVersion":6,"n":1e999}',accept) | INVALID_JSON, callback 0회 |
| PEA12 | wrap(JSON.stringify(W),()=>Promise.resolve(true)) | WORKSPACE_INVALID, 동기 throw |

PEA8의 W2는 W를 deep clone한 값이다. 실제 canonical fixture 검사는 state/workspace.v6.fixture.json의 전체 내용을 accept로 E(W)에 넣어 v7 fixture와 비교하며 내용 손실 0을 요구한다. fixture 접근은 독립 검토 이후 테스트 실행에서만 한다.

### D12.project-envelope-a.cost

wrap은 JSON byte 수 B에 O(B) 시간/공간, callback 비용은 외부 검증 비용으로 별도다. select는 고정된 v7 root 필드 수에 O(1), 프로젝트 수/ADDON 수와 무관하며 전체 프로젝트 순회 0이다. path는 입력 ID 길이에 O(L). market tick에서 wrap 호출 금지. 재귀 전체 검사는 select에 추가하지 않는다.

### D13.project-envelope-a.files

제품: web/js/project-state.js. 테스트: tests/project-envelope-a.mjs. 기대값: tests/fixtures/project-envelope-a.contract.json. 독립 검토: tests/reference/project-envelope-a.t12-review.json. 명세 signature 정렬 순서는 wrapWorkspaceJson/projectWorkspacePath/selectProject이고 위 D6 문자열을 독립 재구성한다. PROJECT_SCHEMA=7은 constant이므로 signature 목록에서 제외한다.

### D14.project-envelope-a.open

구현 선택 사항 없음. 독립 검토에서 발견된 결함은 이 범위를 수정하고 재검토한다. 검토 전 PASS로 표시하지 않는다. r7 전체의 OPEN은 이 범위 완료와 별개다.

## D14.foundation-r7.review — 구현 전 남은 승인·검토

1. 해결: 2026-09-06 사용자 `예`로 B1~B5/B7/B13/B18 확장 승인 및 반영. 동일 좌표에 대한 재승인은 요청하지 않는다.
2. resource-types/reconciliation/command-journal/wire-profile/normalized-events 계약 작성 완료. 서술과 필드·경계 처리의 완전성은 독립 재구성으로 검토한다. 검토 전 OPEN을 닫거나 구현 완료로 판정하지 않는다.
3. canonical v7 fixture 작성 및 내부 v6 무손실 검증 완료. tests/fixtures/foundation-r7.contract.json에 14개 기대 시나리오 작성. fixture는 설계 자료이며 F01~F12의 실행 harness/전체 부하/장중 실증을 대체하지 않는다. 독립 T12와 비교기 미완료, --t12는 MISSING_REVIEW로 실패한다.

상기 항목이 남아 있으므로 이 실행 설계안은 완성/승인된 제품 명세가 아니다. 기존 realtime-foundation OPEN 1~4는 이 상세 항목과 연계 관리한다. 목표·순서·공식 wire 카탈로그·성능 측정 조건은 이번 설계 tranche 산출물이다.

## D1.project-envelope-b — v7 문서 검증 독립 범위

범위는 순수 validateProjectEnvelopeJson 1개다. 프로젝트 CRUD/UI/저장 큐/마이그레이션 파일 교체는 포함하지 않는다. 기존 reconcileV6는 값 보정 함수이므로 이 범위의 strict validator로 바로 사용하지 않는다. 기존 v6 의미 검증 책임은 주입 callback에 있고, validation이 보정한 문서를 성공값으로 반환하는 것은 금지한다. 독립 T12 전에는 제품 코드 착수 금지.

### D2.project-envelope-b.boundary

STATE web/js/project-state.js에 export 1개를 추가한다. 기존 A 함수의 공개 동작은 유지한다. 다른 모듈 import/ENGINE/BRIDGE/ADDON 변경 0. validator가 소유하는 I/O는 0이며 주입 callback의 외부 부작용까지 이 모듈이 보증하지 않는다. callback을 순수 검증 함수로 연결하는 책임은 composition caller에 있다.

### D3.project-envelope-b.types

호출은 validateProjectEnvelopeJson(text, validateWorkspace)→ValidationResult이며 동기다. validateWorkspace(workspaceClone,projectId)는 true만 합격, throw/false/Promise/다른 값은 실패다. 반환은 성공 {ok:true,value:parsedRoot}, 실패 {ok:false,code,path}. code/path는 문자열이고 path는 JSON Pointer, root는 빈 문자열이다. 공개 함수는 예상된 입력 오류를 throw하지 않는다. 반환 객체에 문서 원문/secret/stack을 넣지 않는다.

### D4.project-envelope-b.schema

root의 필수 키 집합은 schemaVersion/projectSeq/activeProjectId/projectOrder/projects이고 다른 키는 허용하지 않는다. schemaVersion=7. projectSeq는 2~Number.MAX_SAFE_INTEGER의 정수. activeProjectId는 A의 ProjectId. projectOrder는 1개 이상의 ProjectId 배열이며 중복 없음. projects는 non-null non-array object이고 own key 집합은 projectOrder와 정확히 같아야 한다. projectSeq는 모든 프로젝트 ID 숫자 부분보다 커야 한다. 순서 배열은 재정렬하지 않는다.

project의 키는 name/enabled/props/workspace로 정확히 고정한다. name은 string, trim 결과와 원문이 동일, Unicode code point 1~32개, NFKC→toLowerCase 비교키가 프로젝트 간 유일하다. case 변환은 locale 비의존이다. enabled는 boolean. props 키는 connectionRef/dataEnabled/automationEnabled로 고정한다. connectionRef는 [a-zA-Z0-9_-]{1,64}, 두 플래그는 boolean. workspace는 non-null non-array object, schemaVersion=6이며 내부 키/값은 검증 callback에 위임하고 모두 보존한다. enabled 프로젝트가 1개 이상이어야 하며 activeProjectId는 projects own key이고 enabled=true여야 한다.

unknown root/project/props 키는 삭제하지 않고 실패한다. unknown workspace 키/ADDON kind/props는 callback이 true이면 그대로 보존한다. v6 문서를 자동 wrap하지 않는다. root 키 집합이 유효하고 schemaVersion만 6이면 ROOT_VERSION이며, 일반 v6 workspace처럼 root 키 집합도 다르면 D10 우선순위에 따라 ROOT_KEYS다. 모든 기본값은 명시적이며 누락 값을 채우지 않는다. text의 중복 object key는 JSON.parse 표준 결과(마지막 값)를 사용한다. 중복 원문 key 탐지 parser는 이 범위가 아니다.

### D5.project-envelope-b.catalog

새 ADDON 0. 등록된 기능의 의미를 validator에 hardcode하지 않는다. v6 callback은 화면 catalog를 사용할 수 있지만 이 함수에는 catalog가 전달되지 않는다.

### D6.project-envelope-b.api

export function validateProjectEnvelopeJson(text, validateWorkspace). text가 string이고 callback이 function인지 먼저 검사하며 아니면 INVALID_ARGUMENT/path="". JSON.parse reviver로 모든 number의 Number.isFinite를 확인한다. 파싱/비유한 값 실패는 INVALID_JSON/path="". 파싱된 문서는 callback에 직접 전달하지 않는다. 반환 value는 원래 파싱 객체이고 매 호출 새 객체다. callback에는 해당 workspace의 JSON deep clone을 projectOrder 순서로 한 번씩 전달한다. callback의 수정은 반환 value에 반영하지 않는다.

### D7.project-envelope-b.algorithm

실패 첫 건만 반환한다. 구조 검사를 모두 통과하기 전 callback은 0회다. 검사 순서는 D10이다. 구조 검사 완료 뒤 projectOrder 순서로 callback을 실행하며 첫 실패에서 멈춘다. 모든 callback true인 경우만 성공. 정상 완료/모든 오류에서 함수가 수행하는 lifecycle=[] 및 파일 write/request=0이다.

### D8.project-envelope-b.equality

문서 값 비교는 A의 JSON 동등성 규칙을 유지한다. 추가 hash 없음. object 키 집합 검사에는 own keys만 사용한다. 오류 path의 key 부분은 ~→~0, /→~1로 escape한다. validation은 name/ID/키/배열/수치 값을 정규화해 저장하지 않는다.

### D9.project-envelope-b.effective

전역 enabled 수와 active 프로젝트 enabled를 검사할 뿐 data/automation 플래그에 따른 실행을 하지 않는다. 표시/매매 상태를 변경하지 않는다.

### D10.project-envelope-b.error-order

| 순서 | 조건 | code / path |
| --- | --- | --- |
| 1 | 인자 / 파싱 | D6의 INVALID_ARGUMENT 또는 INVALID_JSON / "" |
| 2 | root가 object 아님 | ROOT_TYPE / "" |
| 3 | root 키 집합 불일치 | ROOT_KEYS / "" |
| 4 | schemaVersion!==7 | ROOT_VERSION / /schemaVersion |
| 5 | projectSeq 타입/범위 | PROJECT_SEQ / /projectSeq |
| 6 | activeProjectId 형식 | PROJECT_ID / /activeProjectId |
| 7 | projectOrder가 비어 있거나 배열 아님 | PROJECT_ORDER / /projectOrder |
| 8 | projectOrder 각 값의 ID 형식 / 중복 (낮은 index부터) | PROJECT_ID 또는 PROJECT_DUPLICATE / /projectOrder/<index> |
| 9 | projects object 타입/own key 집합 불일치 | PROJECT_MEMBERS / /projects |
| 10 | projectSeq<=최대 ID 숫자 | PROJECT_SEQ / /projectSeq |
| 11 | projectOrder 순서의 각 project object/키 집합 | PROJECT_SHAPE / /projects/<id> |
| 12 | 그 project name 타입/trim/길이 / 앞서 검사한 name과 중복 | PROJECT_NAME 또는 PROJECT_NAME_DUPLICATE / /projects/<id>/name |
| 13 | 그 project enabled 타입 | PROJECT_ENABLED / /projects/<id>/enabled |
| 14 | 그 project props object/키 집합 | PROJECT_PROPS / /projects/<id>/props |
| 15 | 그 project connectionRef / dataEnabled / automationEnabled 순서 | CONNECTION_REF 또는 FLAG_TYPE / 해당 필드 path |
| 16 | 그 project workspace object/schemaVersion | WORKSPACE_VERSION / /projects/<id>/workspace |
| 17 | 모든 project 구조 검사가 끝난 뒤 enabled 수 0 | NO_ENABLED_PROJECT / /projects |
| 18 | active ID가 존재하지 않음 / disabled | ACTIVE_PROJECT / /activeProjectId |
| 19 | projectOrder 순서의 callback 첫 실패 | WORKSPACE_INVALID / /projects/<id>/workspace |

11~16은 각 project에 대해 전부 검사한 다음 다음 project로 진행한다. 누락 key와 다른 값 오류가 동시에 있으면 키 집합 오류가 먼저다. own key 순서는 실패 우선순위에 영향을 주지 않는다. callback이 Promise를 반환해도 await하지 않는다.

### D11.project-envelope-b.vectors

기본 입력 E는 A의 E(W), accept=true/reject=false/mutate는 clone marker 변경 후 true다. E2는 A PEA8의 두 enabled 프로젝트 문서다. 아래는 문서 clone에 변형을 적용하고 stringify해서 전달한다. callbackCalls는 전체 호출 횟수다. 모든 lifecycle=[]다.

| id | 입력 변형 | 기대 |
| --- | --- | --- |
| PEB1 | E/accept | ok:true, value=E, callbackCalls=1 |
| PEB2 | E/mutate | ok:true, value=E, 원문 marker 유지 |
| PEB3 | E에 root.extra=1 | ROOT_KEYS, "", callbackCalls=0 |
| PEB4 | E.projectOrder=["p1","p1"] | PROJECT_DUPLICATE, /projectOrder/1 |
| PEB5 | E2.projects.p2.name=E2.projects.p1.name | PROJECT_NAME_DUPLICATE, /projects/p2/name |
| PEB6 | E.projects.p1.enabled=false | NO_ENABLED_PROJECT, /projects |
| PEB7 | E2.activeProjectId="p2", p2.enabled=false | ACTIVE_PROJECT, /activeProjectId |
| PEB8 | E.projectSeq=1 | PROJECT_SEQ, /projectSeq |
| PEB9 | E2/ callback p1=true,p2=false | WORKSPACE_INVALID, /projects/p2/workspace, callbackCalls=2 |
| PEB10 | E.props의 connectionRef를 변경하는 대신 E.projects.p1.props.connectionRef="../x" | CONNECTION_REF, /projects/p1/props/connectionRef |
| PEB11 | E.projects.p1.workspace.opaque.items에 unknown kind/props 추가, accept | ok:true, 추가 값 그대로 보존 |
| PEB12 | E2.projectOrder=["p2","p1"], accept | ok:true, 순서 그대로, callback 순서 p2,p1 |
| PEB13 | E.projects.p1.props.dataEnabled="true" | FLAG_TYPE, /projects/p1/props/dataEnabled |
| PEB14 | E/ callback Promise.resolve(true) | WORKSPACE_INVALID, /projects/p1/workspace, callbackCalls=1 |

### D12.project-envelope-b.cost

파싱/clone은 전체 JSON byte B에 O(B), 프로젝트 집합/비교키 검사는 P개에 O(P), 추가 공간 O(B+P). callback 비용은 외부 비용이다. 부팅/import/명시 저장 검증에서만 호출하고 시장 tick이나 selectProject 안에서 호출하지 않는다. 전체 정렬은 필요하지 않다.

### D13.project-envelope-b.files

제품은 web/js/project-state.js, 테스트 tests/project-envelope-b.mjs, 기대값 tests/fixtures/project-envelope-b.contract.json, 독립 증거 tests/reference/project-envelope-b.t12-review.json. 기존 A의 검토된 범위 텍스트와 동작을 수정하지 않는다.

### D14.project-envelope-b.open

함수 1개 범위의 구현 선택 사항 없음. 독립 재구성 검토가 남아 있으며 통과 전 제품 코드 작성 금지. 실제 v6 strict validator 연결과 저장/CRUD는 별도 범위다.

## D7.project-storage.followup — 저장 연결 전 관측 결함과 결정 범위

관측: app.js patch는 먼저 st를 바꾸고 실패를 로그로만 남긴다. 부팅은 schemaVersion>6을 recovery로 보내며 root path로 v6 보정 patch를 저장한다. 따라서 v7 파일만 쓰면 현재 화면이 정상 부팅되지 않는다. 이 결함은 검증기 PASS로 해소됐다고 보지 않는다.

후속 계약에서는 (1) 현재 프로젝트 ID를 enqueue 전에 포착해 뒤늦은 쓰기가 다른 프로젝트로 가지 않을 것, (2) UI 성공 표시를 저장 ack와 구분할 것, (3) 실패 이후 큐의 재기준화/취소 결과를 정의할 것, (4) legacy 원문 백업 후 교체와 UI schema 전환을 함께 검증할 것, (5) 숨김/미등록 ADDON 원문을 유지할 것, (6) /api/node 및 store generic CRUD 계약은 그대로 유지할 것을 고정한다. 구체 공개 API/오류/trace는 아직 DRAFT이며 이 문단만으로 제품 구현하지 않는다.

## D1.project-commands-c — 프로젝트 desired 명령

범위는 생성/이름 변경/활성 변경/삭제의 순수 함수 4개. UI/API/파일 쓰기/실행 복원은 제외. 사전 검증한 v7 root만 입력한다. 저장 연결에 제공할 동일 desired 명령이다.

### D2.project-commands-c.boundary

STATE web/js/project-state.js만 제품 변경. import/ENGINE/ADDON/BRIDGE 변경 0. 기존 A/B 공개 동작 변경 0.

### D3.project-commands-c.types

root는 B validator를 통과한 v7 envelope라는 전제다. 실행 시 A select와 동일하게 root object/schemaVersion=7/projects object만 검사한다. 나머지 잘못된 root는 전제 위반이며 공개 오류 계약 밖이다. ProjectId는 B 규칙(끝 개행 포함 공백 금지). name은 B 규칙(원문 trim 일치, Unicode code point 1~32, NFKC 뒤 locale 비의존 소문자 비교키 유일). callback은 A의 v6 동기 검증 계약이다.

### D4.project-commands-c.schema

schema 변경 없음. canonical state/workspace.v7.fixture.json. 새 프로젝트는 name 인자, enabled=true, props={connectionRef:"default",dataEnabled:true,automationEnabled:false}, workspace는 A wrapWorkspaceJson의 무손실 결과. 새 ID=p+root.projectSeq, counter 1 증가, order 끝에 추가하고 active를 새 ID로 바꾼다. 생성 시 root.projectSeq가 MAX_SAFE_INTEGER이면 PROJECT_ID_EXHAUSTED. 삭제는 counter 감소/ID 재사용을 하지 않는다. 파일 이관은 하지 않는다.

### D5.project-commands-c.catalog

새 kind 없음. 프로젝트 명령은 내부 workspace/ADDON 의미를 검사하거나 보정하지 않는다. 생성 시 callback에 v6 검증을 위임한다.

### D6.project-commands-c.api

시그니처 순서와 반환은 다음과 같고 모두 동기다.
1. createProject(root, name, workspaceText, validateWorkspace) -> root
2. renameProject(root, projectId, name) -> root
3. setProjectEnabled(root, projectId, enabled) -> root
4. deleteProject(root, projectId) -> root

공통 root 검사 실패는 ROOT_INVALID. 대상 함수는 ID 형식 INVALID_PROJECT_ID, own key 존재 PROJECT_NOT_FOUND 순서. 오류는 A와 같은 ProjectStateError: name=ProjectStateError, code=message=코드 문자열, 추가 필드 없음.

### D7.project-commands-c.algorithm

create: root 검사, name 형식, projectOrder 순서 이름 중복 검사, counter 소진 검사, A wrapWorkspaceJson(workspaceText,validateWorkspace) 호출 순서. 이름 오류 PROJECT_NAME, 중복 PROJECT_NAME_DUPLICATE. wrap의 인자/JSON/WORKSPACE 오류를 그대로 전파한다. callback은 원래 A 계약대로 clone 하나만 받는다. 생성은 새 root/projects/order/project/workspace를 반환하고 기존 project 참조를 보존한다.
rename: root/대상 검사, name 형식, 자신을 제외한 이름 중복 검사. 같은 원문 이름이면 root identity 유지. 다르면 새 root/projects/대상 project로 name만 변경, workspace/props/order와 다른 project identity 유지.
setEnabled: root/대상 검사, enabled가 boolean 아니면 PROJECT_ENABLED. 같은 값이면 root identity 유지. false이면 projectOrder에서 대상 이외 enabled=true 첫 프로젝트를 찾는다. 없으면 LAST_ENABLED_PROJECT. 대상이 active이면 그 첫 enabled ID로 active를 변경한다. 대상이 active가 아니면 active 유지. true이면 active 유지. 새 root/projects/대상 project, 기존 props/workspace/order와 다른 project 참조 유지.
delete: root/대상 검사. projectOrder에서 대상 이외 enabled=true 첫 프로젝트를 찾고 없으면 LAST_ENABLED_PROJECT. 새 root/projects/order에서 대상만 제거. active 대상 삭제면 찾은 ID로 변경, 아니면 active 유지. 남은 project 참조 보존, counter 유지.

### D8.project-commands-c.equality

입력 root와 모든 하위 객체 변경 0. 이름을 trim/NFKC 처리한 값으로 저장하지 않는다. A의 JSON 값 동등성 사용. 삭제된 ID를 다시 발급하지 않으며 noop은 위 명시 두 경우 root identity까지 유지한다.

### D9.project-commands-c.effective

선택 변경은 기존 다른 프로젝트의 automationEnabled/dataEnabled를 변경하지 않는다. 신규 automationEnabled=false. 함수 자체는 자원/주문 실행 0. 비활성화/삭제의 실제 자원 해제는 후속 정상 diff 연결 책임이다.

### D10.project-commands-c.errors

검사는 D7 순서. 모든 함수 먼저 ROOT_INVALID, 대상 함수는 다음 INVALID_PROJECT_ID/PROJECT_NOT_FOUND. create는 name/중복/counter 검사가 callback보다 먼저. rename은 대상 존재가 name 검사보다 먼저. setEnabled는 타입 오류가 noop/마지막 활성 검사보다 먼저. delete는 없는 대상을 noop으로 처리하지 않는다. callback false/throw/Promise는 A의 WORKSPACE_INVALID이며 부분 생성/입력 변경 없음.

### D11.project-commands-c.vectors

W는 A의 W, E는 A의 E(W). E2는 E에 p2(name="Second", 나머지는 p1 clone), projectSeq=3, projectOrder=[p1,p2]를 추가한 값. 모든 성공/실패 lifecycle=[], request/write=0.

| id | 동작 | 기대 |
| --- | --- | --- |
| PCC1 | create E,"Second",JSON.stringify(W),accept | active=p2,seq=3,order=[p1,p2],p1 identity 유지,새 automation=false |
| PCC2 | create E,p1.name,JSON.stringify(W),accept | PROJECT_NAME_DUPLICATE, callback=0 |
| PCC3 | E.projectSeq=MAX_SAFE_INTEGER 후 create(E,"Second",JSON.stringify(W),accept) | PROJECT_ID_EXHAUSTED, callback=0 |
| PCC4 | create E,"Second",JSON.stringify(W),reject | WORKSPACE_INVALID, 입력 불변 |
| PCC5 | rename E,p1,p1.name | root identity 유지 |
| PCC6 | rename E,p1,"Renamed" | name만 변경, order/workspace/props identity 유지 |
| PCC7 | E2.p1.name="ＡBC" 후 rename p2,"abc" | PROJECT_NAME_DUPLICATE |
| PCC8 | setEnabled E,p1,false | LAST_ENABLED_PROJECT |
| PCC9 | setEnabled E2,p1,false | active=p2,p1.enabled=false,p2 identity 유지 |
| PCC10 | setEnabled E2,p2,true | root identity 유지 |
| PCC11 | delete E2,p1 | active=p2,order=[p2],seq=3,p2 identity 유지 |
| PCC12 | delete E,p1 | LAST_ENABLED_PROJECT |
| PCC13 | delete E2,p9 | PROJECT_NOT_FOUND |
| PCC14 | deleteProject(E2,"p2") 반환 root로 createProject(root,"Third",JSON.stringify(W),accept) | 새 ID=p3,seq=4,order=[p1,p3] |

### D12.project-commands-c.cost

명시 사용자 명령만 실행하며 tick 호출 금지. P=1/10/1000에 동일 알고리즘. 이름/활성 탐색 및 shallow projects/order copy O(P), 생성만 JSON byte B의 O(B) 추가. 기존 workspace deep clone 0, 생성 입력 workspace clone만 허용. noop setEnabled O(1); rename은 중복 검사 O(P). lifecycle operation 항상 0. callback 외부 비용 별도.

### D13.project-commands-c.files

제품 web/js/project-state.js, tests/project-commands-c.mjs, tests/fixtures/project-commands-c.contract.json, tests/reference/project-commands-c.t12-review.json. 검토 원문 snapshot은 기존 scoped gate와 동일. 독립 검토는 시그니처 4개와 PCC1~14의 기대를 재구성한다.

### D14.project-commands-c.open

설계 선택 사항 0. 독립 T12 통과 전 제품 코드 금지. 사용자 기존 순차 구현 승인 범위이며 저장/UI 계약은 여전히 별도.

## D14.project-commands-c.end

## D1.market-symbol-d — 시장코드와 종목명 수정
### D2.market-symbol-d.boundary
STATE deskspec의 코드 검증, ADDON addons/screens와 기존 REST adapter/data/main 조회 경로만 수정. ENGINE/BRIDGE/store 변경 0. 사용자 요청 범위. 주문 시장 라우팅 변경 없음.
### D3.market-symbol-d.types
조회 종목 문자열은 ASCII 숫자 6자리와 선택적 대문자 _AL 또는 _NX. UI trim 후 검사, 최대 9자. 입력/링크/복원/캔들 props/API stk_cd/파일 및 메모리 캐시 키까지 접미사 유지. 기존 6자 의미 유지. 코드에 경로 문자·소문자 접미사·추가 문자는 거부. 주문 API와 adapter.order는 기존 6자리만 허용하며 접미사를 잘라 주문하지 않는다.
### D4.market-symbol-d.state
schema 변경 없음. form.code 및 candle props.code의 허용 문자열만 확장. 이름은 runtime 응답으로만 표시하며 desired JSON에 저장하지 않는다. 기존 fixture 그대로 유효.
### D5.market-symbol-d.catalog
키움 공식 https://openapi.kiwoom.com/m/guide/apiguide?jobTpCode=07 및 Kiwoom-Securities/Kiwoom-REST-API 차트.md: KRX=6자리, NXT=_NX, SOR=_AL. 모의 도메인 KRX만 지원. adapter candles/quote는 모의 환경 접미사 요청을 네트워크 호출 전 KiwoomError('모의투자는 KRX만 지원합니다. NXT/SOR 조회는 실서버 연결이 필요합니다.')로 거부. 실서버는 stk_cd 원문 전송. 시간은 기존 KST 변환만 사용, 08~20시 가상 봉 생성/강제 시간 이동 없음.
### D6.market-symbol-d.api
renderLegend(host, form, catalog, patch, document, nameOf = () => '') -> undefined (동기). 기본 label은 `${code || '종목 없음'} · ${tf || ''} · ${id}`, nameOf(code,tf)의 비어 있지 않은 문자열이 있으면 `${name} · `를 앞에 붙인다. nameOf는 runtime에서 정규화된 이름 string만 반환한다.
기존 candles/quote 시그니처 유지. quote 결과에 name:string 추가: stk_nm이 string이면 trim, 없거나 다른 타입이면 빈 문자열. 주문 _symbol 검사는 6자리 그대로, 조회만 시장코드 별도 검사. /api/bars 입력 및 data cache 검증은 확장 문자열 허용. quote 화면은 응답 name 필드를 기존 표에 표시.
### D7.market-symbol-d.flow
차트 공유 feed pull은 bars/signals 조회 뒤 동일 전체 code로 quote 조회 추가. quote.name을 data.name으로 제공, 실패하면 빈 문자열. 이름 실패는 bars를 폐기하지 않는다. 이름은 기존 feed 생명주기/32 idle eviction에 귀속, 새 영속 저장소 없음. callback에서 기존 draw 뒤 legend 재표시. renderLegend의 기존 5개 인자는 유지하고 선택적 6번째 nameOf(code,tf) callback을 추가(기본 빈 이름). 각 legend label은 name이 있으면 '이름 · 기존 코드 · 주기 · ID', 없으면 기존 label. DOM textContent만 사용. 서로 다른 코드의 늦은 응답은 해당 feed key에만 귀속. quote 화면도 응답 시 현재 code 일치 및 unmount 안 됨을 확인 후 표를 갱신한다.
### D8.market-symbol-d.equality
6자리/_AL/_NX는 서로 다른 data key. 이름 표시만으로 STATE write/series lifecycle 변경 없음. UI 입력은 Enter 또는 change로 확정, 미완성 입력은 이전 코드 복원.
### D9.market-symbol-d.effective
연결 모드·계좌 설정 자동 변경 0, 주문 전송 테스트 0. 모의 환경 미지원 조회는 KRX로 fallback하지 않는다.
### D10.market-symbol-d.errors
잘못된 조회 코드: 기존 invalid code 오류. 올바른 접미사+모의: D5 명시 오류. API bars는 기존 error 필드/quote는 기존 HTTP 오류 경로 사용. 이름 누락/조회 실패: 종목코드만 표시, 기존 candle 데이터 유지.
### D11.market-symbol-d.vectors
MSD1: 005930_AL/000660_NX 입력·링크·복원·props 접미사 보존.
MSD2: 동일 base 6자리/_AL/_NX cache path 서로 다름, ../ 및 잘못된 접미사 거부.
MSD3: 실서버 adapter candles/quote stk_cd 원문 전송, quote stk_nm -> name.
MSD4: 모의 접미사 조회는 네트워크 0, D5 오류.
MSD5: 접미사 주문은 네트워크 0, 기존 Invalid stock code 오류.
MSD6: legend name callback의 종목명+전체 코드 표시, 빈 이름은 기존 label, selection/STATE write 0.
MSD7: quote 응답 후 코드 변경/unmount이면 오래된 표 갱신 0.
### D12.market-symbol-d.cost
기존 활성 feed마다 pull당 quote 최대 1회 추가. 종목명 조회가 전체 등록 프로젝트를 순회하지 않음. 신규 WSS/성능 보장 완료 주장 금지. 현재 REST 유량 제한 재사용.
### D13.market-symbol-d.files
app/main.py, app/data.py, app/kiwoom.py, web/js/deskspec.js, web/js/addons.js, web/js/screens/{chart,chart-selection,quote,order}.js. 기존 tests/test_kiwoom_rest.py 및 tests/market-symbol-d.mjs에 검증 추가. README/todo 기록.
### D14.market-symbol-d.open
결정 사항 0, 독립 T12 후 사용자 요청에 따라 구현. 실서버 credentials 전환과 실제 NXT 다운로드 실증은 이번 코드 수정과 별개.
