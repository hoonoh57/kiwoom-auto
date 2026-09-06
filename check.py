"""Design: D11.v6.check-runner. Run only requested verification gates."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys

R = pathlib.Path(__file__).resolve().parent
fail = []


def add(gate, tid, exp, act, where):
    fail.append((gate, tid, exp, act, where))


def read(path):
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return ""


# Design: D11.v6.check-runner

def static_gate():
    for name in ("rules.md", "README.md", "todo.md", "app/store.py", "app/main.py", "web/js/screens.js"):
        if not (R / name).is_file():
            add("static", "FILES", "required file", "missing", name)
    # ---- C1: 서버(STATE)는 kind/screen/축 이름을 모른다 (A1.4) ----
    WORDS = ["candles", "volume", "macd", "rsi", "amount", "signals",
             "paneId", "barSpacing", "screen", "form", "chart"]
    for f in sorted((R / "app").rglob("*.py")):
        if f.is_relative_to(R / "app" / "addons"):
            continue  # B2 permits feature vocabulary in registered server add-ons.
        if f.name in ("strategy.py", "kiwoom.py", "data.py", "config.py", "check.py"):
            continue
        txt = read(f)
        hit = [w for w in WORDS if re.search(r"[\"']%s[\"']" % w, txt)]
        if hit:
            add("static", "C1", "no feature words", ",".join(hit), f"app/{f.name}")

    # ---- C2: Current inner-workspace schema and canonical fixture ----
    for source, fixture in (("web/js/deskspec.js", "state/workspace.v6.fixture.json"),
                            ("web/js/project-state.js", "state/workspace.v7.fixture.json")):
        if source.endswith("project-state.js") and not (R / source).exists():
            continue
        text = read(R / source)
        match = re.search(r"PROJECT_SCHEMA\s*=\s*(\d+)", text)
        try:
            schema = json.loads(read(R / fixture))["schemaVersion"]
        except (ValueError, KeyError, TypeError):
            schema = None
        if match is None or schema is None or int(match.group(1)) != schema:
            add("static", "C2", str(schema), match.group(1) if match else "missing schema", source)

    # ---- C3: 무조건 geo 복원 금지 (D6/D7) ----
    GEO_CALLS = r"\b(scrollToRealTime|setBarSpacing|setPaneStretch|setPaneHeight)\s*\("
    for name in ("runtime.js", "desk.js", "frame.js"):
        p = R / "web" / "js" / name
        if not p.exists():
            add("static", "FILES", "required file", "missing", str(p.relative_to(R)))
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
                    add("static", "C3", "inside if(geo) block",
                        m2.group(1) + "()", f"web/js/{name}:{line}")
                    i += m2.end() - 1
            i += 1

    # ---- C4: BRIDGE/ENGINE 계층에 kind 분기 금지 (A1.3) ----
    for name in ("runtime.js", "desk.js", "frame.js", "core.js"):
        p = R / "web" / "js" / name
        if not p.exists():
            add("static", "FILES", "required file", "missing", str(p.relative_to(R)))
            continue
        for i, line in enumerate(read(p).splitlines(), 1):
            if re.search(r"(kind|screen)\s*===\s*['\"]", line):
                add("static", "C4", "feature-blind", line.strip()[:60], f"web/js/{name}:{i}")

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
            add("static", "C6", "unique screen no", ",".join(dup), "web/js/screens.js")

    # ---- C7: 상시 문서 정원 3개 (A0.1) ----
    allowed = {"rules.md", "todo.md", "README.md"}
    extra = sorted(p.name for p in R.glob("*.md") if p.name not in allowed)
    if extra:
        add("static", "C7", "rules/todo/README only", ",".join(extra), "repo root")



JS_TESTS = (
    "chart-selection-v6.mjs", "chart-stability-v6.mjs", "chart-time-v6.mjs",
    "desk-bridge-v6.mjs", "deskspec-v6.mjs", "frame-v6.mjs",
    "indicator-sync-v6.mjs", "multisymbol-candles.mjs", "state-projection-v6.mjs",
    "ui-slots-v6.mjs", "workspace-tools-v6.mjs",
    "project-envelope-a.mjs", "project-envelope-b.mjs",
)


# Design: D11.v6.check-runner

def run_child(gate, label, command, log, env=None):
    try:
        result = subprocess.run(command, cwd=R, env=env, capture_output=True,
                                text=True, encoding="utf-8", errors="replace", timeout=60)
        log.write(f"[{gate}] {label} exit={result.returncode}\n")
        log.write(result.stdout + result.stderr + "\n")
        log.flush()
        if result.returncode:
            add(gate, label, "exit 0", f"exit {result.returncode}; see artifacts/check.log", label)
            return False
        return True
    except (OSError, subprocess.TimeoutExpired) as exc:
        log.write(f"[{gate}] {label}: {type(exc).__name__}\n")
        log.flush()
        add(gate, label, "completed test", type(exc).__name__, label)
        return False


# Design: D11.v6.check-runner

def review_gate(log, scope="foundation-r7"):
    path = R / f"tests/reference/{scope}.t12-review.json"
    where = str(path.relative_to(R))
    if not path.is_file():
        add("t12", "MISSING_REVIEW", "independent design reconstruction and comparison", "not performed", where)
        return
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
        assert report["schemaVersion"] == 1 and report["scope"] == scope
        assert isinstance(report["reviewer"]["id"], str) and report["reviewer"]["id"]
        assert report["reviewer"]["independent"] is True
        assert sorted(report["readFiles"]) == ["README.md", "rules.md"]
        assert report["verdict"] in ("PASS", "FAIL")
        assert isinstance(report["signatures"], list) and report["signatures"]
        assert isinstance(report["scenarios"], list) and report["scenarios"]
        assert isinstance(report["mismatches"], list)
        source_pairs = [("rules.md", "rulesSha256")]
        scoped_ends = {"project-envelope-a": "D14.foundation-r7.review",
                       "project-envelope-b": "D7.project-storage.followup"}
        if scope in scoped_ends:
            source = json.loads((R / f"tests/reference/{scope}.review-source.json").read_text(encoding="utf-8"))["readme"]
            assert hashlib.sha256(source.encode("utf-8")).hexdigest() == report["readmeSha256"]
            def section(text):
                text = text.replace("\r\n", "\n")
                start = text.index(f"## D1.{scope} —")
                end = text.index("\n## " + scoped_ends[scope], start)
                return text[start:end]
            if section(source) != section((R / "README.md").read_text(encoding="utf-8")):
                add("t12", "STALE_REVIEW", "unchanged reviewed scope", "scope changed", where)
        else:
            source_pairs.append(("README.md", "readmeSha256"))
        for name, field in source_pairs:
            if hashlib.sha256((R / name).read_bytes()).hexdigest() != report[field]:
                add("t12", "STALE_REVIEW", "review of current " + name, "source changed", where)
        if fail and fail[-1][0] == "t12":
            return
        blockers = [row for row in report["mismatches"] if row["severity"] == "blocking"]
        log.write(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        if report["verdict"] == "FAIL" or blockers:
            ids = ",".join(str(row["id"]) for row in blockers)
            add("t12", "DESIGN_MISMATCH", "zero blocking independent findings", f"{len(blockers)} blocking: {ids}", where)
            return
        if scope in scoped_ends:
            expected = json.loads((R / f"tests/fixtures/{scope}.contract.json").read_text(encoding="utf-8"))
            signatures = [x.removesuffix(" (sync)") for x in report["signatures"]]
            assert signatures == expected["publicSignatures"]
            scenarios = {x["id"]: x["expected"] for x in report["scenarios"]}
            count = 12 if scope == "project-envelope-a" else 14
            assert len(scenarios) == len(report["scenarios"]) == len(expected["reviewAssertions"]) == count
            for ident, values in expected["reviewAssertions"].items():
                assert all(scenarios[ident][key] == value for key, value in values.items())
            return
        expected = json.loads((R / "tests/fixtures/foundation-r7.contract.json").read_text(encoding="utf-8"))
        # Positive comparison requires literal signatures and scenarios, not a PASS label.
        if not expected.get("publicSignatures"):
            add("t12", "INCOMPLETE_CONTRACT", "literal publicSignatures", "missing", "tests/fixtures/foundation-r7.contract.json")
            return
        if report["signatures"] != expected["publicSignatures"]:
            add("t12", "SIGNATURES", "independent signatures equal design contract", "mismatch", where)
        comparison = [{"id": c["id"], "inputs": c["inputs"], "expected": {
            "lifecycle": c["lifecycle"], "engine": c["engine"], "assertions": c["assertions"]}}
            for c in expected["cases"]]
        if report["scenarios"] != comparison:
            add("t12", "SCENARIOS", "independent scenarios equal design contract", "mismatch", where)
    except (OSError, UnicodeError, ValueError, KeyError, TypeError, AttributeError, AssertionError):
        add("t12", "INVALID_REVIEW", "complete independent review evidence", "invalid or unreadable", where)


# Design: D11.v6.check-runner

def main(argv=None):
    fail.clear()
    parser = argparse.ArgumentParser(description=__doc__)
    for gate in ("static", "semantic", "recorder", "t12"):
        parser.add_argument("--" + gate, action="store_true")
    parser.add_argument("--t12-scope", choices=("foundation-r7", "project-envelope-a", "project-envelope-b"), default="foundation-r7")
    args = parser.parse_args(argv)
    if args.t12_scope != "foundation-r7" and not args.t12:
        parser.error("--t12-scope requires --t12")
    chosen = [g for g in ("static", "semantic", "recorder", "t12") if getattr(args, g)] or ["static"]
    artifacts = R / "artifacts"
    try:
        artifacts.mkdir(exist_ok=True)
        with (artifacts / "check.log").open("w", encoding="utf-8") as log:
            for gate in chosen:
                before = len(fail)
                if gate == "static":
                    static_gate()
                elif gate == "semantic":
                    for name in JS_TESTS:
                        run_child(gate, name, ["node", str(R / "tests" / name)], log)
                    for name in ("test_kiwoom_rest.py", "test_state_recovery.py", "test_check_runner.py"):
                        if (R / "tests" / name).is_file():
                            run_child(gate, name, [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", name, "-v"], log)
                        else:
                            add(gate, name, "test file", "missing", name)
                elif gate == "recorder":
                    target = artifacts / "desk-recorder.v6.json"
                    target.unlink(missing_ok=True)
                    env = dict(os.environ, DESK_RECORDER_OUTPUT=str(target))
                    if run_child(gate, "desk-bridge-v6.mjs", ["node", str(R / "tests/desk-bridge-v6.mjs")], log, env):
                        try:
                            payload = json.loads(target.read_text(encoding="utf-8"))
                            assert payload["schemaVersion"] == 1 and payload["harnesses"]
                            assert any(row["events"] for row in payload["harnesses"])
                        except (OSError, ValueError, KeyError, TypeError, AssertionError):
                            add(gate, "TRACE", "fresh recorder artifact", "missing or invalid", str(target))
                else:
                    review_gate(log, args.t12_scope)
                if len(fail) == before:
                    label = f"{gate} ({args.t12_scope})" if gate == "t12" and args.t12_scope != "foundation-r7" else gate
                    print(f"[PASS] {label}")
                    log.write(f"[PASS] {label}\n")
                else:
                    for item in fail[before:]:
                        log.write(repr(item) + "\n")
                        g, tid, exp, act, where = item
                        print(f"[FAIL] {g} {tid}\nexpected : {exp}\nactual   : {act}\nwhere    : {where}")
    except OSError as exc:
        print(f"[FAIL] runner LOG\nexpected : writable artifacts/check.log\nactual   : {type(exc).__name__}\nwhere    : artifacts/check.log")
        return 1
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
