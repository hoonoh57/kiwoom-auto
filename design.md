# design.md — 8개 가상화면과 자식폼 설계

상태: DRAFT
대상 스키마: schemaVersion 5 (현재 실행 코드와 STATE = 4)
OPEN QUESTIONS: 0
승인 범위: 없음. C1 산출물과 T12가 미완료이므로 제품 코드 수정 금지.

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

다음 게이트 산출물은 아직 없다: `state/workspace.v5.fixture.json`, `tests/fixtures/desk-traces.json`, check.py의 `--static/--semantic/--recorder/--t12` 계약, 독립 검토자 T12 결과. 따라서 상태는 DRAFT다. 산출물과 T12 완료 후 REVIEWED, 사용자 승인 후 APPROVED로 바꾼다.
