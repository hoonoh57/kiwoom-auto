# Design: D3.market-symbol-d.types
import time
import re
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, data, kiwoom, store, strategy

app = FastAPI(title="kiwoom-auto")


def _bars(code, tf, force=False):
    if not re.fullmatch(r"[0-9]{6}(?:_(?:AL|NX))?", code) or tf not in config.TFSEC:
        raise HTTPException(400, "invalid code/tf")
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


# Design: D10.rest-api.errors
@app.get("/api/health")
def health():
    return {"ok": True, "mode": kiwoom.get().mode, "paper": config.USE_PAPER,
            "configured": bool(config.APPKEY and config.SECRETKEY),
            "error": None if config.APPKEY and config.SECRETKEY else "키움 API 인증 설정 필요",
            "source": config.SOURCE, "base": config.BASE, "tf": list(config.TFSEC), "tfLabel": config.TFLABEL}


@app.get("/api/node")
def node_get(path: str = ""):
    return store.get(unquote(path))


@app.patch("/api/node")
def node_patch(body: dict, path: str = ""):
    return store.patch(unquote(path), body)


@app.delete("/api/node")
def node_delete(path: str):
    return store.delete(unquote(path))


# Design: D4.v6.recovery-mode
@app.get("/api/state/recovery")
def state_recovery():
    return store.recovery_status()


# Design: D4.v6.recovery-mode
@app.get("/api/state/recovery/raw")
def state_recovery_raw():
    try:
        raw = store.recovery_raw()
    except FileNotFoundError:
        raise HTTPException(404, "state file not found")
    return Response(content=raw, media_type="application/octet-stream",
                    headers={"Content-Disposition": "attachment; filename=workspace.json"})


# Design: D4.v6.recovery-mode
@app.put("/api/state/recovery")
def state_recovery_put(body: dict):
    try:
        return store.replace_recovery(body)
    except (OSError, TypeError, ValueError) as exc:
        raise HTTPException(500, str(exc))


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
    if not re.fullmatch(r"[0-9]{6}", o.code) or o.tf not in config.TFSEC:
        raise HTTPException(400, "invalid code/tf")
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
