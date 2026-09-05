import json
import os
import tempfile
import threading
import time

from . import config

_DEL = "__delete__"
_LOCK = threading.RLock()


def _parts(path):
    return [s for s in (path or "").split("/") if s]


def _load_raw():
    p = config.STATE_PATH
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_raw(root):
    config.STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(config.STATE_PATH.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            json.dump(root, f, ensure_ascii=False, indent=1, sort_keys=True)
        for i in range(6):
            try:
                os.replace(tmp, config.STATE_PATH)
                return
            except PermissionError:
                if i == 5:
                    raise
                time.sleep(0.05)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


# Design: D4.v6.recovery-mode
def recovery_status():
    """Inspect the state bytes without applying the legacy empty-object fallback."""
    with _LOCK:
        p = config.STATE_PATH
        if not p.exists():
            return {"exists": False, "parseOk": True, "rootObject": True,
                    "schemaVersion": None, "errorCode": "NONE"}
        try:
            raw = p.read_bytes()
        except OSError:
            return {"exists": True, "parseOk": False, "rootObject": False,
                    "schemaVersion": None, "errorCode": "IO"}
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            return {"exists": True, "parseOk": False, "rootObject": False,
                    "schemaVersion": None, "errorCode": "UTF8"}
        try:
            value = json.loads(text)
        except (TypeError, ValueError):
            return {"exists": True, "parseOk": False, "rootObject": False,
                    "schemaVersion": None, "errorCode": "JSON"}
        root_ok = isinstance(value, dict)
        schema = value.get("schemaVersion") if root_ok else None
        return {"exists": True, "parseOk": True, "rootObject": root_ok,
                "schemaVersion": schema, "errorCode": "NONE" if root_ok else "ROOT_TYPE"}


# Design: D4.v6.recovery-mode
def recovery_raw():
    with _LOCK:
        if not config.STATE_PATH.exists():
            raise FileNotFoundError(str(config.STATE_PATH))
        return config.STATE_PATH.read_bytes()


def _backup_path(stem, suffix):
    parent = config.STATE_PATH.parent
    first = parent / f"{stem}{suffix}"
    if not first.exists():
        return first
    n = 1
    while True:
        candidate = parent / f"{stem}.{n}{suffix}"
        if not candidate.exists():
            return candidate
        n += 1


def _exclusive_copy(path, raw):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as f:
        f.write(raw)
        f.flush()
        os.fsync(f.fileno())


# Design: D4.v6.recovery-mode
def replace_recovery(root):
    """Back up exact old bytes, then atomically replace with a JSON object."""
    if not isinstance(root, dict):
        raise TypeError("root object required")
    with _LOCK:
        backup = None
        if config.STATE_PATH.exists():
            old = config.STATE_PATH.read_bytes()
            backup_path = _backup_path("workspace.broken", ".json")
            _exclusive_copy(backup_path, old)
            backup = backup_path.name
        save_raw(root)
        return {"ok": True, "backup": backup}


# Design: D4.v6.migration-v5
def save_migrated_v6(root):
    """Save a migrated root after preserving the first v5 source exactly once."""
    if not isinstance(root, dict):
        raise TypeError("root object required")
    with _LOCK:
        source = config.STATE_PATH
        backup = source.parent / "workspace.v5.bak"
        if source.exists() and not backup.exists():
            old = source.read_bytes()
            try:
                parsed = json.loads(old.decode("utf-8"))
            except (UnicodeDecodeError, ValueError):
                raise ValueError("v5 source is not valid JSON")
            if isinstance(parsed, dict) and parsed.get("schemaVersion") == 5:
                _exclusive_copy(backup, old)
        save_raw(root)


def _walk(root, parts, create=False):
    cur = root
    for k in parts:
        nxt = cur.get(k)
        if not isinstance(nxt, dict):
            if not create:
                return None
            nxt = {}
            cur[k] = nxt
        cur = nxt
    return cur


def _merge(dst, src):
    for k, v in src.items():
        if v == _DEL:
            dst.pop(k, None)
        elif isinstance(v, dict) and isinstance(dst.get(k), dict):
            _merge(dst[k], v)
        else:
            dst[k] = v
    return dst


def get(path):
    with _LOCK:
        return _walk(_load_raw(), _parts(path)) or {}


def patch(path, body):
    with _LOCK:
        root = _load_raw()
        node = _walk(root, _parts(path), create=True)
        _merge(node, body)
        save_raw(root)
        return node


def put(path, value):
    with _LOCK:
        parts = _parts(path)
        if not parts:
            save_raw(value)
            return value
        root = _load_raw()
        parent = _walk(root, parts[:-1], create=True)
        parent[parts[-1]] = value
        save_raw(root)
        return value


def delete(path):
    with _LOCK:
        parts = _parts(path)
        if not parts:
            return {"ok": False, "error": "root delete denied"}
        root = _load_raw()
        parent = _walk(root, parts[:-1])
        if parent:
            parent.pop(parts[-1], None)
            save_raw(root)
        return {"ok": True}
