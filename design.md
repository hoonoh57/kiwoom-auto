# design.md — 구현 명세 / 설계도

상태: DRAFT (A2.5 미승인)
대상 스키마: schemaVersion 5 (현재 코드 = 4)
복구 권위 아님. 세션 복구는 rules.md + todo.md 2개만 읽는다(A0).

---

## 0. 이 문서의 범위

가상 데스크(VD)와 자식폼(child form)을 도입하여, 키움 영웅문4의 가상화면 모델을
4축 + 애드온 구조로 재정의한다. 차트는 자식폼의 한 종류(screen kind)로 격하된다.

이 tranche에서 코드는 쓰지 않는다. 승인 후 구현 tranche로 넘어간다.

---

## 1. 조사 근거 (키움 영웅문4)

출처와 확인 사실만 적는다. 추정은 [추정]으로 표기한다.

| 사실 | 출처 |
|---|---|
| 가상화면은 물리 화면이 아닌 논리 공간. 총 8개 | download.kiwoom.com/hero4_help_new/qa24.htm |
| 우측 상단 가상화면 선택란 클릭 또는 Ctrl+1~8로 전환 | 동일 |
| 종목연동 모드 2종: "모든 가상화면에 종목연동" / "현재 가상화면에만 종목연동" (기능→종합환경설정→기타환경) | 동일 |
| 자식폼은 화면번호로 식별([0101] 키움현재가, [0615] 키움미니차트, [8949] 주식미니주문) | 동일 |
| 화면검색: 화면번호 직접 입력 또는 화면명/키워드 검색 | hero4_help_new/p003.htm |
| 저장화면 번호대 0950~0999, 자동 부여 또는 사용자 지정 | hero4_help_new/p004.htm |
| 자식폼 타이틀바 우클릭 → "모든 가상화면에 보이기"(단축키 V). 한 폼이 8개 VD에 동시 표시 | soms1.com 정리글 |
| 종료 시 모든 가상화면의 화면 저장 옵션 존재 | htsw_help/kiwoom_fx/k001.html |

핵심 시사점: **가상화면은 종목을 소유하지 않는다.** 종목은 자식폼이 소유하고,
VD는 연동 정책과 폼 배치만 소유한다. 현재 구현(`VD1=삼성전자`)은 이 모델과 불일치한다.

---

## 2. 현재 코드 관측 (schemaVersion 4, 커밋 d6b4d38)

증거 기반 사실만 적는다.

```
window축 키       profiles/{vd}|{code}|{tf}          → VD가 종목을 소유(불일치)
engine/runtime    app.js 모듈 전역 싱글턴 1개         → 폼 N개 수용 불가
screen 개념        없음
geometry          panes[].h(px) + view.barSpacing만   → 폼 rect/winState 없음
서버              store.py 경로 트리, kind 무지        → A1.4 준수. 변경 불필요
오염 레코드        items 0 / main h 776 인 키 8개      → 구버전 잔재, 마이그레이션 대상
```

---

## 3. D1 — 4축 좌표 재정의

축의 개수와 이름은 유지한다. 각 축의 **소유물**만 교정한다.

```
project   전역        경로: ""
vds       VD 목록/순서 경로: "vds"
vd        VD 1개      경로: "vds/{vdId}"
window    자식폼 1개   경로: "forms/{formId}"
```

`forms`를 VD 하위가 아니라 **평면(flat)으로 둔다.** 이유: 한 폼이 여러 VD에 보이는
"모든 가상화면에 보이기"를 폼 복제 없이 표현하기 위함이다. 복제하면 동일 상태가
2곳에 저장되어 A1.4(desired state 단일 출처)를 깬다.

### D1.1 project

```json
{
  "schemaVersion": 5,
  "globalOn": true,
  "activeVd": "vd1",
  "symLink": "vd",            // "all" | "vd"  (키움 종목연동 2모드)
  "layout": { "sidebarW": 300 },
  "seq": { "form": 12 }        // formId 발급 카운터
}
```

### D1.2 vds / vd

```json
"vds": {
  "vd1": { "label": "1", "order": 0, "z": ["f1","f3"] },
  "vd2": { "label": "2", "order": 1, "z": ["f2"] }
}
```

`z`는 해당 VD에서의 자식폼 z-order다. 배열 순서가 곧 쌓임 순서이고 마지막이 최상단이다.
`allVd: true` 폼은 `z`에 없어도 렌더된다(reconcile이 말단에 편입). VD 개수 상한은 두지 않는다.
키움은 8개 고정이지만 우리는 동적 추가를 요구사항으로 받았다.

### D1.3 window (자식폼)

```json
"forms": {
  "f1": {
    "screen": "chart",                  // screen kind (D3 카탈로그의 kind)
    "vd": "vd1",                        // 소속 VD (allVd=true면 표시엔 무영향)
    "allVd": false,
    "title": null,                      // null이면 카탈로그 label 사용
    "code": "005930",
    "tf": "1m",
    "rect": { "x": 12, "y": 12, "w": 820, "h": 520 },
    "winState": "normal",               // "normal" | "min" | "max"
    "prevRect": { "x": 12, "y": 12, "w": 820, "h": 520 },
    "body": { }                          // screen kind가 소유하는 상태 (D4)
  }
}
```

`body`의 내부 구조는 **core/bridge가 해석하지 않는다.** screen addon만 해석한다(D2).

---

## 4. D2 — 계층과 의존 방향

```
STATE(JSON store) -> DESK BRIDGE -> SCREEN ADDON -> (CHART BRIDGE -> SERIES ADDON -> ENGINE)
```

2단 중첩 구조다. 상위 diff는 폼 단위, 하위 diff는 시리즈 단위이며 **동일한 3연산 계약**
(`ensure/update/remove`)을 쓴다. 서로의 내부를 보지 않는다.

파일 배치와 계층 대응:

```
app/store.py        STATE       경로 트리 CRUD. kind/폼/축 개념 무지. (변경 없음)
app/main.py         전송        /api/node 3개 + 시세/주문. (변경 없음)
web/js/deskspec.js  STATE 스펙  project/vds/vd/window 기본값·reconcile·마이그레이션
web/js/desk.js      BRIDGE      폼 diff(ensure/update/remove) + z-order + geometry 반영
web/js/screens.js   ADDON 등록  screen kind 레지스트리 (화면번호·label·mount 계약)
web/js/screens/*.js ADDON 구현  chart.js, quote.js, order.js ... (kind 1개 = 파일 1개)
web/js/frame.js     ENGINE      자식폼 DOM primitive(타이틀바·드래그·리사이즈·min/max)
web/js/core.js      ENGINE      LWC primitive (변경 없음)
web/js/runtime.js   CHART BRIDGE 시리즈 diff (변경 없음)
web/js/addons.js    SERIES ADDON (변경 없음)
web/js/statespec.js → deskspec.js의 window.body 스펙으로 흡수(파일 유지, 역할 축소)
```

금지 사항 재확인: `desk.js`와 `frame.js`에 `if (screen === 'chart')` 형태의 분기를
두지 않는다. `store.py`에 form/vd/screen 이름을 넣지 않는다.

---

## 5. D3 — screen kind 등록 계약 (단일 등록부)

`screens.js` 한 블록에서만 등록한다(D13). 등록 즉시 화면검색 콤보·퀵툴바·추가 메뉴에
자동 반영된다. 하드코딩된 화면 목록은 어디에도 두지 않는다.

```js
register('chart', {
  no: '0615',                  // 화면번호. 4자리 문자열. 전역 유일(check.py C6)
  label: '키움미니차트',
  keywords: ['차트','chart','캔들'],
  single: false,               // true면 VD당 1개만 허용
  needCode: true,              // 종목연동 대상 여부
  needTf: true,
  defRect: { w: 820, h: 520 },
  minSize: { w: 320, h: 200 },
  defaultBody: (ctx) => ({...}),          // 신규 폼 body 초기값
  reconcileBody: (body, ctx) => body,     // 저장된 body의 결손 보충 (D6)
  mount(el, ctx) { return handle; },      // el 안에 자기 UI 구성. 반환값이 live handle
  update(handle, form, ctx) {},           // code/tf/body 변경 반영
  resize(handle) {},                      // rect 변경 후 1회
  unmount(handle) {},                     // 자원 해제 (LWC chart.remove 등)
});
```

`mount`가 받는 `el`은 프레임 내부의 빈 컨텐츠 div다. screen addon은 프레임·타이틀바·
z-order·저장을 건드리지 않는다.

초기 카탈로그(요구사항 최소셋):

```
0615 차트        chart   needCode/needTf   기존 차트 전체를 body로 수용
0101 현재가       quote   needCode          /api/quote 표시
8949 주식미니주문  order   needCode          수량/시장가/매수/매도
0900 로그        log     -                 전역 로그 뷰
```

---

## 6. D4 — chart screen의 body = 기존 프로필

기존 `profiles/{vd|code|tf}` 레코드 형태를 그대로 `forms/{id}.body`로 옮긴다.

```json
"body": {
  "panes": [ { "id": "main", "label": "메인", "h": 300 } ],
  "items": { "candles1": { "kind":"candles", "enabled":true, "visible":true, "props":{...} } },
  "order": ["candles1"],
  "view": { "barSpacing": 8, "autoScale": true },
  "ui":   { "open": { "main": true } }
}
```

즉 `statespec.js`의 `reconcile()`이 `chart.reconcileBody()`가 된다. 시리즈 애드온 계층은
무변경이다. 폼마다 `createEngine`/`createRuntime` 인스턴스를 **각각** 만든다.

---

## 7. D5 — 종목연동 (symLink)

`project.symLink`가 `"all"`이면 어떤 폼에서 종목을 바꿔도 `needCode: true`인 **모든 폼**의
code를 갱신한다. `"vd"`면 같은 VD에 속한 폼만 갱신한다(allVd 폼은 현재 활성 VD 기준).
이 판정은 `desk.js`가 `needCode` 플래그만 보고 수행한다. screen 이름을 보지 않는다.

---

## 8. D6 — 단일 복원 경로 (D7/I3 준수)

복원 전용 함수·플래그·부팅 특례를 만들지 않는다. 전 경로가 아래 하나를 통과한다.

```
load()      = store.get("") -> reconcileProject() -> 결손 필드만 PATCH
applyDesk() = desired(forms, activeVd) diff live  -> ensure/update/remove
              -> z-order 반영 -> rect/winState 반영
```

`desired`는 순수 함수다. 같은 STATE로 두 번 호출하면 두 번째 ops는 0이어야 한다(T7).
`scrollToRealTime`·`setBarSpacing`·`setPaneStretch`는 chart screen의 `update` 안에서
**geo 변경이 있을 때만** 실행한다. 무조건 실행은 C3에서 정적 차단한다.

### D6.1 reconcile 규칙 (하드코딩 금지의 실체)

```
1. 카탈로그에 없는 screen kind의 폼 -> 제거 대상으로 표기(삭제는 사용자 확인 후)
2. body의 결손 필드 -> screen.reconcileBody()가 카탈로그 스키마로 보충
3. z 배열에 없는 폼 -> 소속 VD의 z 말단에 편입
4. z 배열에 있으나 forms에 없는 id -> z에서 제거
5. rect가 캔버스를 벗어남 -> 가시 영역으로 이동(w/h는 minSize로 클램프)
6. winState=max 인 폼이 2개 이상 -> z 최상단만 유지, 나머지는 prevRect로 복귀
```

애드온이 수백 개여도 규칙 수는 늘지 않는다. 이것이 4축 설계의 목적이다.

---

## 9. D8 — UI 레이아웃

```
[타이틀바]  로고 | VD 아이콘버튼(1 2 3 ... +) | 화면검색 콤보(번호/이름) | 퀵툴바 아이콘 | 모드
[데스크]    position:relative 캔버스. 자식폼 absolute 배치. 활성 VD의 z 순서로 렌더
[하단]      최소화된 폼의 탭 스트립
```

VD 버튼: 클릭 시 전환, `Ctrl+숫자`로도 전환(키움 동일), 우클릭 시 이름변경/삭제, `+`로 추가.
화면검색 콤보: 입력값이 숫자면 `no` 접두 일치, 문자면 `label`/`keywords` 부분 일치.
Enter 또는 항목 클릭 시 **현재 활성 VD에** 폼을 추가한다.
퀵툴바: `screens.catalog()`에서 `quick: true`인 항목만 아이콘으로 노출.

자식폼 타이틀바 우측 버튼 3개: 최소화 `–`, 이전크기/최대화 토글 `□`, 닫기 `✕`.
타이틀바 우클릭 메뉴: 모든 가상화면에 보이기(V) 토글, 다른 VD로 이동, 닫기.

---

## 10. D9 — 저장 시점과 부하

```
드래그/리사이즈 종료(pointerup) -> forms/{id} PATCH (rect, prevRect)
min/max/닫기/추가/이동          -> 즉시 PATCH
VD 전환                        -> activeVd PATCH
차트 내부 변경                  -> forms/{id}/body PATCH (500ms 디바운스)
주기 재그리기(15s)              -> 저장하지 않는다 (T7)
```

렌더 픽셀을 그대로 되쓰지 않는다. 페인 높이는 비율 정규화 후 저장한다(현행 결함 교정).

---

## 11. D10 — 마이그레이션 4 → 5

파괴적 초기화를 금지한다(A0.2 교훈). 절차는 다음과 같다.

```
1. state/workspace.json 을 state/workspace.v4.bak 로 복사
2. profiles/{vd|code|tf} 각 키에 대해:
     items가 비었으면 폐기(오염 레코드 8건)
     아니면 forms/f{n} 생성: screen="chart", vd, code, tf, body=해당 프로필
     rect는 캐스케이드 타일(24px 오프셋), winState="normal"
3. vds/{vd}에 label/order/z 부여. 기존 code/name/tf 필드는 제거(VD는 종목 비소유)
4. project: activeVd=기존 active.vd, symLink="vd", seq.form=n
5. profiles 노드 삭제. schemaVersion=5
```

마이그레이션은 클라이언트 부팅 시 1회 수행하고 결과를 로그 1줄로 보고한다.

---

## 12. D14 — 성능 목표

```
폼 100개 등록 / 활성 VD에 20개 표시 시 applyDesk 재적용 < 50ms, ops=0
비활성 VD 폼은 mount하지 않는다(lazy). 전환 시 mount, 이탈 시 unmount 하되 body는 유지
```

---

## 13. 검증 표

| ID | 내용 | 판정 |
|---|---|---|
| T7 | 동일 STATE 2회 apply → 2회차 ops=0 | 자동 |
| T14 | 폼 추가/닫기/이동 후 재기동 시 rect·z·body 동일 | 수동 |
| T15 | allVd 토글 시 전 VD에 표시, 해제 시 원 VD만 | 수동 |
| T16 | min→이전크기 복귀 시 prevRect와 픽셀 일치 | 수동 |
| T17 | VD 3개에 서로 다른 tf 폼 배치 후 순회 → 각자 유지 | 수동 |
| T18 | 마이그레이션 후 v4.bak과 items 수 일치 | 자동 |
| T19 | check.py C1~C6 전부 PASS | 자동 |
| T20 | 폼 100개 성능 목표 충족 | 자동 |

---

## 14. 승인 대기 항목 (사용자 결정 필요)

```
Q1. VD 개수 상한 — 키움은 8개 고정. 무제한으로 갈지, 8로 맞출지.
Q2. 화면번호 체계 — 키움 실번호(0101/0615/8949)를 차용할지, 자체 번호로 갈지.
Q3. 비활성 VD 폼 lazy unmount 허용 여부(메모리 vs 전환 속도).
Q4. 마이그레이션에서 오염 레코드 8건 폐기 승인.
```

Q1~Q4가 정해지면 D 항목을 확정하고 구현 tranche로 넘어간다.
