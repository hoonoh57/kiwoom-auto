# todo.md

## 한 일

- [x] 다종목 캔들의 종목·주기·overlay/pane·독립축·등락률/기준값100 비교 모델과 C1~C5 trace를 설계에 확정했다.
- [x] 사용자가 2026-09-05 다종목 캔들 설계를 APPROVED하고 4축 침범 금지 조건으로 구현을 지시했다.
- [x] 캔들 추가 전 종목·주기·표시·비교 설정 UI를 구현하고 C0 정적 검토와 C1~C5 자동검증을 통과했다.
- [x] LWC의 가시 축 제한에 맞춰 자동 원가격 오버레이를 right/left/compare로 배정하고 좌측 축을 활성화했다.
- [x] 추가 설정을 값 수집/파생 패치의 2단계로 바꿔 schema create 순서 의존을 제거했다.
- [x] STATE patch 렌더를 requestAnimationFrame당 1회로 합쳐 기준값 기록 중 재진입을 차단했다.
- [x] pane 목록과 pane 삭제가 raw props 대신 Add-on normalize 결과를 사용하도록 통일했다.

## 할 일

REMEDIATION_REQUIRED

현재 좌표

```text
branch       : main
commit       : 5469472 feat-add-multi-symbol-candle-comparison
worktree     : 가시 축·렌더 합병·정규화 pane 판정 보완 변경 존재
STATE        : state/workspace.json schemaVersion 5
대상 스키마  : schemaVersion 5
설계 상태    : APPROVED (다종목 캔들 범위)
OPEN         : 0
게이트       : 다종목 캔들 자동검증에 자동축 right/left/compare trace 추가; 실제 브라우저 acceptance 대기
다음 설계 ID : D3.chart.candle-source, D5.candles.compare,
               D7.chart.data-diff, D11.trace.multi-symbol-candles
```

- [ ] 설계 tranche 1: `state/workspace.v5.fixture.json`과 실제 propsHash가 들어간 `tests/fixtures/desk-traces.json`을 만든다.
- [x] 다종목 캔들 C1~C5 overlay/pane/locality/idempotence 자동검증을 구현했다.
- [ ] 실제 브라우저에서 캔들 속성 편집, 다종목 오버레이, 등락률/기준값100, 서브차트를 확인한다.
- [ ] 현재 `check.py`의 `[PASS]`는 C1~C7 보조 static 결과뿐이므로 ARCH PASS로 해석하지 않는다.
- [ ] architecture defect: 미추적 `desk.js`의 desired가 `z`만 사용해 `globalOn`, `form.visible`,
      다른 VD 소속 `allVd` 폼을 반영하지 않는다(D7/D9, I3~I5).
- [ ] architecture defect: 미추적 `desk.js#setCode`가 `link`와 `shareGroup`을 무시하고
      `allVd`를 현재 VD 종목연동 범위에 강제로 포함한다(D7.link.diff).
- [ ] design defect: 미추적 `desk.js` hash가 재귀 키 정렬·오류 조건·8자리 padding을
      구현하지 않고 operation recorder도 A5 event 스키마가 아니다(D8/D11).
- [ ] design gap: 미추적 `screens.js`의 log 화면번호 `1001`이 설계의 `0900`과 다르다.
- [ ] 설계 tranche 2: `check.py`에 `--static`, `--semantic`, `--recorder`, `--t12` 계약과 T1~T13을 구현한다.
- [ ] 설계 tranche 3: 코드를 보지 않은 독립 검토로 T12 공개 시그니처·골든 trace 일치 여부를 판정한다.
- [ ] T12 PASS 후 상태를 REVIEWED로 바꾸고 사용자에게 설계 승인을 요청한다.
- [ ] APPROVED 이후 첫 구현 tranche에서 기존 미연결 `web/js/deskspec.js`의 VD 무제한·추가 로직을 고정 `vd1`~`vd8` 설계로 교정한다.
- [ ] 이후 `frame.js` ENGINE → `desk.js` BRIDGE → screen ADDON 순으로 한 경계씩 구현한다.

재시도 금지

- 설계가 DRAFT인 동안 제품 코드 수정
- `app.js`에 자식폼 lifecycle 또는 screen kind 분기 추가
- `frame.js`/`core.js`에 chart, quote, order 같은 feature 의미 추가
- `desk.js`/`runtime.js`에 kind별 분기나 복원 전용 경로 추가
- VD를 종목 소유자로 되돌리거나 `allVd` 폼을 VD마다 복제 저장
- 기존 `state/workspace.v4.bak` 덮어쓰기 또는 schema 4 원본 파괴
