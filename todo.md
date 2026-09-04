# todo.md — 한 일 / 할 일
이 파일은 유일한 가변 인수인계 파일이다. 섹션은 **정확히 두 개**만 유지한다.
운영 규칙:
```
현재 좌표(branch/SHA/게이트/설계도 상태)는 '할 일' 첫 블록에 고정 위치로 둔다.
'한 일'은 최근 3 tranche만 유지한다. 그 이전은 1줄 요약으로 접거나 git log로 밀어낸다.
각 항목은 '무엇을 확정했는가 + 왜'로 1~2줄 압축한다. 서사·경위 설명을 쌓지 않는다.
RULE_CONFLICT / NO_PROGRESS / DESIGN_REQUIRED / REMEDIATION_REQUIRED는 '할 일' 최상단.
'재시도 금지' 목록은 반드시 유지한다. 이미 실패한 우회책의 재제안을 막는 유일한 장치다.
설계도 상태가 APPROVED가 아니면 '다음 작업'에 코드 항목을 넣지 않는다.
tranche 종료 시 새 문서를 만들지 않고 이 파일만 갱신한다.
```
## 한 일
- [tranche N] <확정 사항> — 근거: <통과 테스트 ID / 확정 설계 ID / 삭제한 위반 / 판정>
- [tranche N-1] <확정 사항> — 근거: <...>
- [tranche N-2] <확정 사항> — 근거: <...>
- (이전) <한 줄 요약>
## 할 일
**현재 좌표**
```
repo/branch      : <값>
기준 SHA         : <값>
서브모듈/의존 핀 : <값>
설계도 상태      : <DRAFT | REVIEWED | APPROVED>   승인일: <값>
OPEN 항목 수     : <N>   (0이 아니면 코드 금지)
미완성 D 항목    : <D1..D14 중 비어 있는 것>
미구현 설계 ID   : <목록>
초과 구현 목록   : <설계에 없는 공개 동작>
게이트 상태      : design <PASS/FAIL> / static <PASS/FAIL> / semantic <PASS/FAIL>
                   전체 <PASS | REMEDIATION_REQUIRED>
미해결 플래그    : <DESIGN_REQUIRED | RULE_CONFLICT | NO_PROGRESS | 없음>
```
**재시도 금지** (이미 결함으로 판정된 접근)
```
- <접근> : <실패 이유 1줄> : <위반 불변식 ID>
```
**다음 작업** (순서대로, 하나씩)
```
0. (설계 미완 시) 설계 tranche — 목표: <닫을 OPEN 항목 / 확정할 D 항목>
1. <단일 boundary change 1개> — 설계 ID: <값> — 통과 조건: <테스트 ID>
2. <...>
```
**심사 대기 목록** (구조 결함 의심 지점)
```
- <모듈/함수> : <의심 패턴> : <검증할 불변식 ID>
```
