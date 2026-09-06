"""Design: D11.v6.check-runner — fail closed and report executed gates only."""
import contextlib
import hashlib
import io
import json
import pathlib
import subprocess
import tempfile
import unittest
import shutil
from unittest.mock import patch

import check


class CheckRunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.root_patch = patch.object(check, "R", self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        check.fail.clear()

    def invoke(self, args):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = check.main(args)
        return code, output.getvalue()

    def test_missing_inputs_cannot_pass_static(self):
        code, output = self.invoke([])
        self.assertEqual(code, 1)
        self.assertIn("[FAIL] static", output)
        self.assertNotIn("[PASS]", output)

    def test_unperformed_review_fails_without_running_other_gates(self):
        with patch.object(check.subprocess, "run") as child:
            code, output = self.invoke(["--t12"])
        self.assertEqual(code, 1)
        self.assertIn("MISSING_REVIEW", output)
        self.assertNotIn("[PASS]", output)
        child.assert_not_called()

    def test_unknown_flag_is_rejected(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as raised:
            check.main(["--semantci"])
        self.assertEqual(raised.exception.code, 2)

    def review_fixture(self, verdict="PASS", mismatches=None):
        # Synthetic reviewer data exists only inside this temporary test root.
        for name in ("README.md", "rules.md"):
            (self.root / name).write_text("fixture", encoding="utf-8")
        expected = {"publicSignatures": ["probe() -> value"], "cases": [
            {"id": "example", "inputs": [], "lifecycle": [], "engine": [], "assertions": {}}]}
        report = {"schemaVersion": 1, "scope": "foundation-r7",
                  "reviewer": {"id": "synthetic-test-only", "independent": True},
                  "readFiles": ["rules.md", "README.md"],
                  "readmeSha256": hashlib.sha256(b"fixture").hexdigest(),
                  "rulesSha256": hashlib.sha256(b"fixture").hexdigest(),
                  "verdict": verdict, "signatures": expected["publicSignatures"],
                  "scenarios": [{"id": "example", "inputs": [], "expected": {
                      "lifecycle": [], "engine": [], "assertions": {}}}],
                  "mismatches": mismatches or []}
        for path, obj in (("tests/reference/foundation-r7.t12-review.json", report),
                          ("tests/fixtures/foundation-r7.contract.json", expected)):
            p = self.root / path
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(obj), encoding="utf-8")
        return report

    def test_review_findings_fail_even_with_pass_label(self):
        self.review_fixture(mismatches=[{"id": "B1", "severity": "blocking", "message": "ambiguous"}])
        code, output = self.invoke(["--t12"])
        self.assertEqual(code, 1)
        self.assertIn("DESIGN_MISMATCH", output)

    def test_review_bound_to_current_document_bytes(self):
        self.review_fixture()
        (self.root / "README.md").write_text("changed")
        code, output = self.invoke(["--t12"])
        self.assertEqual(code, 1)
        self.assertIn("STALE_REVIEW", output)

    def test_review_pass_requires_reconstructed_contract_match(self):
        report = self.review_fixture()
        code, output = self.invoke(["--t12"])
        self.assertEqual((code, output.strip()), (0, "[PASS] t12"))
        report["signatures"] = ["different()"]
        p = self.root / "tests/reference/foundation-r7.t12-review.json"
        p.write_text(json.dumps(report), encoding="utf-8")
        code, output = self.invoke(["--t12"])
        self.assertEqual(code, 1)
        self.assertIn("SIGNATURES", output)

    def test_pass_label_does_not_replace_literal_contract(self):
        self.review_fixture()
        p = self.root / "tests/fixtures/foundation-r7.contract.json"
        obj = json.loads(p.read_text(encoding="utf-8"))
        del obj["publicSignatures"]
        p.write_text(json.dumps(obj), encoding="utf-8")
        code, output = self.invoke(["--t12"])
        self.assertEqual(code, 1)
        self.assertIn("INCOMPLETE_CONTRACT", output)

    def copy_scoped_evidence(self):
        source = pathlib.Path(__file__).resolve().parent.parent
        names = ("README.md", "rules.md",
                 "tests/reference/project-envelope-a.t12-review.json",
                 "tests/reference/project-envelope-a.review-source.json",
                 "tests/fixtures/project-envelope-a.contract.json")
        for name in names:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / name, target)

    def test_scoped_review_tracks_its_text_not_unrelated_sections(self):
        self.copy_scoped_evidence()
        args = ["--t12", "--t12-scope", "project-envelope-a"]
        code, output = self.invoke(args)
        self.assertEqual(code, 0)
        self.assertIn("[PASS] t12 (project-envelope-a)", output)
        path = self.root / "README.md"
        text = path.read_text(encoding="utf-8")
        path.write_text("Unrelated introduction\n" + text, encoding="utf-8")
        self.assertEqual(self.invoke(args)[0], 0)
        path.write_text(text.replace("### D2.project-envelope-a.boundary", "### D2.project-envelope-a.boundary changed"), encoding="utf-8")
        code, output = self.invoke(args)
        self.assertEqual(code, 1)
        self.assertIn("STALE_REVIEW", output)

    def test_scoped_review_rejects_expected_value_drift(self):
        self.copy_scoped_evidence()
        path = self.root / "tests/fixtures/project-envelope-a.contract.json"
        contract = json.loads(path.read_text(encoding="utf-8"))
        contract["reviewAssertions"]["PEA3"]["throwsSynchronously"] = "INVALID_ARGUMENT"
        path.write_text(json.dumps(contract), encoding="utf-8")
        code, output = self.invoke(["--t12", "--t12-scope", "project-envelope-a"])
        self.assertEqual(code, 1)
        self.assertIn("INVALID_REVIEW", output)

    def test_child_failure_and_timeout_are_failures(self):
        cases = [subprocess.CompletedProcess(["node"], 9, "", "failure"),
                 subprocess.TimeoutExpired(["node"], 60), FileNotFoundError()]
        for result in cases:
            with self.subTest(result=type(result).__name__):
                check.fail.clear()
                options = {"side_effect": result} if isinstance(result, Exception) else {"return_value": result}
                with patch.object(check.subprocess, "run", **options):
                    ok = check.run_child("semantic", "test", ["node"], io.StringIO())
                self.assertFalse(ok)
                self.assertEqual(check.fail[0][0], "semantic")

    def test_old_recorder_file_cannot_turn_failed_run_into_pass(self):
        target = self.root / "artifacts/desk-recorder.v6.json"
        target.parent.mkdir()
        target.write_text(json.dumps({"schemaVersion": 1, "harnesses": [{"events": [{"op": "ensure"}]}]}))
        with patch.object(check.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "", "")):
            code, output = self.invoke(["--recorder"])
        self.assertEqual(code, 1)
        self.assertIn("TRACE", output)
        self.assertFalse(target.exists())

    def test_default_runs_static_only(self):
        names = ["rules.md", "README.md", "todo.md", "app/store.py", "app/main.py",
                 "web/js/screens.js", "web/js/runtime.js", "web/js/desk.js", "web/js/frame.js", "web/js/core.js"]
        for name in names:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("", encoding="utf-8")
        (self.root / "web/js/deskspec.js").write_text("export const PROJECT_SCHEMA = 6;")
        (self.root / "state").mkdir()
        (self.root / "state/workspace.v6.fixture.json").write_text('{"schemaVersion":6}')
        with patch.object(check.subprocess, "run") as child:
            code, output = self.invoke([])
        self.assertEqual(code, 0)
        self.assertEqual(output.strip(), "[PASS] static")
        child.assert_not_called()


if __name__ == "__main__":
    unittest.main()
