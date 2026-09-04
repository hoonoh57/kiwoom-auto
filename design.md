# design.md — Multi-VD Workspace Blueprint v6

```text
설계 상태 : DRAFT
대상 버전 : schemaVersion 6
OPEN      : 0
승인 범위 : 없음 — T12와 사용자 APPROVED 전 제품 코드 수정 금지
```

이 문서는 현재 코드를 정당화하는 기록이 아니다. 목표 동작을 먼저 고정하고 현재 구현과의 차이를 `todo.md`의 remediation으로 관리한다. 경쟁 제품에서 채택한 UX 원칙은 고정 화면 슬롯, 한 번의 화면 전환, 화면별 창 배치 보존, 화면 간 종목연동, 전체 화면 검색이다. 브라우저가 보장하지 못하는 운영체제 항상 위와 네이티브 다중 모니터 제어는 D1의 비범위로 고정한다.

### D1.v6.revision-baseline

이 설계는 기존 schemaVersion 5 설계의 개정판이다. 기존에 승인·구현된 다종목 캔들 `code/tf/overlay/pane/scaleId/compareMode` 계약은 D3.v6.candle-source, D5.v6.candles-compare, D11.v6.candle-traces로 승계한다. v5의 동적 VD ID·order·중복 가능한 표시 이름만 v6 고정 슬롯 계약으로 대체한다. v6가 APPROVED되기 전에는 v5 제품 코드와 실제 workspace를 변경하지 않는다.

## D1 — 범위와 비범위

### D1.v6.scope

만들 것:

1. `vd1`~`vd8`의 고정 슬롯과 슬롯 활성화·초기화·고유 표시 이름.
2. 클릭과 `Ctrl+1`~`Ctrl+8` 전환, `Ctrl+K` 명령 팔레트.
3. VD별 자식폼 배치, 전체 VD 폼, z-order, 이동·크기·최소화·최대화.
4. 종목연동 범위 `vd|all`, 폼별 `follow|pin`, 공유그룹 `all|1..10`.
5. 전체 화면 탐색기, 폼 검색·VD 이동·포커스, 슬롯별 폼 수와 오류 표시.
6. 빈 슬롯으로 VD 복제, 이름이 있는 레이아웃 저장·복원·삭제, 1단계 되돌리기.
7. workspace 패키지 JSON 내보내기·가져오기와 v5→v6 마이그레이션.
8. 8px 프레임 스냅, 신뢰된 포인터 입력만 z-order 변경.
9. 차트 사용자 범위 변경만 `barSpacing`에 기록하여 자기발진 제거.
10. 차트 데이터 LRU warm cache 32개와 다종목 캔들 비교 기능 유지.

### D1.v6.nonscope

만들지 않을 것:

1. 9번째 VD와 런타임 VD ID 생성.
2. 브라우저 창을 벗어난 네이티브 독립창, 운영체제 항상 위, 모니터별 좌표 복원.
3. 증권사 서버 저장화면 번호 0950~0999와 키움 서버 동기화.
4. 외부 클라우드 계정, 원격 백업, 계정 간 충돌 병합.
5. 여러 브라우저 탭의 동시 편집 잠금과 실시간 공동 편집.
6. 키움 HTS 외형의 픽셀 단위 복제.

### D1.v6.observed-gaps

관측된 v5 코드는 동적 VD 생성·삭제·이름변경을 허용하고 `order`와 ID 숫자를 함께 사용한다. 이 때문에 ID는 고유해도 이름이 중복되고 버튼 번호가 건너뛴다. `desk.js`의 일부 desired 계산과 종목연동, 해시, recorder는 기존 D7~D11 계약과 다르다. `chart.js`에는 프로그램 적용이 다시 `barSpacing` 저장을 부르는 경로가 남아 있다. 모두 목표 설계가 아닌 remediation 대상이다.

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

`app/store.py`는 JSON 경로 CRUD만 제공한다. `web/js/app.js`는 desired-state 입력과 관측 출력만 담당한다. VD 정책·링크 정책·snapshot 변환은 `deskspec.js`의 순수 함수가 계산하고 `desk.js`는 결과 item 집합을 generic diff로 반영한다. `frame.js`는 VD·화면번호·종목·screen kind를 해석하지 않는다. Screen Add-on은 자기 content host와 자기 feature 데이터만 소유한다.

### D2.v6.no-cross-axis

| 기능 의미 | 유일 소유축 | 금지 위치 |
|---|---|---|
| VD 슬롯·라벨·링크·snapshot 스키마 | STATE | ENGINE, ADDON, BRIDGE의 feature 분기 |
| 폼 desired/live 집합 차이 | BRIDGE | UI, STATE serializer, ENGINE |
| chart·quote·order·log 의미 | ADDON | ENGINE, BRIDGE |
| DOM frame·차트 primitive·스냅 수학 | ENGINE | ADDON 재구현, STATE |

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
| `z` | string[] | 예 | 이 VD가 소유한 폼 ID, 바닥→위, 중복 없음 |

라벨 비교키는 `trim()` 후 `normalize('NFKC')` 후 ASCII `A..Z`만 `a..z`로 바꾼 문자열이다. 8개 슬롯의 비교키는 활성 여부와 관계없이 모두 고유하다. 빈 문자열은 오류다.

### D3.v6.form-fields

| 필드 | 타입 | 필수 | 기본값·범위 | 불변성 |
|---|---|---:|---|---|
| `id` | `fN` | 키 | 전역 유일, N>=1 | 생성 후 불변 |
| `screen` | string | 예 | 등록 kind | 생성 후 불변 |
| `vd` | `vd1..vd8` | 예 | 생성 시 activeVd | 이동 시 변경 |
| `allVd` | boolean | 예 | false | 변경 가능 |
| `visible` | boolean | 예 | true | 변경 가능 |
| `title` | string/null | 예 | null | 변경 가능 |
| `code` | 6자리 ASCII 숫자/null | 예 | kind 기본값 | 변경 가능 |
| `tf` | string/null | 예 | kind 기본값 | 변경 가능 |
| `link` | enum | 예 | `follow`, `pin` | 변경 가능 |
| `shareGroup` | enum | 예 | `all`, 문자열 `1`..`10` | 변경 가능 |
| `rect` | integer rect | 예 | kind defRect | 변경 가능 |
| `winState` | enum | 예 | `normal|min|max` | 변경 가능 |
| `prevRect` | integer rect | 예 | 최초 rect | 변경 가능 |
| `body` | object | 예 | Add-on defaultBody | 변경 가능 |

### D3.v6.snapshot-fields

`snapshots.sN`은 `{name,activeVd,symLink,layout,vds,forms}`다. `name`은 라벨 비교키와 같은 규칙을 적용한 1..32 code point이며 snapshot 안의 `vds`와 `forms`는 D3의 스키마를 따른다. `seq`, `snapshots`, `undo`는 snapshot 내부에 들어가지 않는다. `undo`는 `{reason,snapshot}`이며 reason은 `resetVd|restoreSnapshot|importWorkspace`다.

### D3.v6.candle-source

chart의 각 `candles` item은 `code`, `tf`, `placement=overlay|pane`, `paneId`, `scaleId=auto|right|left|compare`, `compareMode=price|percent|indexed100`, `baseTime`, `baseValue`를 소유한다. null code/tf는 form 값을 상속한다. 원가격 자동축은 첫 item right, 둘째 left, 셋째부터 compare다. percent와 indexed100은 compare 축을 공유한다. pane은 item 전용 pane의 right 축을 쓴다.

## D4 — STATE 스키마·fixture·마이그레이션

### D4.v6.canonical

정식 예시는 `state/workspace.v6.fixture.json`이다. 객체의 영속 출력 키 순서는 root에서 `schemaVersion,globalOn,activeVd,symLink,layout,seq,vds,forms,snapshots,undo`, VD에서 `slot,label,enabled,z`, form에서 D3 표 순서 중 `id`를 제외한 순서다. JSON은 UTF-8, LF, 들여쓰기 2칸, 파일 끝 newline 1개다.

### D4.v6.migration-v5

1. `schemaVersion=5` 원본을 `state/workspace.v5.bak`에 복사한다. 파일이 있으면 덮어쓰지 않는다.
2. 기존 VD를 `(order 정수 오름차순, idNum(id) 오름차순, id UTF-16 오름차순)`으로 정렬한다. 8개 초과면 `VdLimitError(8,count)`로 부팅을 중단한다.
3. 정렬된 VD를 차례로 `vd1..vdN`에 대응하고 모든 form.vd를 같은 대응표로 바꾼다. 나머지 슬롯은 비활성으로 생성한다.
4. 기존 label은 trim한 값이 유효하고 비교키가 앞선 슬롯과 다를 때 보존한다. 빈 값·8 code point 초과·중복이면 대상 slot 숫자부터 증가시켜 처음 사용되지 않은 숫자 문자열을 쓴다. 빈 슬롯도 같은 숫자 선택 규칙을 쓴다.
5. 각 `z`는 그 슬롯 소유 form만 남기고 첫 출현을 보존한다. 누락 form은 idNum, ID 순으로 말단에 붙인다. 다른 슬롯에 복제된 ID는 제거한다.
6. `enabled=true`는 마이그레이션된 기존 VD, false는 빈 슬롯이다. form이 없는 기존 VD도 true다.
7. activeVd는 대응된 기존 activeVd를 사용하고 없으면 가장 낮은 enabled 슬롯을 사용한다.
8. form 기본 누락값은 D3 값으로 채운다. `seq.form`은 기존 값과 `max form N + 1` 중 큰 값이다. `seq.snapshot=1`, `snapshots={}`, `undo=null`을 넣고 `order`를 제거한다.
9. 전체 검증이 통과한 메모리 객체에만 `schemaVersion=6`을 기록하고 단일 파일 교체로 저장한다. 실패하면 v5 원본을 유지하고 부팅을 중단한다.

### D4.v6.write-queue

UI write는 `patch(path,body)` 한 경로로만 간다. STATE의 `impactOfPatch(before,path,body)`가 D7 change-set을 먼저 만들고, 로컬 desired 반영과 change-set render 예약 뒤 직렬 queue가 서버 PATCH를 호출한다. 한 animation frame 안의 change-set은 ID 합집합, `scope > delta`, `rebuild > raise > keep` 우선순위로 합친다. 실패 시 `[PATCH-FAIL] path message`를 bus에 기록하고 다음 write를 계속한다. snapshot 복원·VD 초기화·import는 누락 키에 `ds.DEL`을 넣은 하나의 root patch로 제출한다.

## D5 — kind 카탈로그와 feature 계약

### D5.v6.screen-contract

```js
register(kind, {
  no, label, keywords, single, needCode, needTf, defRect, minSize,
  defaultBody(ctx), reconcileBody(body, ctx),
  ensure(ctx, id, props), update(ctx, handle, prev, next), remove(ctx, handle)
})
```

초기 kind는 `chart(0615)`, `quote(0101)`, `order(8949)`, `log(1001)`다. `chart|quote|order`는 `needCode=true`, chart만 `needTf=true`, 네 kind 모두 `single=false`다. 계약 필드 누락은 `ScreenContractError(kind,field)`이고 해당 폼만 error 상태가 된다.

### D5.v6.chart-range

chart Add-on은 chart host의 trusted `wheel` 또는 trusted primary `pointerdown`에서 `rangeUserPending=true`로 둔다. range callback은 이 값이 false면 write 0이다. true이면 기존 800ms debounce를 재시작한다. 만료 시 engine barSpacing과 STATE 값 차이가 `0.01` 초과일 때 한 번 patch하고, 차이와 무관하게 false로 되돌린다. Add-on이 `setBarSpacing`으로 만든 callback은 trusted 입력 표식이 없으므로 STATE를 쓰지 않는다. `scrollToRealTime()`은 명시적 “실시간” 버튼 명령에서만 호출한다.

### D5.v6.market-cache

chart의 marketData capability는 key `code|tf`별 `{bars,refCount,useSeq,unsubscribe}`를 가진다. acquire는 useSeq를 단조 증가시키고 refCount를 올린다. release는 refCount를 내리고 0이면 unsubscribe를 한 번 실행하되 bars를 보존한다. refCount 0 entry가 32개를 넘으면 `(useSeq,key)` 오름차순 첫 entry를 제거한다. 각 bars는 최신 1200개를 보존한다. cache는 live handle과 desired 상태를 저장하지 않는다.

### D5.v6.candles-compare

`candles` Add-on은 item 한 개만 normalize한다. price는 OHLC를 보존한다. percent는 각 X에 `(X/baseValue-1)*100`, indexed100은 `(X/baseValue)*100`을 적용한다. baseValue가 null이면 baseTime 이상 최초 bar close를 한 번 STATE에 기록한다. bar 없음 또는 baseValue<=0은 `CandleDataError(itemId)`이며 다른 item operation은 0이다.

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
```

각 handle primitive는 O(1)이며 create는 frame DOM 1개와 content host 1개를 할당한다. destroy 후 호출은 `InvalidFrameHandle(id)`다. `snapRect`는 입력을 변경하지 않고 새 rect 1개만 할당한다. candidate의 left/right를 bounds와 peer의 left/right에, top/bottom을 bounds와 peer의 top/bottom에 비교한다. 축별 절대 이동량이 threshold 이하인 후보 중 `(절대 이동량, 목표 좌표, left 또는 top 우선)` 순 첫 값을 택한다. x와 y는 독립 계산하며 크기는 바꾸지 않는다. peerRects는 ID 오름차순으로 전달한다.

### D6.v6.chart-api

`web/js/core.js`는 chart, pane, series, priceScale, timeScale, marker, priceLine 생성·수정·삭제 primitive만 공개한다. 모든 단일-handle 호출은 O(1), setData는 bar 수 M에 O(M), update는 O(1)이다. Core는 code, VD, screen kind, 비교 모드를 받지 않는다. left와 right price scale 표시 여부는 전달된 generic option만 반영한다.

### D6.v6.time-random

제품 모듈은 현재 시간과 난수를 직접 호출하지 않는다. debounce scheduler는 `{set(fn,ms),clear(token)}` capability, 파일 교체 suffix는 persistence가 주입한 monotonic integer를 사용한다. ID는 STATE seq만 사용한다.

## D7 — Bridge diff·명령 알고리즘

### D7.v6.desired-diff

```text
changeSet = {
  mode: initial|delta|scope,
  ids: form ID의 중복 없는 배열,
  order: {mode:keep|raise|rebuild,id:null|formId}
}
initial: 모든 form ID를 idNum, ID 오름차순으로 계산
delta: 전달된 ids만 idNum, ID 오름차순으로 계산
scope: 전역·activeVd·slot 변화가 실제 영향을 주는 ID만 idNum, ID 오름차순으로 계산
각 id의 wanted = D9 formEffective
wanted=false && live 있음: live.delete 후 remove
wanted=true && live 없음: ensure
wanted=true && live 있음 && kind 변경: live.delete 후 remove old, ensure new
wanted=true && live 있음 && propsHash 변경: update
적용 순서 = ID별 remove/ensure/update -> order
```

live authority는 `Map<formId,{kind,propsHash,frame,addonHandle,geoHash,zIdx,error}>` 하나다. update 대상도 `(idNum,ID)` 오름차순이다. unmount와 destroy 전에 Map에서 delete한다. 예외는 해당 단계 `[DESK!]` 로그만 남기고 다음 ID로 진행한다. geometry hash는 `{rect,winState}`만 포함하며 z 변경은 setFrameZ만 호출한다.

`impactOfPatch` 규칙은 다음으로 고정한다. `forms/fN` 또는 root body의 forms.fN만 바뀌면 delta ids는 해당 ID다. activeVd 변경은 이전·다음 VD의 non-allVd ID다. globalOn 변경은 모든 form ID다. `vds/vdN/enabled` 변경은 그 VD 소유 ID다. rect·body·code 같은 form 내부 변경은 해당 ID다. root replace·migration·snapshot restore·import는 scope ids=이전 forms와 다음 forms의 합집합, order=rebuild다. z의 말단 raise는 delta ids=[], order=raise와 target ID다. 그 밖의 z 배열 교체는 order=rebuild다.

### D7.v6.z-list

active VD의 `z`에서 유효한 non-allVd 폼을 첫 출현 순으로 놓는다. 이어 enabled VD의 allVd 폼을 `(owner slot, owner z index, idNum, ID)` 오름차순으로 놓는다. 목록 index가 zIdx다. 일반 폼 1개 raise는 owner z에서 제거 후 말단에 추가한다. allVd raise는 owner z에서 같은 연산을 한다. focus callback은 `e.isTrusted===true`인 pointerdown만 raise한다.

order=raise는 target frame에 현재 live 최대 zIdx+1만 setFrameZ하고 target.zIdx만 바꾼다. order=rebuild는 zList 전체를 순회해 index가 다른 handle만 setFrameZ한다. keep은 setFrameZ 0이다. 최대 zIdx가 1,000,000을 넘은 다음 raise는 rebuild로 승격해 0..N-1로 재번호한다.

### D7.v6.symbol-link

source code는 항상 source에 쓴다. source.link가 pin이면 종료한다. follow이면 target을 `(idNum,ID)` 순회한다. target 조건은 등록 kind의 needCode=true, target.link=follow, target.shareGroup=source.shareGroup이다. `symLink=all`이면 enabled VD 전체, `symLink=vd`이면 target.vd=source.vd인 폼만 쓴다. allVd도 소유 vd로 판정한다. 하나의 root patch로 source와 targets를 갱신한다.

### D7.v6.slot-commands

- `activateSlot(N)`: disabled면 enabled=true로 만든 뒤 activeVd를 vdN으로 쓴다.
- `addVd()`: 가장 낮은 disabled slot을 activate한다. 없으면 `[VD+] 상한 도달`만 기록한다.
- `renameVd(id,label)`: D3 비교키가 다른 7개와 충돌하면 write 0, `[VD~] 중복 이름 label`을 기록하고 modal을 유지한다.
- `resetVd(id)`: enabled 슬롯이 1개면 거부한다. 확인 뒤 undo를 현재 snapshot으로 설정하고 소유 폼을 삭제하며 enabled=false, label을 고유한 숫자로 정규화, z=[]로 만든다. active면 가장 낮은 enabled slot로 전환한다.
- `cloneVd(source,target)`: source enabled, target disabled일 때만 실행한다. source z 순서의 소유 form을 새 fN으로 복제하고 target vd, allVd=false로 바꾼다. target을 enabled·active로 만들고 z를 새 ID 순서로 설정한다.

reset label 숫자는 target slot부터 증가시켜 7개 비교키와 처음 충돌하지 않는 문자열이다.

### D7.v6.navigator

`listForms(st,deskSnapshot,query)`는 enabled slot 오름차순, owner z index, idNum, ID 순이다. 검색 문자열과 `screen no|screen label|title|code|form id|VD label`을 D3 비교키로 비교해 부분 포함인 행만 남긴다. 행 선택은 owner slot을 활성화하고 form을 raise한다. allVd 행은 현재 slot을 유지하고 form만 raise한다. status는 `error > hidden > mounted > inactive` 우선순위다. 슬롯 badge는 소유 form 중 visible 개수이며 error가 하나 이상이면 red dot 1개를 표시한다.

### D7.v6.snapshot-import

- save: 현재 active 영역을 깊은 JSON 복사해 새 sN에 저장한다. 이름 비교키 중복은 거부한다.
- restore: 현재 상태를 undo에 저장하고 snapshot의 active 영역으로 root patch를 만든다. seq.form은 현재 값과 복원 form 최대 N+1 중 큰 값, seq.snapshot과 snapshots는 보존한다.
- undo: undo.snapshot을 restore하되 새 undo를 만들지 않고 undo=null로 쓴다.
- export: `{format:'kiwoom-auto-workspace',version:1,state}`를 생성하며 state.undo=null이다.
- import: format/version과 D3/D4를 전부 검증한 후 diff 요약 modal을 표시한다. 확인하면 현재 상태를 undo에 저장하고 imported active 영역·snapshots를 적용한다. seq 두 값은 현재 값과 import의 값과 import 최대 ID+1 중 큰 값이다.

## D8 — propsHash 정규화

### D8.v6.canonical-hash

객체 키는 UTF-16 code unit 오름차순으로 재귀 정렬하고 배열 순서는 보존한다. null은 보존, -0은 0으로 바꾼다. undefined, function, symbol, bigint, NaN, Infinity는 `CanonicalValueError(path)`다. number는 ECMAScript JSON number 표현, string은 `JSON.stringify` escape를 사용한다. 공백 없는 UTF-8 bytes에 FNV-1a 32-bit를 적용하고 소문자 8자리 hex로 출력한다.

고정 벡터:

```text
{"rect":{"h":100,"w":100,"x":0,"y":0},"screenProps":{"code":"005930"},"winState":"normal"} -> f741e72b
{"rect":{"h":100,"w":100,"x":8,"y":0},"screenProps":{"code":"005930"},"winState":"normal"} -> 0c36dde3
```

## D9 — effective 계산식

### D9.v6.form-series

```text
slotEnabled     = st.vds[form.vd].enabled === true
formEffective   = st.globalOn && slotEnabled && form.visible &&
                  (form.allVd || form.vd === st.activeVd)
seriesEffective = formEffective && item.enabled && item.visible
```

min 폼은 formEffective=true를 유지하고 content만 숨긴다. disabled slot은 form을 소유할 수 없으므로 reconcile에서 오류다. 비활성 VD 일반 폼은 remove되고 재활성화는 fresh ensure와 같은 경로를 쓴다.

## D10 — 경계·오류 처리 표

### D10.v6.boundaries

| 입력 조건 | 결과 | write/log |
|---|---|---|
| label 빈 값 또는 8 code point 초과 | modal 유지 | write 0, `[VD~] 잘못된 이름` |
| label 비교키 중복 | modal 유지 | write 0, `[VD~] 중복 이름 label` |
| 8 slot 모두 enabled에서 add | 상태 유지 | write 0, `[VD+] 상한 도달` |
| 마지막 enabled slot reset | 거부 | write 0, `[VD-] 마지막 가상화면` |
| reset 확인 취소 | 상태 유지 | write 0, `[VD-] 취소 id` |
| activeVd가 없거나 disabled | 가장 낮은 enabled slot | reconcile PATCH 1 |
| VD key/slot 불일치 | 부팅 중단 `VdSchemaError` | 서버 write 0 |
| disabled VD가 form 소유 | 부팅 중단 `DisabledVdOwnsForm` | 서버 write 0 |
| z의 없는 ID·타 VD ID·중복 | 제거, 소유 누락 form 말단 추가 | reconcile PATCH 1 |
| 미등록 screen | STATE 보존, error frame | 다른 폼 operation 0 |
| rect 밖 | minSize 후 title 32px 노출 위치로 clamp | 해당 form update 1 |
| unmount/destroy 예외 | live에서 이미 삭제, 다음 ID 진행 | `[DESK!] stage id error` |
| untrusted pointerdown | focus/raise 무시 | write 0 |
| 프로그램 range callback | 무시 | write 0 |
| snapshot 이름 중복 | modal 유지 | write 0 |
| clone target enabled | 거부 `CloneTargetNotEmpty` | write 0 |
| import parse/schema 오류 | modal에 첫 error path 표시 | write 0 |
| import 확인 취소 | 상태 유지 | write 0, `[IMPORT] 취소` |
| server PATCH 실패 | 로컬 상태 유지, queue 계속 | `[PATCH-FAIL]` |
| 같은 STATE 두 번 apply | 두 번째 lifecycle 변화 없음 | operation 0 |

## D11 — 골든 trace

### D11.v6.arch-traces

event는 `{seq,op,id,kind,propsHash}`다. P1 hash=`f741e72b`, P1-next=`0c36dde3`을 쓴다.

```text
T1  f1 ON              ensure f1 chart f741e72b
T2  f1..f1000 ON       ensure 1000개, idNum 오름차순, operation 종류 ensure 하나
T3  f500 OFF           remove f500만
T4  f500 ON            ensure f500만
T5  global OFF/ON      remove 1000개 내림차순 / ensure 1000개 오름차순
T6  saved fresh apply  동일 입력 fresh trace와 동일
T7  같은 STATE 2회     두 번째 []
T8  f1 rect 변경       update f1 chart 0c36dde3
T9  N=1/10/1000        ensure 횟수만 1/10/1000
T10 신규 kind 등록     ENGINE/BRIDGE/STATE diff 0
T11 f1 변경 touch      touch 1
```

### D11.v6.ux-traces

```text
U1 disabled vd5 클릭   PATCH vds/vd5 enabled=true + activeVd=vd5; desk diff는 vd5/allVd desired만
U2 VD 이름 중복        STATE write 0; desk operation 0
U3 vd2 reset           undo 1개 + vd2 owned remove만; 다른 VD owned operation 0
U4 vd1->vd3 전환       vd1 일반 remove, vd3 일반 ensure, allVd update/remove/ensure 0, z만 setFrameZ
U5 follow group 3      같은 scope/group/follow/needCode target만 code update
U6 pin source 변경     source code update 1, target update 0
U7 clone vd1->vd6      source 폼 수 K개의 새 fN, source handle operation 0
U8 navigator f20 선택  owner 활성화 후 f20 raise 1
U9 frame 포인터 focus  trusted=true일 때 z patch 1, false일 때 0
U10 program range      STATE write 0
U11 user wheel range   debounce 뒤 barSpacing write 최대 1
U12 snapshot restore   undo 생성과 root patch 1; desk는 실제 delta item만 operation
U13 import 취소        STATE write 0; desk operation 0
```

### D11.v6.candle-traces

```text
C1 c1 005930 overlay price right ensure propsHash=61581144
C2 c2 000660 overlay indexed100 compare ensure propsHash=0ec095d6
C3 c2 code=035720 update c2 propsHash=295232e7; c1 operation 0
C4 c2 pane 이동 remove c2 후 ensure c2; c1 operation 0
C5 같은 STATE 재적용 []
```

## D12 — 성능 예산

### D12.v6.budgets

| N | 최초 ensure | 같은 STATE | item 1개 변경 | 임시 할당 상한 |
|---:|---:|---:|---:|---:|
| 1 | 1 | 0 | 1 | desired record 1 + operation 1 |
| 10 | 10 | 0 | 1 | desired record 10 + operation 10 |
| 1000 | 1000 | 0 | 1 | desired record 1000 + operation 1000 |

initial과 root scope apply는 O(N), delta apply는 O(Δ)다. lifecycle operation도 O(Δ)다. z raise는 setFrameZ 1회, Add-on resize 0회, z 재계산 0회다. VD 전환은 나가는 일반 폼 수+들어오는 일반 폼 수에 비례한다. allVd handle 생성·삭제·update는 0이다. navigator 검색은 form 수 N에 O(N), 결과 record N개 이하를 할당한다. market cache는 active key 수+inactive 32개이고 key당 bar 1200개 이하다. debounce timer는 chart form당 1개 이하다.

## D13 — 명명·배치·공개 API

### D13.v6.files

```text
web/js/deskspec.js       v6 schema, reconcile, migration, slot/link/snapshot 순수 계산 (STATE)
web/js/desk.js           generic form desired/live diff와 recorder (BRIDGE)
web/js/frame.js          frame DOM과 snapRect primitive (ENGINE)
web/js/screens.js        screen 등록부
web/js/screens/chart.js  chart screen, range gate, market cache 사용 (ADDON)
web/js/screens/quote.js  quote screen (ADDON)
web/js/screens/order.js  order screen (ADDON)
web/js/screens/log.js    log screen (ADDON)
web/js/runtime.js        chart item generic diff (BRIDGE)
web/js/addons.js         chart item translator (ADDON)
web/js/core.js           chart primitive (ENGINE)
web/js/app.js            modal·탐색기·명령 팔레트 desired input/UI
app/store.py             generic JSON persistence
state/workspace.v6.fixture.json  D4 canonical fixture
tests/fixtures/desk-traces.v6.json D11 recorder fixture
```

### D13.v6.public-signatures

```js
// STATE
defaultStateV6()
reconcileV6(raw)
migrateV5(raw)
labelKey(value)
validateVdLabel(st,id,value)
impactOfPatch(before,path,body)
effectiveForms(st)
zList(st)
symbolPatch(st,sourceId,code,screenCatalog)
activateSlotPatch(st,slot)
resetVdPatch(st,id)
cloneVdPatch(st,sourceId,targetId)
saveSnapshotPatch(st,name)
restoreSnapshotPatch(st,snapshotId)
undoPatch(st)
exportWorkspace(st)
importWorkspacePatch(st,pkg)
listForms(st,deskSnapshot,query,screenCatalog)

// BRIDGE
createDesk({host,state,catalog,frame,patch,log,recorder}) -> {apply(changeSet),mounted,snapshot,destroy}
createRuntime({core,registry,recorder}) -> {apply,mounted,snapshot,destroy}

// ENGINE
createFrame(host,id,rect,on) -> FrameHandle
snapRect(candidate,bounds,peerRects,threshold) -> rect

// UI
openNavigator()
openCommandPalette()
askText(title,value,maxLen,validate)
askOk(title,yesLabel)
```

모든 공개 함수와 test는 `// Design: D...` 또는 test 이름의 `[D...]`로 설계 ID를 참조한다. Screen kind 추가는 `screens/<kind>.js`와 `screens.js` 등록 한 줄만 바꾼다. ENGINE·BRIDGE·STATE generic diff에는 kind 이름 분기를 추가하지 않는다.

### D13.v6.implementation-order

구현 순서는 고정한다.

```text
Gate 0     T12 독립 검토 -> REVIEWED -> 사용자 APPROVED
Tranche 1  STATE v6·마이그레이션                  D3, D4, D7.slot-commands
Tranche 2  BRIDGE desired/diff/hash/recorder       D7.desired-diff, D8, D9
Tranche 3  ENGINE frame·trusted focus·snapRect     D6.frame-api, D7.z-list
Tranche 4  ADDON chart range gate·market cache     D5.chart-range, D5.market-cache
Tranche 5  UI 고정 슬롯·고유 이름·종목연동        D7.slot-commands, D7.symbol-link
Tranche 6  UI 탐색기·복제·snapshot·undo·입출력    D7.navigator, D7.snapshot-import
Tranche 7  전체 trace·브라우저 acceptance          D10, D11, D12
```

각 tranche는 표에 적힌 설계 ID만 수정하고 해당 테스트가 green인 상태에서 끝낸다. 다음 tranche는 직전 tranche 커밋·push 뒤 시작한다. 같은 tranche에서 두 축의 제품 코드를 동시에 수정하지 않는다. Tranche 1의 STATE 변환 결과를 고정한 뒤 Tranche 2가 소비하고, Tranche 2의 generic Bridge 계약을 고정한 뒤 Tranche 3과 4가 각 축에서 구현한다.

## D14 — OPEN QUESTIONS

없음.

T12 독립 검토가 끝나기 전 상태는 DRAFT다. T12의 공개 시그니처와 trace가 D6/D11/D13과 전부 일치하면 REVIEWED로 바꾸고, 그 다음 사용자 `APPROVED`만 해당 설계 범위의 제품 코드 착수를 허용한다.
