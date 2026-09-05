# Design: D4.rest-api.cache
import hashlib
import json
import os
import re
import tempfile
import time

from . import config


def _path(code, tf):
    if not re.fullmatch(r"[0-9]{6}", code) or tf not in config.TFSEC:
        raise ValueError("Invalid market cache key")
    return config.DATA_DIR / config.SOURCE / f"{code}_{tf}.json"


def _empty(code, tf):
    return {"schemaVersion": 2, "source": config.SOURCE, "code": code, "tf": tf, "bars": [],
            "live": None, "lastTs": 0, "fetchedAt": 0, "barsHash": "0"}


def bars_hash(bars):
    if not bars:
        return "0"
    h = hashlib.sha1()
    for b in bars:
        h.update(f"{b['time']}|{b['open']}|{b['high']}|{b['low']}|{b['close']}|{b['volume']};".encode())
    return h.hexdigest()[:16]


def load(code, tf):
    p = _path(code, tf)
    if not p.exists():
        return _empty(code, tf)
    try:
        rec = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return _empty(code, tf)
    if not isinstance(rec, dict) or rec.get("schemaVersion") != 2 or rec.get("source") != config.SOURCE or rec.get("code") != code or rec.get("tf") != tf:
        return _empty(code, tf)
    rec.setdefault("live", None)
    rec.setdefault("fetchedAt", 0)
    return rec


def save(rec):
    _path(rec["code"], rec["tf"]).parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(_path(rec["code"], rec["tf"]).parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            json.dump(rec, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, _path(rec["code"], rec["tf"]))
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def is_fresh(rec):
    return (int(time.time()) - int(rec.get("fetchedAt", 0))) < config.FRESH_SEC


def split_live(rows, tf):
    s = config.TFSEC[tf]
    now = int(time.time())
    if s == 0:
        return rows, None
    confirmed = [r for r in rows if r["time"] + s <= now]
    pending = [r for r in rows if r["time"] + s > now]
    return confirmed, (pending[-1] if pending else None)


def merge(rec, rows, tf):
    confirmed, live = split_live(rows, tf)
    idx = {b["time"]: b for b in rec["bars"]}
    for b in confirmed:
        idx[b["time"]] = b
    bars = [idx[t] for t in sorted(idx)][-config.MAX_BARS:]
    rec["bars"] = bars
    rec["lastTs"] = bars[-1]["time"] if bars else 0
    rec["live"] = live
    rec["fetchedAt"] = int(time.time())
    rec["barsHash"] = bars_hash(bars)
    save(rec)
    return rec
