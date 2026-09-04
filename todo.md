# todo.md

## 한 일

- [x] 2026-09-04 공식 영웅문4 도움말에서 8개 가상화면, 상단 선택란, `Ctrl+1`~`Ctrl+8`, VD별 화면 배치, 전체/현재 VD 종목연동, 모든 VD 동일 위치 표시, 공유그룹·종목연계 동작을 확인했다.
- [x] `rules.md` PART B의 ENGINE/ADDON/BRIDGE/STATE 좌표, 허용·금지 어휘, 식별자, effective, 검증·acceptance 경로를 프로젝트 값으로 채웠다.
- [x] `design.md`를 고정 8개 VD 요구와 D1~D14 형식에 맞춰 재작성하고, 미완료 게이트 때문에 상태를 DRAFT로 교정했다.

## 할 일

REMEDIATION_REQUIRED

현재 좌표

```text
branch       : main
commit       : 0aef1e8d833d6efe873c320b5c0400e7604720d0
worktree     : 이번 문서 변경과 미추적 web/js/bus.js, desk.js, deskspec.js, frame.js,
               screens.js, screens/ 존재; 미추적 제품 코드는 이번 문서 tranche에서 수정하지 않음
STATE        : state/workspace.json schemaVersion 4
대상 스키마  : schemaVersion 5
설계 상태    : DRAFT
OPEN         : 0
게이트       : A2.5 FAIL — C1 산출물과 C3(T12) 미완료, C4 사용자 승인 전
다음 설계 ID : D4.schema.root, D8.hash.canonical, D11.trace.form
```

- [ ] 설계 tranche 1: `state/workspace.v5.fixture.json`과 실제 propsHash가 들어간 `tests/fixtures/desk-traces.json`을 만든다.
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
