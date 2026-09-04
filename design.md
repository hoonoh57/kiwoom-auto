# design.md — kiwoom-auto (최소 테스트 프로젝트)

## 메타

```text
설계 상태 : APPROVED
작성 범위 : 키움 REST API 자동매매 최소 제품 (멀티 가상화면 + LWC v5 차트폼 + 주문/전략)
작성일    : 2026-09-03
승인 근거 : OPEN 0, G 자기점검 전항 통과
```

## P. 프로젝트 프로필

```text
제품 목적 : 키움 HTS 멀티 가상화면 개념을 화면 단위 desired state 로 치환하고,
            LWC v5 차트 위에 자동매매 신호/주문을 얹은 최소 실행 가능 제품.
입력      : workspace.json (desired state), 키움 REST 응답, UI 명령
출력      : 차트 렌더 operation, 주문 요청, 전략 판정(BUY/SELL/NO_TRADE)
성능 목표 : item 1000개 apply 시 operation 종류 3(ensure/update/remove) 유지
환경 의존 : 시계=서버 time, 난수=MOCK seed(코드 해시, 고정), IO=httpx 어댑터 1곳

P1 영속 복원 YES(M4) / P2 외부IO YES(M1) / P3 동시성 NO(단일 apply 루프)
P4 시간·난수 YES(M3) / P5 UI YES(M5) / P6 오류노출 YES(M6) / P7 관측 YES(M7)
P8 성능예산 YES(M8) / P9 신뢰경계 YES(M9) / P10 3자 Add-on NO / P11 다중버전 NO
P12 인코딩 YES(M12) / P13 픽스처 YES(M13)

규모 : item 15개(화면3×5), 최대 1000 / kind 4종 / 세션 1
```

## D1. 범위와 비범위

```text
만든다
- 화면 전환(멀티 가상화면) : 화면 버튼 클릭 시 desired set 교체, item 단위 op 만 발생
- 차트폼 : candles / ma / volume / signals 4 kind
- 주문 : 시장가·지정가 매수/매도 (MOCK 기본, live 전환 가능)
- 전략 : MA 교차 + 이격 임계, 증거 부족 시 NO_TRADE
- 영속 : workspace.json 단일 SSOT, 재시작 시 동일 경로 복원

만들지 않는다
- 실시간 WebSocket 체결/호가 (폴링 15초로 대체)
- 조건검색, 백테스트, 포지션 관리 자동화, 다계좌
- 드래그 레이아웃 편집기 (order/pane 값 편집으로 대체)
```

## D2. 계층 매핑

```text
ENGINE : web/js/core.js   — LWC primitive 만. kind 이름을 모름.
ADDON  : web/js/addons.js — kind 4종. 1 item -> 1 descriptor.
BRIDGE : web/js/runtime.js— Map<id,live> + set diff. kind 분기 없음.
STATE  : workspace.json / app/state.py — desired only.
의존   : STATE -> BRIDGE -> ADDON -> ENGINE  (역방향 없음)
외부   : app/kiwoom.py 만 키움과 통신. 계약: candles/quote/order/balance
```

## D3. Item 모델

```text
필드    | 타입   | 필수 | 기본값 | 불변 | 유효범위
id      | string | Y    | -      | Y    | "<code>.<slot>"
kind    | string | Y    | -      | Y    | candles|ma|volume|signals
enabled | bool   | Y    | true   | N    | -
visible | bool   | Y    | true   | N    | -
order   | int    | N    | 0      | N    | >=0, 동일값은 id 사전순
props   | object | Y    | {}     | N    | kind별 D5
```

## D4. STATE 스키마

```text
버전   : 1
경로   : ./workspace.json  (SSOT 1개)
쓰기   : PATCH /api/state, PATCH /api/state/item/{id} 시점에만
원자성 : tempfile -> os.replace (부분 기록 불가)
직렬화 : ensure_ascii=False, indent=2, sort_keys=True, newline="\n"
읽기실패 : 부재 -> 기본 workspace 생성 / version<1 -> 기본으로 재생성
금지   : live handle, pending, 완료 상태, callback
```

## D5. kind 카탈로그

```text
D5.kind.candles
  props    : code, interval("D"|분), pane=0
  normalize: interval 기본 "D", pane 기본 0
  ensure   : candlestick series 생성 + setData(300봉) + fitContent
  update   : code/interval 변경 시 setData
  remove   : removeSeries
  오류     : /api/candles 502 -> 로그 후 해당 item 만 미생성

D5.kind.ma
  props    : code, period(>=1), color, pane=0
  normalize: period Number, color 기본 #f2b632
  ensure   : line series + SMA(period) setData
  update   : color 는 applyOptions, period/code 변경 시 setData
  remove   : removeSeries

D5.kind.volume
  props    : code, pane=1, paneHeight=120
  ensure   : histogram(pane 1) + 등락 색 + setData + setPaneHeight
  update   : paneHeight 변경 시 setPaneHeight 만
  remove   : removeSeries

D5.kind.signals
  props    : code, fast=5, slow=20
  ensure   : 투명 host line + createSeriesMarkers(교차 마커)
  update   : setMarkers 만 (series 재생성 없음)
  remove   : detach + removeSeries
```

## D6. ENGINE primitive

```text
createSeries(typeName, options, paneIndex) -> series   전제: SERIES에 등록된 타입
removeSeries(series)                                   사후: 자원 해제
setData(series, data) / applyOptions(series, opts)
priceScale(series, opts) / setPaneHeight(i, px)
attachMarkers(series, m) -> handle / setMarkers / detachMarkers
fit() / destroy()
성능: 모든 primitive O(1) 호출, setData 는 O(n) 1회
무지: kind 이름, ON/OFF 정책, persistence, restore
```

## D7. BRIDGE diff

```text
입력 : desired=[{id,kind,effective,props}], live=Map<id,{kind,props,hash,handle}>
집합 : want = desired.filter(effective)
       live - want       => remove
       want - live       => ensure
       교집합 hash 불일치 => update
순회 : remove 먼저(자원 반납), 이후 ensure/update 를 id 사전순
tie  : order 동일 시 id 사전순
금지 : kind 분기, restore 전용 경로, collection 상태기계
```

## D8. propsHash 정규화

```text
키 정렬 : Object.keys().sort() 재귀
수치    : 유한값 그대로, -0 -> 0, NaN/Infinity -> null
null    : null/undefined 모두 null 로 통일
배열    : 순서 의미 있음
해시    : FNV-1a 32bit, 8자리 hex 소문자
동등성  : hash 동일 => props 동일로 취급 (update 생략)
```

## D9. effective 계산식

```text
effective = globalOn && item.enabled && item.visible
평가      : 단축 평가
false     => desired 에서 제외 => diff 가 remove 발생
전역 OFF  => 동일 remove 를 대상 item 전체에 반복 (전용 경로 없음)
```

## D10. 경계·오류 처리

```text
조건                        | 결과                          | 오류 노출
빈 items                    | apply 후 live 0               | 없음
미등록 kind                 | 해당 item skip                | 로그만
중복 id                     | 뒤 항목이 앞 항목 갱신        | 없음
period<1                    | normalize 가 5 로 대체        | 없음
qty<1                       | 400 "qty >= 1"                | UI 로그
limit && price<=0           | 400                           | UI 로그
side 오값                   | 400                           | UI 로그
키움 4xx/5xx                | 502 + 원문 200자              | UI 로그
토큰 미설정(live)           | KiwoomError 즉시              | 기동 시 502
workspace.json 부재/손상    | 기본값 재생성                 | 없음
```

## D11. 골든 trace

```text
T1  item 1개 ON            -> ensure×1
T2  1000개 ON              -> ensure×1000, op 종류 3 유지
T3  #537 OFF               -> remove(#537)×1, 나머지 999 변화 0
T4  #537 재 ON             -> ensure(#537)×1
T5  globalOn=false         -> remove×N (item op 반복)
    globalOn=true          -> ensure×N
T6  재기동 후 apply        -> 최초 apply 와 동일 다중집합
T7  동일 STATE 2회 apply   -> 2회차 이벤트 0건
T8  ma.color 변경          -> update(ma)×1 만
T9  N=1/10/1000            -> 종류 동일, 횟수만 N
비교: (op,id,kind,propsHash) 다중집합. seq 제외.
확인: UI 실행 로그 창에 op/id/hash 가 그대로 기록됨
```

## D12. 성능 예산

```text
N     | op 수 | touch item | 측정
1     | 1     | 1          | 로그 라인 수
10    | 10    | 10         | 로그 라인 수
1000  | 1000  | 1000       | 로그 라인 수
1개 변경 시 touch 상한 : 1 (상수 1배)
setData 호출 : ensure 시 1회, props 변경 시 1회
```

## D13. 명명·배치

```text
파일   : 계층당 1파일. kind 는 addons.js 내 register() 블록 1개.
공개   : core.js=createEngine / runtime.js=createRuntime,propsHash / addons.js=register,get,invalidate
명명   : kind=소문자 단수, id="<code>.<slot>", 설계 ID=D<n>[.kind.<name>]
로그   : 브라우저 실행 로그 창(op/id/hash), 서버 uvicorn 기본
동시성 : apply 는 UI 이벤트 순차 호출. 재진입 미보장(단일 사용자 전제).
```

## D14. OPEN QUESTIONS

```text
- 없음
```

## G. 자기점검

```text
[x] P 프로필 확정, 미채택 모듈 사유 기재
[x] D1~D14 결정값 기재, TBD 없음
[x] 계층 매핑 일치, 의존 단방향
[x] D7 순회 순서·tie-break 결정적
[x] D8 정규화/해시 결정적
[x] D10 경계 전부 결정
[x] D11 T1~T9 기대값 재현 가능
[x] D14 비어 있음
```

## M 모듈 요약

```text
M1  IO : app/kiwoom.py 만. timeout 10s, 재시도 없음(주문 중복 방지), 토큰 캐시 3600s-60s
M3  주입: MOCK seed=코드 해시 고정 -> 동일 코드 = 동일 봉
M4  마이그레이션: version<1 -> 기본값 재생성 (restore 분기 아님)
M5  UI : desired-state 명령만. 영속 자원 생성 안 함.
M6  오류: HTTPException(400 입력/502 외부). fallback 은폐 없음.
M7  관측: 실행 로그 창 = operation recorder 역할
M8  성능: 배칭 없음. item 독립 호출.
M9  경계: side/qty/priceType 를 서버에서 1회 검증
M12 인코딩: 응답 UTF-8, JSON newline="\n", 콘솔은 run.ps1 에서 UTF-8 고정
M13 픽스처: MOCK 어댑터가 결정적 픽스처 생성기 역할
```
