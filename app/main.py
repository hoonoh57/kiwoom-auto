import time

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, data, kiwoom, state, strategy

app = FastAPI(title="kiwoom-auto")

_REQ = ["load", "save", "get_profile", "patch_profile", "set_active",
        "add_item", "remove_item", "remove_pane"]
_missing = [n for n in _REQ if not hasattr(state, n)]
if _missing:
    raise RuntimeError("state 모듈 함수 누락: " + ", ".join(_missing))


def _bars(code, tf, force=False):
    rec = data.load(code, tf)
    if force or not data.is_fresh(rec):
        try:
            rows = kiwoom.get().candles(code, tf, since=rec["lastTs"])
            if not rec["bars"] and not rows:
                rows = kiwoom.get().candles(code, tf, since=0)
            rec = data.merge(rec, rows, tf)
            rec["fetched"] = True
        except Exception as e:
            rec["fetched"] = False
            rec["error"] = str(e)
    else:
        rec["fetched"] = False
    return rec


@app.get("/api/health")
def health():
    return {"ok": True, "mode": kiwoom.get().mode, "paper": config.USE_PAPER,
            "base": config.BASE, "tf": list(config.TFSEC), "tfLabel": config.TFLABEL}


@app.get("/api/state")
def get_state():
    return state.load()


class Active(BaseModel):
    vd: str
    code: str
    tf: str


@app.patch("/api/state/active")
def patch_active(a: Active):
    if a.tf not in config.TFSEC:
        raise HTTPException(400, "unknown tf: " + a.tf)
    st = state.load()
    try:
        return state.set_active(st, a.vd, a.code, a.tf)
    except KeyError as e:
        raise HTTPException(400, str(e))
    except AttributeError as e:
        raise HTTPException(500, "state 모듈 함수 누락: " + str(e))


@app.get("/api/profile")
def get_profile(vd: str, code: str, tf: str):
    if tf not in config.TFSEC:
        raise HTTPException(400, "unknown tf")
    st = state.load()
    return {"key": state.key(vd, code, tf),
            "profile": state.get_profile(st, vd, code, tf), "globalOn": st["globalOn"]}


@app.patch("/api/profile")
def patch_profile(vd: str, code: str, tf: str, patch: dict):
    if tf not in config.TFSEC:
        raise HTTPException(400, "unknown tf")
    st = state.load()
    return state.patch_profile(st, vd, code, tf, patch)


class NewItem(BaseModel):
    id: str
    kind: str
    props: dict
    pane: dict | None = None


@app.post("/api/profile/item")
def create_item(vd: str, code: str, tf: str, it: NewItem):
    st = state.load()
    try:
        return state.add_item(st, vd, code, tf, it.id, it.kind, it.props, it.pane)
    except KeyError as e:
        raise HTTPException(409, str(e))


@app.delete("/api/profile/item")
def delete_item(vd: str, code: str, tf: str, id: str):
    st = state.load()
    return state.remove_item(st, vd, code, tf, id)


@app.delete("/api/profile/pane")
def delete_pane(vd: str, code: str, tf: str, paneId: str):
    st = state.load()
    try:
        return state.remove_pane(st, vd, code, tf, paneId)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/api/bars")
def get_bars(code: str, tf: str, force: int = 0):
    if tf not in config.TFSEC:
        raise HTTPException(400, "unknown tf")
    rec = _bars(code, tf, force=bool(force))
    return {"code": code, "tf": tf, "bars": rec["bars"], "live": rec["live"],
            "lastTs": rec["lastTs"], "barsHash": rec["barsHash"],
            "fetchedAt": rec["fetchedAt"], "fetched": rec.get("fetched", False),
            "error": rec.get("error")}


@app.get("/api/quote")
def get_quote(code: str):
    try:
        return kiwoom.get().quote(code)
    except Exception as e:
        raise HTTPException(502, str(e))


@app.get("/api/signals")
def get_signals(code: str, tf: str, fast: int = 5, slow: int = 20):
    rec = _bars(code, tf)
    return {"eval": strategy.evaluate(rec["bars"], fast, slow),
            "markers": strategy.markers(rec["bars"], fast, slow),
            "barsHash": rec["barsHash"]}


@app.get("/api/balance")
def get_balance():
    try:
        return kiwoom.get().balance()
    except Exception as e:
        raise HTTPException(502, str(e))


class Order(BaseModel):
    code: str
    side: str
    qty: int
    price: float = 0
    tf: str = "1m"


@app.post("/api/order")
def post_order(o: Order):
    if o.side not in ("BUY", "SELL") or o.qty <= 0:
        raise HTTPException(400, "side/qty 오류")
    rec = data.load(o.code, o.tf)
    age = int(time.time()) - int(rec.get("fetchedAt", 0))
    if not rec["bars"] or age > config.STALE_BLOCK_SEC:
        raise HTTPException(409, f"데이터 신선도 초과({age}s) - 주문 차단")
    try:
        return kiwoom.get().order(o.code, o.side, o.qty, o.price)
    except Exception as e:
        raise HTTPException(502, str(e))


@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)


@app.middleware("http")
async def no_cache(request, call_next):
    resp = await call_next(request)
    if request.url.path.startswith("/web") or request.url.path == "/":
        resp.headers["Cache-Control"] = "no-store"
    return resp


app.mount("/web", StaticFiles(directory=str(config.WEB_DIR)), name="web")


@app.get("/")
def index():
    return FileResponse(str(config.WEB_DIR / "index.html"))
