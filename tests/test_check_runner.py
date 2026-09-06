"""Design: D11.v6.check-runner — fail closed and report executed gates only."""
import contextlib
import io
import json
import pathlib
import subprocess
import tempfile
import unittest
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
