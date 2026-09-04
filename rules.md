# rules.md — Core/Add-on Architecture Constitution (범용)
이 파일은 이 프로젝트의 **유일한 영구 규칙 파일**이다. 복구에 필요한 규칙은 이 파일 하나에
완결되어 있어야 한다. 정상 작업 중에 새 규칙 문서·권위 문서·복구 문서를 만들지 않는다.
구성은 두 부분이다.
```
Part A  프로젝트 무관 영구 규칙        (복사해서 재사용)
Part B  이 프로젝트의 어휘/좌표 슬롯   (프로젝트마다 작성)
```
규칙 등급 표기는 다음 두 가지다.
```
[HARD]  위반 시 즉시 중단. 예외·완화·유예 없음.
[GUIDE] 기본 준수. 이탈 시 todo.md에 이유 1줄 기록.
```
---
# PART A — 프로젝트 무관 영구 규칙
## A0. 권위와 세션 복구 [HARD]
세션 시작 또는 `세션복구` 시 읽는 파일은 오직 둘이다.
```
1. rules.md   영구 불변 규칙
2. todo.md    한 일 / 할 일 / 현재 상태
```
그 외 모든 문서(handoff, checkpoint, current-state, work-order, compliance, 과거 대화)는
**비권위 역사·증거 자료**다. 복구 목적으로 읽지 않는다. `todo.md`가 특정 파일/커밋/로그를
증거로 지목한 경우에만 그 대상을 확인한다.
### A0.1 파일 정원(定員) [HARD]
프로젝트가 유지하는 상시 문서는 **정확히 3개**다. 그 외 상시 문서를 만들지 않는다.
```
rules.md    영구 규칙        (불변, 사용자 지시로만 변경)
todo.md     가변 인수인계     (매 tranche 갱신)
design.md   구현 명세/설계도  (코드 선행 조건, A2.5~A2.7)
```
`design.md`는 **복구 권위가 아니다.** 세션 복구는 여전히 rules.md + todo.md 2개만 읽는다.
구현에 착수할 때 todo.md가 지목한 설계 항목만 열어 본다. 설계도가 커져도 복구 비용은
증가하지 않아야 한다.
권위 순서 — 당위(무엇이 옳은가) 판정:
```
사용자의 현재 명시적 지시
> rules.md
> todo.md
> design.md
> 실제 코드
> 그 외 모든 문서·대화
```
권위 순서 — 사실(무엇이 실제로 일어나는가) 판정:
```
실행/테스트 증거
> design.md 기대값
> 문서 서술
```
즉 코드가 설계와 다르면 **코드가 틀린 것**이고, 설계가 rules.md와 다르면 **설계가 틀린
것**이다. 다만 실제 동작 사실은 문서로 부인하지 않는다.
일반 기능 요청은 rules.md를 자동 변경하지 않는다. 사용자가 명시적으로
`rules.md 규칙을 변경하라`고 지시한 경우에만 의미를 바꾼다.
다음은 rules.md 수정 사유가 **아니다**.
```
버그 · 테스트 실패 · 리팩터링 · 새 기능 · 새 Add-on
새 세션 · 새 Runtime · 새 UI · 새 persistence
현재 구현과 규칙의 충돌 · 설계도와 규칙의 충돌
```
구현이 이 파일과 충돌하면 **구현이 틀린 것**이다.
### A0.2 규칙 자체가 틀린 경우 [HARD]
규칙에 결함이 의심되면 규칙을 임의로 완화하지 않는다. 다음 절차만 허용한다.
```
1. 작업 중단
2. todo.md 할 일 최상단에 RULE_CONFLICT 기록
   - 충돌 불변식 ID
   - 규칙대로 하면 불가능한 구체 사례 1개
   - 규칙을 유지하는 대안 1개 이상
3. 사용자 판단 대기
```
RULE_CONFLICT는 AI가 스스로 해소할 수 없다. 이것이 규칙 오류의 유일한 교정 경로다.
## A1. 4계층 — 의미가 최우선 [HARD]
계층은 폴더 이름 규칙이 아니라 **동작 의미 규칙**이다. 위치가 맞아도 의미를 위반하면 FAIL이다.
```
ENGINE  (Core)     무엇으로 만드는가 — 성능 중심 generic primitive
ADDON              무엇을 만드는가 — feature 의미와 props 계산
BRIDGE  (Runtime)  어떻게 반영하는가 — feature-blind diff/번역
STATE   (JSON)     무엇이 켜져 있는가 — desired state 영속성
```
의존 방향은 한 방향뿐이다.
```
STATE -> BRIDGE -> ADDON(translator) -> ENGINE
```
역방향 참조, 계층 건너뛰기, 동일 계층 간 내부 침범을 금지한다.
### A1.1 ENGINE (Core)
Core는 **generic primitive의 생성·수정·삭제·실행만** 한다. 성능 최적화의 유일한 소재지다.
Core가 알아도 되는 것:
```
primitive 자원 · 자원 생명주기 · 배치/버퍼/캐시 · 좌표/레이아웃 primitive
```
Core가 몰라야 하는 것:
```
feature 이름 · Add-on id의 의미 · ON/OFF 정책
restore 정책 · persistence 의미 · 사용자 workflow
```
Core에 feature special-case, compatibility branch, 특별 restore 처리를 넣지 않는다.
### A1.2 ADDON
Add-on은 **하나의 item을 하나의 descriptor로 바꾸는 순수 변환**이다.
Add-on의 책임:
```
자기 feature의 의미 정의
raw item -> normalized props
props -> Core primitive 조합
```
Add-on이 하면 안 되는 것:
```
Core primitive 재구현
다른 Add-on의 상태 직접 접근
collection 전체 lifecycle 상태기계 소유
pending/revision/retry/restore orchestration
Bridge 역할 복제
```
같은 feature item이 N개면, **한 item을 처리하는 동일 함수가 N번 호출되는 구조**여야 한다.
### A1.3 BRIDGE (Runtime)
Bridge가 받는 것은 기능명이 아니라 generic desired item이다.
```
item = { id, kind, enabled, visible, props, order?, group? }
```
Bridge의 허용 operation은 세 가지 의미뿐이다(이름은 달라도 된다).
```
ensure(id, kind, props)
update(id, props)
remove(id)
```
diff는 generic set 연산으로만 처리한다.
```
desired - live    => ensure
live - desired    => remove
intersection      => update (props 변경 시에만)
```
Bridge는 feature-blind다. `if kind === "X"` 형태의 기능별 분기, 기능별 restore/reconcile/queue를
두지 않는다. live authority의 기준형은 다음 하나다.
```
Map<itemId, liveHandle>
```
generic batching/queue/revision은 **모든 kind에 동일하고 item 독립성을 보존하는
infrastructure**일 때만 허용된다. 특정 feature collection의 의미 상태가 되면 FAIL이다.
### A1.4 STATE (JSON)
STATE는 **desired state 영속성 only**다.
저장 가능:
```
item id · kind · enabled · visible · props · order · group · 전역 desired 값
```
저장 금지:
```
live handle · pending · promise · retry · revision authority
restore mode · runtime 완료 상태 · 실행 가능 callback
```
Persistence는 serialize/deserialize만 한다. 객체 생성 여부나 복원 순서를 판단하지 않는다.
## A2. 확장 계약 — 무한 증식의 유일한 통로 [HARD]
Add-on은 등록만으로 늘어난다. 등록 계약은 kind 하나당 다음 하나다.
```
register(kind, {
  normalize(raw)                      -> props        // 순수 함수
  ensure(ctx, id, props)              -> liveHandle   // ctx = Core primitive capability
  update(ctx, handle, prev, next)     -> void
  remove(ctx, handle)                 -> void
})
```
제약:
```
ctx는 Core primitive API만 노출한다. 전역 접근·다른 Add-on 접근을 주지 않는다.
네 함수 모두 단일 item만 다룬다. collection 인자를 받지 않는다.
normalize는 부작용이 없어야 한다.
Add-on 추가 시 ENGINE/BRIDGE/STATE 코드는 수정되지 않는다.
```
새 Add-on 하나 때문에 Bridge에 분기, 전용 restore/queue, Core 특수 케이스가 필요하면
**설계 실패**다.
## A2.5 설계 선행 게이트 — DESIGN-FIRST [HARD]
**설계도 없이 제품 코드를 쓰지 않는다.** 순서는 역전될 수 없다.
```
설계도 완성 -> 승인 -> 코드
```
착수 조건:
```
C1  design.md가 존재하고 A2.6의 필수 항목이 모두 작성되어 있다.
C2  OPEN QUESTIONS 개수 = 0 이다.
C3  A5의 T12(모호성 테스트)를 통과했다.
C4  사용자가 APPROVED로 승인했다.
```
`C1~C4`가 모두 충족되기 전에는 **어떤 제품 코드도 작성·수정·merge 하지 않는다.**
부분 착수, 선행 구현, "일단 골격만", "나중에 설계 보강"은 전부 금지다.
설계도 상태는 셋뿐이다.
```
DRAFT      작성 중. 코드 금지.
REVIEWED   T12 통과. 아직 코드 금지.
APPROVED   사용자 승인. 해당 범위 코드 허용.
```
상태와 OPEN 개수는 todo.md의 현재 좌표에 기록한다.
### A2.5.1 사후 설계 금지 [HARD]
이미 쓴 코드를 정당화하려고 설계도를 나중에 채우는 행위(back-filled design)를 금지한다.
설계도는 코드에서 추출하지 않고, 코드가 설계도에서 파생된다. 기존 코드가 있는 프로젝트에
이 규칙을 도입할 때는 다음만 허용한다.
```
1. 현재 코드를 '관측 사실'로 기록한다 (설계 아님).
2. 목표 설계도를 rules.md에서 파생해 독립적으로 작성한다.
3. 둘의 차이를 remediation 목록으로 만든다.
4. 차이 항목은 architecture defect로 분류한다.
```
### A2.5.2 탐색 스파이크 [HARD]
기술 불확실성 해소를 위한 탐색은 다음 조건에서만 허용한다.
```
목적은 '설계도의 빈칸을 채우는 것' 하나뿐이다.
분리된 임시 경로(별도 branch 또는 spike 폴더)에서만 수행한다.
merge 금지. 재사용 금지. tranche 종료 시 삭제한다.
산출물은 코드가 아니라 design.md에 확정된 결정과 근거뿐이다.
```
스파이크 코드가 제품 경로로 넘어오면 그 자체가 결함이다.
### A2.5.3 구조 불명확 시 [HARD]
구조가 불명확하면 코드를 쓰지 않는다. 정상 단일 경로를 설계도에서 먼저 확정한다.
설계도에 없는 문제를 코드로 탐색해 해결하려는 시도는 오염의 출발점이다.
## A2.6 설계도 필수 구성 — BLUEPRINT CONTENTS [HARD]
`design.md`는 아래 D1~D14를 모두 포함한다. 하나라도 비어 있으면 상태는 DRAFT다.
각 항목에는 고유 설계 ID를 부여한다(예: `D5.kind.line`).
```
D1   범위와 비범위
     - 만들 것 / 만들지 않을 것을 각각 명시한다.
D2   계층 매핑
     - Part B의 B1~B4와 1:1로 일치해야 한다. 불일치 시 설계 결함.
D3   item 모델
     - 전체 필드 목록: 이름, 타입, 필수/선택, 기본값, 불변 여부, 유효 범위.
D4   STATE 스키마
     - 정식 스키마 정의, 버전 번호, 마이그레이션 규칙,
       그리고 canonical fixture 파일 1개(실제 예시 JSON).
D5   kind 카탈로그 (Add-on 1개 = 항목 1개)
     - props 스키마 / normalize 규칙 / ensure·update·remove의 관측 가능한 효과
       / 사용하는 Core primitive / 오류 조건.
D6   Core primitive 목록
     - 각 primitive의 시그니처, 전제조건, 사후조건, 성능 계약(복잡도·할당 상한).
D7   Bridge diff 알고리즘
     - 의사코드. 결정적 순회 순서. 대상 집합 계산식.
D8   propsHash 정규화 규칙
     - 키 정렬 방식, 수치 표현, null/undefined 처리, 중첩 구조 직렬화, 해시 함수.
D9   effective 계산식
     - 전역/개별 플래그의 결합 순서와 정확한 결과.
D10  경계·오류 처리 표
     - 입력 조건 -> 정확한 결과. 표 형태로 빠짐없이. "미정" 칸 금지.
D11  골든 trace
     - 대표 시나리오별 기대 operation trace(A5 스키마 형식). T1~T11에 대응.
D12  성능 예산
     - N=1 / 10 / 1000에서의 operation 수, 재계산 대상 수, 할당 상한.
D13  명명·배치 규칙
     - 파일 위치, 파일당 책임, 식별자 명명 규칙, 공개 API 경계.
D14  OPEN QUESTIONS
     - 미결정 사항 목록. 여기에 항목이 있으면 그 항목이 영향을 주는 범위의 코드는 금지.
       APPROVED 조건은 이 목록이 비는 것이다.
```
`design.md`는 rules.md의 규칙을 재서술하지 않는다. 규칙을 다시 적으면 두 문서가 서로
표류한다. 설계도는 규칙을 **이 프로젝트의 구체 값으로 인스턴스화**하기만 한다.
## A2.7 구현 결정성 계약 — DETERMINISTIC IMPLEMENTATION [HARD]
설계도의 합격 기준은 분량이 아니라 **선택 여지의 부재**다.
```
서로 독립적으로 작업하는 두 구현자가 design.md만 읽고 구현했을 때,
관측 가능한 동작(공개 시그니처 · operation trace · 오류 · 영속 형식)이 일치해야 한다.
일치하지 않는 지점은 구현자의 재량이 아니라 '설계 누락'이다.
```
따라서 다음은 반드시 설계도에 못박는다.
```
반복·순회 순서와 정렬 기준
동일 조건에서의 tie-break 규칙
기본값과 경계값 처리
오류 유형·발생 조건·전파 방향
직렬화 표현(키 순서, 수치 포맷, 선택 필드 생략 여부)
시간·난수·환경·로케일 의존의 주입 지점(직접 호출 금지)
재진입·동시 호출 시의 정의된 동작
로그 레벨과 출력 위치
```
설계도 금지 어휘 — 아래 표현은 결정을 미룬 것으로 간주하고 설계 결함으로 판정한다.
```
적절히 · 필요시 · 가능하면 · 상황에 따라 · 유연하게 · 최적화하여
알아서 · 등등 · 추후 결정 · TBD (D14 목록 밖에서 사용된 경우)
```
**추적성** — 모든 공개 함수·모듈·테스트는 자신이 구현하는 설계 ID를 참조한다.
```
설계 ID가 없는 제품 코드     => 결함 (design gap)
설계에 없는 공개 동작        => 결함 (over-implementation)
구현되지 않은 설계 ID        => 미완료 (todo.md에 잔여로 기록)
```
## A3. 핵심 불변식 — 완화 금지 [HARD]
하나라도 위반하면 `ARCH FAIL`이다. 기존 테스트 PASS, 기존 구현, 과거 merge, 과거 문서로
덮을 수 없다.
```
I1  CARDINALITY
    1개와 N개의 알고리즘이 동일하다. N은 반복 횟수일 뿐 새 lifecycle 상태를 만들지 않는다.
I2  LOCALITY
    N개 중 1개 변경은 그 1개의 lifecycle만 바꾼다. 나머지 N-1개 live handle은
    생성·폐기·재생성되지 않는다.
I3  RESTORE EQUIVALENCE
    재시작은 별도 lifecycle이 아니다. 저장된 STATE를 다시 읽어 최초 ON과 동일한
    ensure/update/remove 경로를 실행하는 것뿐이다. restore 전용 함수·큐·상태기계 금지.
I4  GLOBAL/PARTIAL EQUIVALENCE
    effective = globalOn \&\& item.enabled \&\& item.visible
    전체 ON/OFF는 부분 ON/OFF와 같은 item operation의 반복이다. 전역 전용 경로 금지.
I5  IDEMPOTENCE
    apply(S); apply(S) => 두 번째 적용의 lifecycle 변화 0.
I6  SINGLE PATH
    STATE -> ADDON translator -> BRIDGE diff -> ENGINE primitive
    정상 경로는 정확히 하나다. UI/persistence/Add-on/Bridge 어디에도 두 번째 경로를 두지 않는다.
I7  SCALE-INDEPENDENT COMPLEXITY
    item 수가 늘어도 알고리즘 '종류'가 늘지 않는다. 개수 때문에 새 상태·새 완료판정·
    새 단계가 필요하면 구조 결함이다.
I8  ZERO-TOUCH EXTENSION
    Add-on 추가/삭제의 코드 변경 범위는 그 Add-on 자신과 등록 1줄에 한정된다.
I9  DELTA-PROPORTIONAL COST
    한 tick의 작업량은 변경된 item 수에 비례한다. 전체 item 수에 비례하는
    재계산·재생성·재정렬을 정상 경로에 두지 않는다.
I10 STATE PURITY
    STATE는 live 객체·완료 상태·실행 authority를 소유하지 않는다.
I11 DESIGN-FIRST
    제품 코드의 존재는 APPROVED 설계 항목의 존재를 전제한다.
    설계 없는 코드, 코드에 맞춘 사후 설계는 모두 결함이다.
I12 IMPLEMENTATION DETERMINISM
    design.md만으로 독립 구현자들이 동일한 관측 가능 동작에 도달한다.
    구현자 재량이 남는 지점은 설계 누락이다.
```
## A4. PASS의 정의 [HARD]
`ARCH PASS`는 다음 전부를 통과했을 때만 선언한다.
```
D  design gate PASS             (A2.5 C1~C4 충족, 추적성 위반 0)
S  structural boundary PASS     (계층 경계·의존 방향)
O  semantic operation PASS      (ensure/update/remove 의미 준수)
I1..I12 invariant PASS
```
파일 위치, import 검사, 토큰 grep만 통과한 것은 PASS가 아니다. 이들은 **보조 static gate**일
뿐이며 semantic gate 없이는 무효다.
`ARCH PASS`와 `repo-wide PASS`를 혼동하지 않는다. 잔여 remediation이 있으면
`REMEDIATION_REQUIRED`를 유지한다.
## A5. 자동검증 계약 [HARD]
테스트는 현재 구현을 보존하려고 만들지 않는다. **rules.md와 design.md에서 직접 파생**한다.
기대값의 출처는 D11 골든 trace이며, 현재 구현의 출력이 아니다.
semantic operation recorder를 둔다. 실제 부작용을 실행하지 않고도 Bridge가 발생시킨
operation을 기록한다. 기록 스키마는 다음으로 고정한다.
```
event = { seq, op: ensure|update|remove, id, kind, propsHash }
```
trace 비교 규칙:
```
기본 비교는 (op, id, kind, propsHash) 다중집합 비교다.
order가 desired state에 포함된 경우에만 순서를 비교한다.
seq는 동일성 판정에 사용하지 않는다.
```
불변식과 테스트는 1:1로 묶는다.
```
T1  item 1개 ON                  -> ensure 1회                              [I1]
T2  item N개 ON (N>=1000)        -> 동일 ensure N회, 새 lifecycle 종류 0     [I1,I7]
T3  N개 중 1개 OFF               -> 해당 id만 remove/update, 나머지 변화 0   [I2]
T4  그 1개 다시 ON               -> 해당 id만 ensure/update                  [I2]
T5  global OFF/ON                -> item operation의 단순 반복               [I4]
T6  restart apply(saved STATE)   -> fresh apply(saved STATE)와 trace 동일    [I3]
T7  같은 STATE 연속 2회 apply    -> 2회차 lifecycle 변화 0                   [I5]
T8  1개 props/order 변경         -> 그 item update만 발생                    [I2,I9]
T9  N = 1 / 10 / 1000            -> operation 종류 동일, 횟수만 N 비례       [I1,I7]
T10 신규 kind 등록               -> ENGINE/BRIDGE/STATE diff = 0             [I8]
T11 1개 변경 시 touch된 item 수  -> 변경 item 수에 비례 (상수 배)            [I9]
T12 설계 모호성 테스트                                                       [I12]
    독립 검토자(또는 코드를 보지 않은 새 세션)가 design.md만 읽고 작성한
      (a) 공개 시그니처 목록
      (b) 대표 시나리오 골든 trace
    가 원본 D6/D11과 일치한다. 불일치 항목은 전부 설계 결함으로 기록한다.
    이 테스트는 코드 착수 전에 수행한다.
T13 추적성 테스트                                                            [I11]
    설계 ID 없는 공개 코드 = 0
    설계에 없는 공개 동작 = 0
    미구현 설계 ID는 목록화되어 todo.md에 존재
```
### 테스트 약화 금지 [HARD]
green을 만들기 위해 다음을 하지 않는다.
```
assertion 완화 · skip · allowlist · grandfather exception
fallback으로 오류 은폐 · tolerance 임의 확대
expected를 현재 구현에 맞춤 · 골든 trace를 실제 출력으로 덮어쓰기
```
실패는 먼저 분류한다.
```
product defect
test defect
design defect           (설계가 모호·모순·누락. T12 불일치 포함)
design gap              (설계 ID 없는 코드 / 설계에 없는 동작)
architecture defect     (I1..I12 위반 시 반드시 함께 표기)
rule defect             (A0.2 RULE_CONFLICT로 승격)
authority drift
environment issue
unknown
```
## A6. 금지되는 오염 패턴 [HARD]
이름이 generic해도 원칙상 금지다.
```
설계도 없이 착수한 제품 코드
코드에 맞춘 사후 설계 / 골든 trace의 사후 조정
스파이크 코드의 제품 경로 유입
feature 단위 whole-collection signature / revision / pending chain / retry 상태기계
owner 전체 replace를 feature 의미로 사용
1개 변경 시 N개 전체 폐기·재생성
restart 전용 lifecycle
UI가 영속 자원을 직접 복원
STATE가 live 완료 상태를 저장
ENGINE에 feature special-case
BRIDGE에 feature name 분기
ADDON이 Core primitive 재구현
```
## A7. UI 규칙 [HARD]
UI는 desired-state 입력기다.
```
가능:  add/remove/enable/disable/select/props 변경 요청, runtime snapshot 관찰, 상태 표시
금지:  영속 자원 생성, lifecycle 소유, 재시작 복원, STATE와 별도 side-store 유지
```
UI에서 누른 ON/OFF와 재기동 시 읽은 ON/OFF는 **같은 write/read 경로**로 Bridge에
도달해야 한다.
## A8. Persistence 규칙 [HARD]
제품 desired state의 SSOT는 지정된 STATE 하나다.
```
금지: 동일 기능의 두 번째 저장소, localStorage를 product authority로 사용,
      UI 전용 persistence, hidden side-store, DB와 파일이 동시에 authority 보유
```
STATE 스키마 변경은 D4의 마이그레이션 규칙으로 흡수하고, restore 분기로 흡수하지 않는다.
## A9. 모듈 간 분리 [HARD]
독립 모듈은 물리적으로 분리하고 내부 침범을 금지한다.
```
모듈 간 직접 import 금지
다른 모듈의 내부 상태/DB 직접 접근 금지
상호연동 = 표준 Request -> Response 계약(adapter)
```
각 모듈 내부는 독립적으로 고도화 가능해야 하고, 연동 변경은 계약/adapter가 흡수한다.
모듈 간 계약은 D5/D6와 같은 수준으로 설계도에 명시한다.
## A10. 작업 절차 — micro-tranche [HARD]
```
0. 설계 게이트 확인 (A2.5)
   - design.md 상태가 APPROVED이고 해당 범위 설계 ID가 확정되었는가?
   - 아니면 이 tranche는 '설계 tranche'다. 코드를 쓰지 않는다.
1. 실패 분류
2. 불변식 충돌 확인 (A3)
3. boundary change 1개만 수행 (설계 ID 참조 필수)
4. static boundary gate
5. semantic invariant gate (A5)
6. focused behavior test
7. 필요 시 실제 사용자 환경 acceptance
8. todo.md 갱신
9. 다음 tranche
```
실제 사용 환경의 실패를 자동테스트 PASS로 덮지 않는다.
### A10.1 전진 보장 [HARD]
게이트가 강한 만큼 정지도 결함으로 취급한다.
```
모든 tranche는 검증 가능한 산출물 1개를 남긴다
  (통과한 테스트 · 삭제된 위반 · 확정된 판정 · 확정된 설계 ID · 닫힌 OPEN 항목).
같은 게이트에 3회 연속 막히면 게이트를 낮추지 않고 '범위를 줄인 최소 통과 경로'를 제안한다.
2개 이상 tranche 동안 산출물이 없으면 todo.md 할 일 최상단에 NO_PROGRESS를 기록한다.
```
설계 tranche의 산출물은 확정된 D 항목 또는 닫힌 OPEN 항목이다. "설계를 계속 다듬음"은
산출물이 아니다. 방어적 보정 패치(타이밍 재시도, fallback, 전용 pending/settle 추가)도
산출물로 계산하지 않는다.
### A10.2 설계 변경 절차 [HARD]
구현 중 설계 변경이 필요해지면 코드와 설계를 동시에 바꾸지 않는다.
```
1. 코드 작업 중단
2. design.md의 해당 ID를 갱신하고, 영향받는 D11 골든 trace를 함께 갱신
3. 필요 시 T12 재수행
4. 사용자 재승인(APPROVED)
5. 그 다음 tranche에서 코드 반영
```
설계 변경은 항상 코드보다 **먼저** 확정된다. 코드를 먼저 고치고 설계를 따라오게 하면
A2.5.1(사후 설계 금지) 위반이다.
## A11. 리포지토리·원격 안전 [HARD]
```
사용자에게 수동 소스 편집을 요구하지 않는다. 원격에서 수정하고 사용자는 pull/test 한다.
현재 branch 확인 없이 기본 branch를 병합·pull 하지 않는다.
reset --hard 등으로 사용자 생성물/증거를 삭제하지 않는다.
불필요한 rebase/force push 금지, dirty state 덮어쓰기 금지, 테스트 약화 merge 금지.
frozen legacy 경계가 지정되어 있으면 유지한다.
```
### A11.1 진행 연속성 [HARD]
원격 리포 기준으로 작업하고, 사용자 확인이 필요 없는 항목은 확인을 요청하지 않고
작업 순서대로 연속 진행한다.
중단하고 사용자 판단을 받는 경우는 다음뿐이다.
```
실제 UI/사용자 환경에서만 판정 가능한 결과 (WYSIWYG · 조작감 · 시각 확인)
design.md 상태가 APPROVED가 아닌 범위의 코드 (A2.5)
RULE_CONFLICT (A0.2)
사용자 데이터·기존 산출물을 되돌릴 수 없게 바꾸는 변경
설계 변경 재승인 (A10.2)
```
그 외에는 "진행할까요?"를 묻지 않는다. 다음 tranche로 계속한다.
확인 요청 시에는 무엇을 확인해야 하는지와 판정 기준만 1~3줄로 제시한다.
### A11.2 대화 출력 규약 [HARD]
대화창 출력은 인간이 읽을 요약만 담는다. 기본 형식은 다음 두 항목이다.
```
한 일 : <확정 사항 1~3줄>
할 일 : <다음 작업 1~3줄>
```
대화창에 출력하지 않는다.
```
전체 파일 내용 · 대량 diff · 전체 코드 블록 (사용자가 요청한 경우 제외)
명령어 실행 로그 전문 · 스택트레이스 전문 · 테스트 개별 통과 목록
중간 탐색 과정 · 시도한 경로 나열 · 동일 내용의 재서술
기계 판독용 구조 덤프
```
상세 내용은 리포 파일과 todo.md에 남기고, 대화에는 그 위치만 가리킨다.
사용자가 명시적으로 상세를 요청하면 그때만 해당 범위를 출력한다.
### A11.3 사용자 실행 스크립트 규약 [HARD]
사용자에게 제공하는 검증 절차는 PowerShell에서 그대로 붙여 실행 가능해야 한다.
표준 순서는 하나다.
```
1. 현재 branch 확인
2. pull
3. 검증 스크립트 1개 실행
4. 결과 1줄 출력
```
작성 시 다음을 준수한다.
```
인코딩   : 콘솔 출력 UTF-8 고정. 스크립트 파일은 UTF-8 BOM으로 저장한다.
           한글 출력이 깨질 수 있는 경로에서는 ASCII 상태 토큰([PASS]/[FAIL])을 함께 쓴다.
줄끝     : 리포에 .gitattributes로 줄끝을 고정한다. 편집 시 기존 줄끝을 보존하고
           파일 전체 줄끝을 통째로 바꾸는 변경을 만들지 않는다.
인용부호 : 곡선 인용부호(“ ” ‘ ’)를 코드·명령에 넣지 않는다. 직선 따옴표만 사용한다.
           PowerShell은 리터럴에 단일 따옴표를 기본으로 하고, 이스케이프 규칙이
           다른 셸/언어 문자열을 그대로 옮기지 않는다.
경로     : 공백 포함 경로를 따옴표로 감싼다. 사용자 로컬 절대경로를 가정하지 않는다.
안전     : pull 전 dirty state를 확인하고, 사용자 변경을 덮는 명령을 제시하지 않는다(A11).
```
### A11.4 검증 스크립트 출력 규약 [HARD]
스크립트 자체의 출력도 최소로 유지한다.
```
성공 : 최종 한 줄만 출력한다.        예) [PASS] design/static/semantic
실패 : 실패 항목만 출력한다. 최대 형식은 다음 4줄이다.
       [FAIL] <게이트> <테스트 ID>
       expected : <값>
       actual   : <값>
       where    : <파일:라인 또는 설계 ID>
```
금지:
```
성공 항목 개별 나열 · 진행률/단계 로그 · 통과한 assertion 출력
동일 원인 실패의 반복 출력 (같은 원인은 1건으로 집계)
전체 trace 덤프 (차이 지점만 출력한다)
```
전체 로그는 파일 또는 CI 아티팩트에 저장하고, 실패 시 그 경로 한 줄만 안내한다.
과잉 출력으로 실패 원인이 묻히면 그 자체를 test defect로 분류한다.
동적 값(branch, SHA, 버전, 설계도 상태)은 rules.md에 넣지 않는다. todo.md에 둔다.
## A12. 세션 간 작업 방식 [HARD]
새 세션은 과거 대화를 기억한다고 가정하지 않는다.
```
rules.md 전문 읽기 -> todo.md 읽기 -> 필요 시 현재 좌표 검증
-> 설계 게이트 확인 -> todo.md 할 일의 첫 미완료 항목부터 계속
```
design.md는 복구 시 전문을 읽지 않는다. todo.md가 지목한 설계 ID만 열어 본다.
이미 문서에 답이 있는 것을 사용자에게 다시 묻지 않는다. 진행 보고는 `한 일 / 할 일`
두 항목으로 짧게 한다.
## A13. 최종 판정 질문 [HARD]
코드 작성·merge 전에 전부 `YES`여야 한다.
```
Q1  item이 1개든 N개든 같은 알고리즘인가?                      [I1]
Q2  1개 변경이 다른 item lifecycle을 건드리지 않는가?          [I2]
Q3  재시작이 정상 ON과 같은 경로인가?                          [I3]
Q4  전역 ON/OFF가 item operation의 반복인가?                   [I4]
Q5  같은 상태 재적용이 무해한가?                               [I5]
Q6  정상 lifecycle 경로가 정확히 하나인가?                     [I6]
Q7  개수 증가가 알고리즘 종류를 늘리지 않는가?                 [I7]
Q8  새 Add-on 추가가 Core/Bridge 수정 없이 되는가?             [I8]
Q9  작업량이 변경분에 비례하는가?                              [I9]
Q10 Bridge가 feature 이름을 몰라도 되는가?                     [I6]
Q11 Add-on은 type/props 의미만 추가하는가?                     [A1.2]
Q12 Core는 generic primitive만 수행하는가?                     [A1.1]
Q13 STATE는 desired state만 저장하는가?                        [I10]
Q14 UI는 desired-state command만 쓰는가?                       [A7]
Q15 design.md가 APPROVED이고 OPEN 항목이 0인가?                [I11]
Q16 이 변경이 구현하는 설계 ID를 특정할 수 있는가?             [I11]
Q17 설계도만 읽은 제3자가 같은 구현에 도달하는가?              [I12]
Q18 기대값의 출처가 D11 골든 trace이고 현재 출력이 아닌가?     [A5]
```
하나라도 `NO`면 구현을 진행하지 않고 해당 결함으로 분류한다(`design defect`,
`design gap`, `architecture defect` 중 하나).
## A14. 이 파일의 목적
```
AI가 세션마다 달라져도
현재 구현이 아무리 오래 살아남았어도
기존 테스트가 전부 PASS였어도
이 파일의 semantic invariant를 위반한 구현을
정상 구조로 인정하지 못하게 하는 것
그리고 구현자가 누구로 바뀌어도
같은 설계도에서 같은 코드가 나오게 하는 것
```
복구에는 rules.md + todo.md 두 파일만 사용한다. 새 권위 문서를 만들지 않는다.
---
# PART B — 이 프로젝트의 좌표 슬롯
Part A의 추상 용어를 이 프로젝트의 실체에 1:1로 매핑한다. **이 표만 프로젝트마다 다시 쓴다.**
여기에 적히지 않은 어휘는 Part A의 규칙 해석에 사용하지 않는다.
```
B1  ENGINE 위치        : web/js/core.js(차트 primitive), web/js/frame.js(자식폼 primitive)
B2  ADDON 위치         : web/js/addons.js(차트 series kind), web/js/screens/<kind>.js(screen kind)
B3  BRIDGE 위치        : web/js/runtime.js(series diff), web/js/desk.js(form diff)
B4  STATE 위치/스키마  : state/workspace.json / schemaVersion 5
B5  primitive 어휘     : chart, series, priceLine, markers, pane, frame, contentHost, rect,
                         zIndex, visibility, titleBar, drag, resize, minimize, maximize, destroy
B6  금지 어휘          : candles, ma, volume, macd, rsi, amount, signals, chartScreen,
                         quote, order, log, 0101, 0615, 8949, 0900, 종목연동, 가상화면정책
B7  item 식별자 규칙   : form은 f<증가정수>, series는 form 내부의 <kind><증가정수>;
                         발급 후 불변·재사용 금지, 카운터는 STATE seq가 소유
B8  effective 계산식   : formEffective = globalOn && form.visible &&
                         (form.allVd || form.vd == activeVd);
                         seriesEffective = formEffective && item.enabled && item.visible
B9  recorder 실행      : 목표 `.venv\Scripts\python.exe check.py --recorder` (현재 미구현)
B10 static gate 실행   : 현재 `.venv\Scripts\python.exe check.py`;
                         목표 `.venv\Scripts\python.exe check.py --static`
B11 semantic gate 실행 : 목표 `.venv\Scripts\python.exe check.py --semantic` (현재 미구현, T1~T13)
B12 acceptance 절차    : start.bat 실행 후 상단 1~8 클릭/Ctrl+1~8, VD별 폼 격리,
                         모든 VD 표시의 동일 위치, 전체/현재 VD 종목연동을 실제 브라우저에서 확인
B13 frozen 경계        : app/store.py의 generic 경로 CRUD, app/main.py의 /api/node 계약,
                         web/vendor/lwc.standalone.js
B14 design.md 위치     : design.md
B15 설계 ID 규칙       : D<1~14>.<영역>.<항목>
B16 추적성 표기 방식   : 공개 함수 바로 위 주석 `// Design: D<번호>.<영역>.<항목>`;
                         Python은 `# Design: ...`, 테스트명은 설계 ID를 포함
B17 T12 수행 방법      : 코드를 보지 않은 새 세션이 design.md만 읽고 공개 시그니처와
                         D11 trace를 재작성한 뒤 check.py --t12가 원본과 비교
B18 canonical fixture  : 목표 state/workspace.v5.fixture.json (현재 미생성)
B19 골든 trace 위치    : 현재 design.md D11;
                         목표 tests/fixtures/desk-traces.json (현재 미생성)
B20 승인 기록 위치     : todo.md `할 일 > 현재 좌표`의 `설계 상태` 필드
B21 검증 실행 절차     : git status --short --branch -> git pull --ff-only ->
                         .venv\Scripts\python.exe check.py -> 최종 상태 1줄
B22 로그 저장 위치     : 목표 artifacts/check.log (현재 미생성)
B23 줄끝 정책          : 목표 .gitattributes의 `* text=auto`,
                         `*.py/*.js/*.json/*.md text eol=lf`, `*.bat/*.ps1 text eol=crlf`;
                         현재 .gitattributes 미생성
B24 확인 필요 항목     : 상단 VD 아이콘의 키움 HTS 유사성, 드래그/리사이즈 조작감,
                         최소화/최대화/겹침 순서, 8개 VD 전환 시 시각적 연속성
```
B5/B6가 비어 있으면 계층 심사를 시작하지 않는다.
B14/B15가 비어 있으면 코드 작업을 시작하지 않는다.
