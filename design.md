# design.md — 8개 가상화면과 자식폼 설계

상태: APPROVED (2026-09-05 사용자 승인)
대상 스키마: schemaVersion 5 (현재 실행 코드와 STATE = 4)
OPEN QUESTIONS: 0
승인 범위: D3.chart.candle-source, D3.chart.placement, D5.candles.compare,
D7.chart.data-diff, D11.trace.multi-symbol-candles 구현 허용.

## 조사 근거

공식 키움 영웅문4 도움말을 2026-09-04에 확인했다.

| 확인 사실 | 설계 반영 | 출처 |
|---|---|---|
| 가상화면은 HTS가 별도 창처럼 취급하는 논리 공간이다. | VD는 폼 배치와 전환 상태를 소유한다. | https://download.kiwoom.com/hero4_help_new/qa24.htm |
| 우측 상단 선택란과 `Ctrl+번호`로 전환한다. | 상단에 1~8 고정 아이콘과 `Ctrl+1`~`Ctrl+8`을 둔다. | 동일 |
| 가상화면마다 서로 다른 화면을 배치한다. | 자식폼은 소속 VD와 배치 좌표를 가진다. | 동일 |
| 종목연동은 모든 가상화면 또는 현재 가상화면 두 모드다. | `symLink = all | vd`로 저장한다. | 동일 |
| 현재 VD 모드는 이벤트 화면이 속한 VD의 열린 화면만 바꾼다. | 연동 범위는 이벤트 발생 폼의 `vd`로 계산한다. | 동일 |
| 화면에는 중복생성, 종목코드연계, 공유그룹 속성이 있다. | 폼별 `link`, `shareGroup`; kind별 `single` 계약으로 분리한다. | https://download.kiwoom.com/hero4_help_new/hero100/qa06.htm |
| 한 화면을 8개 VD의 동일 위치에 표시할 수 있다. | `allVd=true` 폼 하나를 복제 없이 모든 VD에 투영한다. | 동일 |
| 타이틀바에는 공유그룹, 화면번호, 화면명이 표시된다. | 프레임 타이틀은 `[번호] 이름`과 공유그룹을 표시한다. | 동일 |
| 화면번호 입력과 화면검색으로 화면을 연다. | 번호·이름·키워드 검색으로 활성 VD에 폼을 만든다. | https://download.kiwoom.com/hero4_help_new/0203.htm |
| 저장화면은 가상화면별 화면 목록을 보존한다. | schema 5가 VD별 z-order와 폼 배치를 영속화한다. | https://download.kiwoom.com/hero4_help_new/p004.htm |

독립실행, 항상 위, 저장화면 0950~0999 생성 기능은 이번 범위에서 제외한다.

## D1 — 범위와 비범위

### D1.vd.scope

만들 것: 상단 `1 2 3 4 5 6 7 8` 고정 VD 아이콘, 클릭/`Ctrl+1`~`Ctrl+8` 전환, VD별 자식폼 생성·닫기·최소화·최대화·이동·크기·z-order, 모든 VD 동일 좌표 표시, 화면검색, 전체/현재 VD 종목연동, 폼별 종목연계 고정, schema 4→5 마이그레이션.

만들지 않을 것: 9번째 VD, VD 추가·삭제·이름변경, 운영체제 독립창, 다중 모니터 최대화, 항상 위, 사용자 저장화면 번호 0950~0999, 키움 외형의 픽셀 단위 복제.

### D1.current.observation

현재 `app.js`는 차트 ENGINE/BRIDGE 인스턴스를 하나만 만들고 `profiles/{vd}|{code}|{tf}`를 사용한다. `deskspec.js`는 앱에 연결되지 않은 schema 5 초안이며 VD 무제한 규칙이 이번 요구와 충돌한다. 이는 목표 설계가 아니라 remediation 대상 관측 사실이다.

## D2 — 계층 매핑

### D2.layer.map

```text
STATE  state/workspace.json, web/js/deskspec.js
  -> DESK BRIDGE  web/js/desk.js
  -> SCREEN ADDON web/js/screens/<kind>.js
  -> FRAME ENGINE web/js/frame.js

chart screen 내부:
STATE form.body.items -> web/js/runtime.js(BRIDGE)
  -> web/js/addons.js(ADDON) -> web/js/core.js(ENGINE)
```

`app/store.py`는 JSON 경로 CRUD만 수행한다. `desk.js`는 screen 이름별 분기를 두지 않는다. `frame.js`는 종목·차트·주문 의미를 모른다. Screen Add-on은 프레임, z-order, 영속화, 다른 Add-on 상태를 직접 다루지 않는다.

## D3 — item 모델

### D3.form.fields

| 필드 | 타입 | 기본값/범위 | 불변성 |
|---|---|---|---|
| `id` | `f` + 양의 정수 | 전역 유일 | 생성 후 불변 |
| `screen` | 등록 kind | 필수 | 생성 후 불변 |
| `vd` | `vd1`~`vd8` | 활성 VD | 이동 시 변경 |
| `allVd`, `visible` | boolean | false, true | 변경 가능 |
| `title` | string/null | null | 변경 가능 |
| `code` | 6자리 문자열/null | kind 계약 | 변경 가능 |
| `tf` | 허용 주기/null | kind 계약 | 변경 가능 |
| `link` | `follow|pin` | follow | 변경 가능 |
| `shareGroup` | `all|1..10` | all | 변경 가능 |
| `rect` | `{x,y,w,h}` 정수 | kind 기본 크기 | 변경 가능 |
| `winState` | `normal|min|max` | normal | 변경 가능 |
| `prevRect` | rect | 최초 rect | 변경 가능 |
| `body` | JSON object | Add-on 기본값 | 변경 가능 |

### D3.chart.candle-source

chart 폼의 각 `candles` item은 자식폼의 공통 종목을 복사하지 않고 자기 데이터 원본과 표시 방식을 소유한다.

| props 필드 | 타입 | 기본값/범위 | 의미 |
|---|---|---|---|
| `code` | 6자리 문자열/null | null | null이면 form.code를 상속, 값이 있으면 해당 종목 사용 |
| `tf` | 허용 주기/null | null | null이면 form.tf를 상속 |
| `placement` | `overlay|pane` | overlay | 메인 pane 중첩 또는 독립 서브차트 |
| `paneId` | 문자열 | main | overlay 대상 또는 독립 pane 식별자 |
| `scaleId` | `auto|right|left|compare` | auto | 자동 축 배정 또는 명시 축 선택 |
| `compareMode` | `price|percent|indexed100` | price | 원가격, 기준 대비 %, 기준값 100 |
| `baseTime` | Unix 초/null | null | percent/indexed100의 기준 시각 |
| `baseValue` | 양수/null | null | 기준 시각에서 확정된 종가 |

`code`와 `tf`의 상속은 기존 STATE 마이그레이션에만 사용한다. 신규 캔들 선택 시 UI는 종목코드·주기·표시·비교 설정 폼을 열고, 6자리 종목코드 검증과 사용자의 `추가` 확정 전에는 STATE를 쓰지 않는다. 첫 기본 캔들은 `right` 축, 이후 추가 캔들은 `auto` 축을 기본값으로 사용한다. 생성 후에도 속성 트리에서 각 값을 독립적으로 변경할 수 있다.

### D3.chart.placement

- `overlay + price`: `scaleId=auto`이면 같은 kind·pane의 표시 순서에 따라 첫 캔들은 `right`, 두 번째는 `left`, 세 번째부터는 눈금 없는 `compare` 공유 축을 사용한다. Lightweight Charts가 가시 가격축을 left/right 두 개만 제공하기 때문이다.
- `overlay + percent|indexed100`: `scaleId=auto`이면 모든 비교 series가 `compare` scale을 공유한다.
- `pane`: item 전용 pane을 만들고 그 pane의 `right` scale을 사용한다.
- 세 종목 이상을 읽을 수 있는 공통 눈금으로 비교하려면 `percent|indexed100`을 선택하고, 원가격 눈금이 필요하면 `pane`을 선택한다.
- 한 chart 폼 안의 모든 series는 하나의 time scale을 공유한다. 서로 다른 tf는 허용하지만 빈 시각은 각 series의 whitespace로 남긴다.

### D3.vd.fields

VD는 정확히 `vd1`~`vd8`이다. 각 VD는 `{label, order, z}`를 가지며 label은 `1`~`8`, order는 `0`~`7`, z는 바닥→최상단 폼 ID 배열이다. `allVd=true` 폼은 소속 VD의 z에 한 번만 존재한다.

## D4 — STATE 스키마와 마이그레이션

### D4.schema.root

```json
{
  "schemaVersion": 5, "globalOn": true, "activeVd": "vd1", "symLink": "vd",
  "layout": { "sidebarW": 300 }, "seq": { "form": 1 },
  "vds": {
    "vd1":{"label":"1","order":0,"z":["f1"]}, "vd2":{"label":"2","order":1,"z":[]},
    "vd3":{"label":"3","order":2,"z":[]}, "vd4":{"label":"4","order":3,"z":[]},
    "vd5":{"label":"5","order":4,"z":[]}, "vd6":{"label":"6","order":5,"z":[]},
    "vd7":{"label":"7","order":6,"z":[]}, "vd8":{"label":"8","order":7,"z":[]}
  },
  "forms": {
    "f1": {"screen":"chart","vd":"vd1","allVd":false,"visible":true,
      "title":null,"code":"005930","tf":"1m","link":"follow","shareGroup":"all",
      "rect":{"x":12,"y":12,"w":820,"h":520},"winState":"normal",
      "prevRect":{"x":12,"y":12,"w":820,"h":520},
      "body":{"panes":[],"items":{},"order":[],"view":{},"ui":{}}}
  }
}
```

canonical fixture는 `state/workspace.v5.fixture.json`에 둔다.

### D4.migration.v4-v5

1. 원본을 `state/workspace.v4.bak`로 복사하며 기존 백업은 덮어쓰지 않는다.
2. `vd1`~`vd8`을 생성하고 기존 VD 1~4를 같은 번호에 대응한다.
3. `profiles/{vd|code|tf}`를 키 오름차순으로 순회한다.
4. `items`가 없거나 비어 있는 profile은 폐기하고 개수를 로그에 기록한다.
5. 나머지는 `f1`부터 chart 폼으로 변환하고 profile 전체를 `body`로 이동한다.
6. 유효한 `active.vd`는 유지하고 아니면 `vd1`을 사용한다.
7. `profiles`, `active`를 제거하고 schemaVersion을 마지막에 5로 기록한다.
8. 저장 실패 시 원본을 유지하고 부팅을 중단한다.

## D5 — kind 카탈로그

### D5.screen.contract

```js
register(kind, {
  no, label, keywords, single, needCode, needTf, defRect, minSize,
  defaultBody(ctx), reconcileBody(body, ctx),
  ensure(ctx, id, props), update(ctx, handle, prev, next), remove(ctx, handle)
})
```

초기 kind는 `chart(0615 키움미니차트)`, `quote(0101 키움현재가)`, `order(8949 주식미니주문)`, `log(0900 로그)`다. 번호는 전역 유일한 4자리 문자열이다. chart/quote/order는 needCode=true, chart만 needTf=true, 모두 single=false다.

Add-on은 자기 content host만 소유한다. ensure는 handle 하나를 반환하고 update/remove는 한 폼만 처리한다. 계약 오류는 `ScreenContractError(kind, field)`로 전달하고 Bridge는 해당 폼만 오류 상태로 표시한다.

### D5.candles.compare

`candles` Add-on은 item 하나의 `code/tf/placement/paneId/scaleId/compareMode/baseTime/baseValue`만 해석한다. 데이터 요청은 주입된 `marketData.getBars({code,tf})` capability로 수행하며 Core나 Bridge가 종목 코드를 해석하지 않는다.

`price` 모드는 OHLC를 그대로 전달한다. `percent`와 `indexed100`은 `baseValue`가 양수일 때만 series를 생성한다. baseValue가 없으면 `baseTime` 이상인 최초 bar의 close를 확정하여 STATE에 한 번 기록한 뒤 적용한다. 다른 item의 bar나 live handle을 참조하지 않는다.

```text
price      : O'=O, H'=H, L'=L, C'=C
percent    : X'=(X/baseValue-1)*100
indexed100 : X'=(X/baseValue)*100
```

변환은 각 bar의 O/H/L/C 모두에 동일하게 적용한다. 데이터가 없거나 baseValue가 0 이하이면 해당 item만 `CandleDataError` 상태가 되며 다른 item lifecycle을 건드리지 않는다.

## D6 — Core primitive

### D6.frame.api

```text
createFrame(host, id, rect) -> FrameHandle
setFrameRect(handle, rect) -> void
setFrameZ(handle, zIndex) -> void
setFrameVisible(handle, boolean) -> void
setFrameTitle(handle, text, shareGroup) -> void
setFrameState(handle, normal|min|max, bounds) -> void
getContentHost(handle) -> HTMLElement
destroyFrame(handle) -> void
```

호출은 O(1), 폼당 frame 하나와 content host 하나를 할당한다. rect는 정수이며 w/h는 minSize 이상이다. 파괴된 handle 호출은 `InvalidFrameHandle` 오류다. `web/js/core.js`는 chart/series/pane/priceLine/markers primitive만 제공하며 feature 분기를 갖지 않는다.

차트 primitive는 `rightPriceScale`과 `leftPriceScale`을 모두 표시 가능 상태로 만들지만 어느 series가 어느 축을 쓰는지는 결정하지 않는다.

## D7 — Bridge diff 알고리즘

### D7.desk.diff

```text
desired = forms 중 globalOn && visible && (allVd || vd == activeVd)
removeIds = live - desired, id 내림차순
ensureIds = desired - live, id 오름차순
updateIds = desired ∩ live 중 propsHash 변경, id 오름차순
remove -> ensure -> update -> z-order 순서로 적용
```

live authority는 `Map<formId,{kind,propsHash,frame,addonHandle}>` 하나다. VD 전환도 같은 diff를 호출한다. allVd 폼은 활성 VD 일반 폼 뒤에 놓고, 여러 개면 소속 VD order와 form id 오름차순으로 쌓는다.

### D7.link.diff

이벤트 폼이 `link=pin`이면 자기 code만 바꾼다. `follow`이면 같은 shareGroup, link=follow, needCode=true인 폼 중 `symLink=all`은 전체 VD, `symLink=vd`는 이벤트 폼의 소속 VD만 갱신한다. allVd 폼도 소속 vd로 범위를 판정한다.

### D7.chart.data-diff

series Bridge의 desired item에는 `{id,kind,enabled,visible,props,order}`만 들어간다. `code/tf` 변경은 해당 item의 propsHash만 바꾸며 그 item에만 update를 발생시킨다. placement 또는 paneId 변경은 해당 item의 기존 primitive를 remove한 뒤 동일 ID를 새 pane에 ensure한다. scaleId 또는 compareMode 변경은 해당 item update만 발생시킨다.

Bridge는 활성 item을 order 순서로 순회하며 `kind|rawPaneId`별 0 기반 `axisSlot`만 계산해 Add-on `normalize`에 전달한다. 축 이름과 비교 방식의 의미는 해석하지 않는다. chart Screen Add-on의 pane 목록 계산과 pane 삭제 판정은 series Add-on `normalize` 결과를 사용한다.

같은 `{code,tf}`를 사용하는 여러 item의 네트워크 응답 캐시는 generic marketData adapter가 공유할 수 있지만 캐시는 desired authority가 아니며 item lifecycle을 소유하지 않는다.

## D8 — propsHash 정규화

### D8.hash.canonical

객체 키는 UTF-16 코드 단위 오름차순으로 재귀 정렬하고 배열 순서는 보존한다. `undefined`, 함수, `NaN`, 무한대는 오류다. null은 보존하고 -0은 0으로 바꾼다. ECMAScript `JSON.stringify`의 공백 없는 UTF-8 결과에 FNV-1a 32-bit를 적용해 소문자 8자리 hex로 출력한다.

## D9 — effective 계산식

### D9.effective.form-series

```text
formEffective = globalOn && form.visible && (form.allVd || form.vd == activeVd)
seriesEffective = formEffective && item.enabled && item.visible
```

최소화 폼은 live를 유지하고 content만 숨긴다. 비활성 VD 일반 폼은 remove된다. 재활성화 때 정상 ensure 경로만 사용한다.

## D10 — 경계와 오류 처리

| 입력 | 정확한 결과 |
|---|---|
| activeVd가 범위 밖 | vd1로 정규화 후 PATCH |
| VD 키 누락/추가 | 정확히 vd1~vd8로 정규화 후 PATCH |
| 미등록 screen | STATE 보존, 해당 폼 오류 표시, 자동 삭제 금지 |
| 중복 화면번호 | 부팅 실패 `DuplicateScreenNo` |
| rect가 캔버스 밖 | minSize 적용 후 타이틀바 32px가 보이게 이동 |
| 한 VD에서 max가 둘 이상 | z 최상단만 max, 나머지는 prevRect normal |
| z의 없는 form id | 제거 |
| 일반 폼이 소속 VD z에 없음 | z 말단에 추가 |
| 동일 STATE 재적용 | lifecycle operation 0 |
| 저장 실패 | 메모리 STATE 미커밋, 오류 표시 |

## D11 — 골든 trace

`H(x)`는 D8의 실제 8자리 propsHash이며 fixture에서는 실제 값으로 고정한다.

```text
T1 f1 ON                 [{op:ensure,id:f1,kind:chart,propsHash:H(f1)}]
T2 f1..f1000 ON          ensure 1000개, id 오름차순
T3 f500 visible=false    [{op:remove,id:f500,kind:chart,propsHash:H(f500)}]
T4 f500 다시 true        [{op:ensure,id:f500,kind:chart,propsHash:H(f500)}]
T5 global OFF/ON         remove 1000개 내림차순 / ensure 1000개 오름차순
T6 saved STATE fresh/apply 두 trace 동일
T7 동일 STATE 두 번째 apply []
T8 f500 rect 변경        [{op:update,id:f500,kind:chart,propsHash:H(f500-next)}]
T9 N=1/10/1000           ensure 횟수만 1/10/1000
T10 신규 kind 등록       ENGINE/BRIDGE/STATE diff 0
T11 f500 변경            touch count 1
```

폼 내부 series도 같은 T1~T11 규칙을 `runtime.js`에 적용한다.

### D11.trace.multi-symbol-candles

```text
C0 캔들 추가 설정 취소    operation 0, STATE write 0
C1 candles1(005930,overlay,price,right) 추가
   [{op:ensure,id:candles1,kind:candles,propsHash:H(c1)}]
C2 candles2(000660,overlay,indexed100,compare) 추가
   [{op:ensure,id:candles2,kind:candles,propsHash:H(c2)}]
C3 candles2 code를 035720으로 변경
   [{op:update,id:candles2,kind:candles,propsHash:H(c2-next)}]
   candles1 operation은 0
C4 candles2 placement를 pane, paneId를 compare2로 변경
   [{op:remove,id:candles2,kind:candles,propsHash:H(c2-next)},
    {op:ensure,id:candles2,kind:candles,propsHash:H(c2-pane)}]
C5 동일 STATE 재적용 []
```

## D12 — 성능 예산

| N | 최초 ensure | 동일 STATE 재적용 | 폼 1개 변경 | 할당 상한 |
|---:|---:|---:|---:|---:|
| 1 | 1 | 0 | 1 | 폼당 frame 1 + handle 1 |
| 10 | 10 | 0 | 1 | 폼당 동일 |
| 1000 | 1000 | 0 | 1 | 폼당 동일 |

활성 VD 폼 20개, 전체 100개에서 동일 STATE `applyDesk`는 개발 기준 PC에서 50ms 미만이고 lifecycle ops는 0이어야 한다.

## D13 — 명명·배치와 공개 경계

```text
web/js/deskspec.js       schema 5 기본값·정규화·마이그레이션(STATE)
web/js/desk.js           폼 diff·종목연동(BRIDGE)
web/js/frame.js          자식폼 DOM primitive(ENGINE)
web/js/screens.js        screen 등록부
web/js/screens/chart.js  chart screen ADDON
web/js/screens/quote.js  quote screen ADDON
web/js/screens/order.js  order screen ADDON
web/js/screens/log.js    log screen ADDON
web/js/runtime.js        chart series BRIDGE
web/js/addons.js         chart series ADDON
web/js/core.js           chart primitive ENGINE
app/store.py             generic JSON persistence
```

Screen 추가는 `screens/<kind>.js`와 `screens.js` 등록 1줄만 변경한다. desk/frame/deskspec/store에는 screen 이름 분기를 추가하지 않는다. 공개 함수는 `// Design: D...` 주석을 가진다.

## D14 — OPEN QUESTIONS

없음.

전체 저장소 게이트의 잔여는 `state/workspace.v5.fixture.json`, `tests/fixtures/desk-traces.json`, check.py의 `--static/--semantic/--recorder/--t12` 계약과 독립 검토자 T12다. 다종목 캔들 범위는 2026-09-05 사용자가 명시적으로 승인했으며 C1~C5는 `tests/multisymbol-candles.mjs`로 검증한다. 이 범위 밖의 미승인 제품 코드는 금지한다.
