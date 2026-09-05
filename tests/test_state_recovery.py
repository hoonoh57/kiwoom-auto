import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from app import config, store


class StateRecoveryTests(unittest.TestCase):
    """[D4.v6.recovery-mode] Generic byte-preserving persistence tests."""

    def setUp(self):
        self.old_path = config.STATE_PATH
        self.tmp = tempfile.TemporaryDirectory()
        config.STATE_PATH = Path(self.tmp.name) / "workspace.json"

    def tearDown(self):
        config.STATE_PATH = self.old_path
        self.tmp.cleanup()

    def test_status_distinguishes_missing_utf8_json_and_root(self):
        self.assertEqual(store.recovery_status()["errorCode"], "NONE")
        config.STATE_PATH.write_bytes(b"\xff")
        self.assertEqual(store.recovery_status()["errorCode"], "UTF8")
        config.STATE_PATH.write_text("{", encoding="utf-8")
        self.assertEqual(store.recovery_status()["errorCode"], "JSON")
        config.STATE_PATH.write_text("[]", encoding="utf-8")
        self.assertEqual(store.recovery_status()["errorCode"], "ROOT_TYPE")
        config.STATE_PATH.write_text('{"schemaVersion": 6}', encoding="utf-8")
        self.assertEqual(store.recovery_status(), {
            "exists": True, "parseOk": True, "rootObject": True,
            "schemaVersion": 6, "errorCode": "NONE",
        })

    def test_recovery_replace_preserves_exact_bytes_and_increments_backup(self):
        original = b'{\r\n "broken": true\r\n}'
        config.STATE_PATH.write_bytes(original)
        first = store.replace_recovery({"schemaVersion": 6})
        self.assertEqual(first["backup"], "workspace.broken.json")
        self.assertEqual((config.STATE_PATH.parent / first["backup"]).read_bytes(), original)
        second_source = config.STATE_PATH.read_bytes()
        second = store.replace_recovery({"schemaVersion": 6, "n": 2})
        self.assertEqual(second["backup"], "workspace.broken.1.json")
        self.assertEqual((config.STATE_PATH.parent / second["backup"]).read_bytes(), second_source)
        self.assertEqual(json.loads(config.STATE_PATH.read_text(encoding="utf-8"))["n"], 2)

    def test_migration_backup_is_exact_and_never_overwritten(self):
        original = b'{"schemaVersion":5,"keep":"exact"}'
        config.STATE_PATH.write_bytes(original)
        store.save_migrated_v6({"schemaVersion": 6})
        backup = config.STATE_PATH.parent / "workspace.v5.bak"
        self.assertEqual(backup.read_bytes(), original)
        config.STATE_PATH.write_text('{"schemaVersion":5,"later":true}', encoding="utf-8")
        store.save_migrated_v6({"schemaVersion": 6, "second": True})
        self.assertEqual(backup.read_bytes(), original)

    def test_backup_or_save_failure_never_changes_original(self):
        original = b'{"damaged":true}'
        config.STATE_PATH.write_bytes(original)
        with mock.patch.object(store, "_exclusive_copy", side_effect=OSError("backup")):
            with self.assertRaises(OSError):
                store.replace_recovery({"schemaVersion": 6})
        self.assertEqual(config.STATE_PATH.read_bytes(), original)

        with mock.patch.object(store, "save_raw", side_effect=OSError("save")):
            with self.assertRaises(OSError):
                store.replace_recovery({"schemaVersion": 6})
        self.assertEqual(config.STATE_PATH.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
