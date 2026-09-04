import copy
import json
import os
import tempfile

from . import config

SCHEMA = 3

VDS = {
    "vd1": {"label": "VD1", "code": "005930", "name": "삼성전자"},
    "vd2": {"label": "VD2", "code": "000660", "name": "SK하이닉스"},
    "vd3": {"label": "VD3", "code": "035720", "name": "카카오"},
    "vd4": {"label": "VD4", "code": "005380", "name": "현대차"},
}

_TF_BARSPACING = {"tick": 4, "1m": 8, "5m": 8, "30m": 9,
                  "1d": 10, "1w": 12, "1M": 14}


def default_profile(tf):
    return {
        "panes": [
            {"id": "main", "label": "가격", "h": 300},
            {"id": "vol",  "label": "거래량", "h": 90},
            {"id": "macd", "label": "MACD", "h": 100},
            {"id": "rsi",  "label": "RSI", "h": 95},
            {"id": "amt",  "label": "누적거래대금", "h": 95},
        ],
        "order": ["candles", "ma5", "ma20", "volume", "macd1", "rsi14", "amount1", "signals"],
        "items": {
            "candles": {"kind": "candles", "enabled": True, "visible": True,
                        "props": {"paneId": "main"}},
            "ma5":     {"kind": "ma", "enabled": True, "visible": True,
                        "props": {"paneId": "main", "len": 5, "color": "#e6a0c4", "width": 1}},
            "ma20":    {"kind": "ma", "enabled": True, "visible": True,
                        "props": {"paneId": "main", "len": 20, "color": "#7fb2f0", "width": 1}},
            "volume":  {"kind": "volume", "enabled": True, "visible": True,
                        "props": {"paneId": "vol"}},
            "macd1":   {"kind": "macd", "enabled": True, "visible": True,
                        "props": {"paneId": "macd", "fast": 12, "slow": 26, "signal": 9,
                                  "macdColor": "#5b8def", "signalColor": "#e6a0c4"}},
            "rsi14":   {"kind": "rsi", "enabled": True, "visible": True,
                        "props": {"paneId": "rsi", "len": 14, "color": "#d4b26a",
                                  "upper": 70, "lower": 30}},
            "amount1": {"kind": "amount", "enabled": True, "visible": True,
                        "props": {"paneId": "amt", "color": "#4a9d8f"}},
            "signals": {"kind": "signals", "enabled": False, "visible": True,
                        "props": {"paneId": "main", "fast": 5, "slow": 20}},
        },
        "scale": {"autoScale": True},
        "barSpacing": _TF_BARSPACING.get(tf, 8),
        "ui": {"open": {"panes": True, "main": True}},
    }


def default_state():
    return {"schemaVersion": SCHEMA, "globalOn": True,
            "active": {"vd": "vd1", "code": VDS["vd1"]["code"], "tf": "1m"},
            "vds": copy.deepcopy(VDS), "profiles": {}}


def load():
    p = config.STATE_PATH
    if not p.exists():
        st = default_state()
        save(st)
        return st
    try:
        st = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        st = default_state()
        save(st)
        return st
    if st.get("schemaVersion") != SCHEMA:
        st = default_state()
        save(st)
    st.setdefault("profiles", {})
    st.setdefault("vds", copy.deepcopy(VDS))
    return st


def save(st):
    config.STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(config.STATE_PATH.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as f:
            json.dump(st, f, ensure_ascii=False, indent=1)
        os.replace(tmp, config.STATE_PATH)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def key(vd, code, tf):
    return f"{vd}|{code}|{tf}"


def get_profile(st, vd, code, tf):
    k = key(vd, code, tf)
    if k not in st["profiles"]:
        st["profiles"][k] = default_profile(tf)
        save(st)
    prof = st["profiles"][k]
    prof.setdefault("ui", {"open": {"panes": True, "main": True}})
    return prof


def _merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            _merge(dst[k], v)
        else:
            dst[k] = v
    return dst


def patch_profile(st, vd, code, tf, patch):
    prof = get_profile(st, vd, code, tf)
    _merge(prof, patch)
    save(st)
    return prof


def add_item(st, vd, code, tf, item_id, kind, props, pane):
    prof = get_profile(st, vd, code, tf)
    if item_id in prof["items"]:
        raise KeyError("duplicate id: " + item_id)
    if pane and not any(p["id"] == pane["id"] for p in prof["panes"]):
        prof["panes"].append(pane)
    prof["items"][item_id] = {"kind": kind, "enabled": True, "visible": True, "props": props}
    prof["order"].append(item_id)
    save(st)
    return prof


def remove_item(st, vd, code, tf, item_id):
    prof = get_profile(st, vd, code, tf)
    prof["items"].pop(item_id, None)
    prof["order"] = [i for i in prof["order"] if i != item_id]
    used = {it["props"].get("paneId") for it in prof["items"].values()}
    prof["panes"] = [p for p in prof["panes"] if p["id"] == "main" or p["id"] in used]
    save(st)
    return prof


def remove_pane(st, vd, code, tf, pane_id):
    if pane_id == "main":
        raise ValueError("main pane 삭제 불가")
    prof = get_profile(st, vd, code, tf)
    ids = [i for i, it in prof["items"].items() if it["props"].get("paneId") == pane_id]
    for i in ids:
        prof["items"].pop(i, None)
    prof["order"] = [i for i in prof["order"] if i not in ids]
    prof["panes"] = [p for p in prof["panes"] if p["id"] != pane_id]
    save(st)
    return prof


def set_active(st, vd, code, tf):
    if vd not in st["vds"]:
        raise KeyError("unknown vd: " + vd)
    st["active"] = {"vd": vd, "code": code, "tf": tf}
    st["vds"][vd]["code"] = code
    get_profile(st, vd, code, tf)
    save(st)
    return st["active"]
