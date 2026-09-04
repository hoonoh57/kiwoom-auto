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
