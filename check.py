"""정적 규칙 게이트. start.bat 선행 실행용. 출력은 A11.4 규약을 따른다."""
import json
import pathlib
import re
import sys

R = pathlib.Path(__file__).resolve().parent
fail = []


def add(gate, tid, exp, act, where):
    fail.append((gate, tid, exp, act, where))


def read(p):
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return ""


# ---- C1: 서버(STATE)는 kind/screen/축 이름을 모른다 (A1.4) ----
WORDS = ["candles", "volume", "macd", "rsi", "amount", "signals",
         "paneId", "barSpacing", "screen", "form", "chart"]
for f in sorted((R / "app").rglob("*.py")):
    if f.name in ("strategy.py", "kiwoom.py", "data.py", "config.py", "check.py"):
        continue
    txt = read(f)
    hit = [w for w in WORDS if re.search(r"[\"']%s[\"']" % w, txt)]
    if hit:
        add("static", "C1", "no feature words", ",".join(hit), f"app/{f.name}")

# ---- C2: 코드 스키마 == README.md 대상 스키마 ----
spec = read(R / "web" / "js" / "deskspec.js") or read(R / "web" / "js" / "statespec.js")
m = re.search(r"PROJECT_SCHEMA\s*=\s*(\d+)", spec)
d = re.search(r"대상 스키마:\s*schemaVersion\s*(\d+)", read(R / "README.md"))
if m and d and m.group(1) != d.group(1):
    add("design", "C2", d.group(1), m.group(1), "deskspec.js:PROJECT_SCHEMA")

# ---- C3: 무조건 geo 복원 금지 (D6/D7) ----
GEO_CALLS = r"\b(scrollToRealTime|setBarSpacing|setPaneStretch|setPaneHeight)\s*\("
for name in ("runtime.js", "desk.js", "frame.js"):
    p = R / "web" / "js" / name
    if not p.exists():
        continue
    src = read(p)
    src = re.sub(r"//[^\n]*", "", src)
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    guards = []
    line = 1
    i = 0
    while i < len(src):
        ch = src[i]
        if ch == "\n":
            line += 1
        elif ch == "{":
            head = src[max(0, i - 200):i]
            guards.append(bool(re.search(r"\bif\s*\([^()]*\bgeo\b[^()]*\)\s*$", head)))
        elif ch == "}":
            if guards:
                guards.pop()
        else:
            m2 = re.match(GEO_CALLS, src[i:])
            if m2 and not any(guards):
                add("semantic", "C3", "inside if(geo) block",
                    m2.group(1) + "()", f"web/js/{name}:{line}")
                i += m2.end() - 1
        i += 1

# ---- C4: BRIDGE/ENGINE 계층에 kind 분기 금지 (A1.3) ----
for name in ("runtime.js", "desk.js", "frame.js", "core.js"):
    p = R / "web" / "js" / name
    if not p.exists():
        continue
    for i, line in enumerate(read(p).splitlines(), 1):
        if re.search(r"(kind|screen)\s*===\s*['\"]", line):
            add("semantic", "C4", "feature-blind", line.strip()[:60], f"web/js/{name}:{i}")

# ---- C5: bat/ps1 는 ASCII (A11.3) ----
for f in list(R.glob("*.bat")) + list(R.glob("*.ps1")):
    b = f.read_bytes()
    if any(x > 127 for x in b):
        add("static", "C5", "ascii only", "non-ascii byte", f.name)

# ---- C6: screen 화면번호 전역 유일 (D3) ----
sc = read(R / "web" / "js" / "screens.js")
if sc:
    nos = re.findall(r"no:\s*['\"](\d{4})['\"]", sc)
    dup = sorted({n for n in nos if nos.count(n) > 1})
    if dup:
        add("design", "C6", "unique screen no", ",".join(dup), "web/js/screens.js")

# ---- C7: 상시 문서 정원 3개 (A0.1) ----
allowed = {"rules.md", "todo.md", "README.md"}
extra = sorted(p.name for p in R.glob("*.md") if p.name not in allowed)
if extra:
    add("static", "C7", "rules/todo/design only", ",".join(extra), "repo root")

if not fail:
    print("[PASS] design/static/semantic")
    sys.exit(0)

seen = set()
for gate, tid, exp, act, where in fail:
    key = (tid, act)
    if key in seen:
        continue
    seen.add(key)
    print(f"[FAIL] {gate} {tid}")
    print(f"expected : {exp}")
    print(f"actual   : {act}")
    print(f"where    : {where}")
sys.exit(1)
