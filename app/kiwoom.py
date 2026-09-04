import hashlib
import math
import time

import httpx

from . import config


class KiwoomError(Exception):
    pass


def _noise(*parts):
    h = hashlib.sha1("|".join(str(p) for p in parts).encode()).digest()
    return (int.from_bytes(h[:4], "big") / 0xFFFFFFFF) * 2 - 1


class MockAdapter:
    """버킷 인덱스의 순수 함수. 재생성 시 과거 봉이 흔들리지 않음."""
    mode = "mock"

    def _base(self, code):
        return 20000 + (int(hashlib.sha1(code.encode()).hexdigest()[:6], 16) % 130000)

    def _bar(self, code, tf, k):
        base = self._base(code)
        ph = _noise(code, tf) * 3.14
        drift = 0.060 * math.sin(k / 37.0 + ph) + 0.030 * math.sin(k / 11.0 + ph * 2) \
                + 0.012 * math.sin(k / 3.0 + ph * 3)
        c = base * (1 + drift + 0.004 * _noise(code, tf, k))
        o = base * (1 + drift + 0.004 * _noise(code, tf, k - 1))
        hi = max(o, c) * (1 + 0.0035 * abs(_noise(code, tf, k, "h")))
        lo = min(o, c) * (1 - 0.0035 * abs(_noise(code, tf, k, "l")))
        vol = int(120000 + 90000 * abs(_noise(code, tf, k, "v")))
        r = 1 if base > 50000 else 10
        f = lambda x: round(x / r) * r
        return {"time": 0, "open": f(o), "high": f(hi), "low": f(lo),
                "close": f(c), "volume": vol}

    def candles(self, code, tf, count=None, since=0):
        count = count or config.FETCH_COUNT
        step = config.TFSEC[tf] or 3
        end = config.align(int(time.time()), tf) if config.TFSEC[tf] else int(time.time())
        k_end = end // step
        rows = []
        for i in range(count - 1, -1, -1):
            k = k_end - i
            t = k * step
            if since and t <= since:
                continue
            b = self._bar(code, tf, k)
            b["time"] = t
            rows.append(b)
        return rows

    def quote(self, code):
        rows = self.candles(code, "1m", count=2)
        cur, prev = rows[-1], rows[0]
        chg = cur["close"] - prev["close"]
        return {"code": code, "price": cur["close"], "change": chg,
                "rate": round(chg / prev["close"] * 100, 2), "volume": cur["volume"]}

    def order(self, code, side, qty, price):
        return {"ok": True, "orderNo": f"MOCK{int(time.time()) % 1000000:06d}",
                "code": code, "side": side, "qty": qty, "price": price, "mode": "mock"}

    def balance(self):
        return {"cash": 10000000, "eval": 0, "pnl": 0, "positions": [], "mode": "mock"}


class LiveAdapter:
    mode = "live"

    def __init__(self):
        if not (config.APPKEY and config.SECRETKEY):
            raise KiwoomError("APPKEY/SECRETKEY 미설정")
        self._tok = None
        self._exp = 0

    def _token(self):
        if self._tok and time.time() < self._exp - 60:
            return self._tok
        r = httpx.post(config.BASE + config.EP["token"], timeout=10,
                       json={"grant_type": "client_credentials",
                             "appkey": config.APPKEY, "secretkey": config.SECRETKEY})
        r.raise_for_status()
        d = r.json()
        tok = d.get("token") or d.get("access_token")
        if not tok:
            raise KiwoomError(f"token 응답 파싱 실패: {list(d)[:6]}")
        self._tok = tok
        self._exp = time.time() + int(d.get("expires_in", 3600) or 3600)
        return tok

    def _call(self, ep, trid, body):
        h = {"authorization": f"Bearer {self._token()}", "api-id": trid,
             "cont-yn": "N", "next-key": "", "Content-Type": "application/json;charset=UTF-8"}
        r = httpx.post(config.BASE + ep, headers=h, json=body, timeout=15)
        r.raise_for_status()
        d = r.json()
        if str(d.get("return_code", "0")) not in ("0", "000000"):
            raise KiwoomError(f"{trid}: {d.get('return_msg')}")
        return d

    def candles(self, code, tf, count=None, since=0):
        if tf == "tick":
            trid, body = config.TRID["tick"], {"stk_cd": code, "tic_scope": "1", "upd_stkpc_tp": "1"}
        elif tf in ("1m", "5m", "30m"):
            trid = config.TRID["min"]
            body = {"stk_cd": code, "tic_scope": tf.replace("m", ""), "upd_stkpc_tp": "1"}
        else:
            trid = config.TRID[tf]
            body = {"stk_cd": code, "base_dt": time.strftime("%Y%m%d"), "upd_stkpc_tp": "1"}
        d = self._call(config.EP["chart"], trid, body)
        rows = next((v for v in d.values() if isinstance(v, list)), None)
        if rows is None:
            raise KiwoomError("차트 배열 없음")
        out = []
        for r in rows:
            t = self._ts(r, tf)
            if t is None or (since and t <= since):
                continue
            out.append({"time": t,
                        "open": abs(float(r.get("open_pric") or r.get("cur_prc") or 0)),
                        "high": abs(float(r.get("high_pric") or 0)),
                        "low": abs(float(r.get("low_pric") or 0)),
                        "close": abs(float(r.get("cur_prc") or 0)),
                        "volume": abs(float(r.get("trde_qty") or 0))})
        out.sort(key=lambda x: x["time"])
        return out

    @staticmethod
    def _ts(r, tf):
        s = str(r.get("cntr_tm") or r.get("dt") or "")
        try:
            if len(s) >= 14:
                return int(time.mktime(time.strptime(s[:14], "%Y%m%d%H%M%S")))
            if len(s) == 8:
                return int(time.mktime(time.strptime(s, "%Y%m%d")))
        except Exception:
            return None
        return None

    def quote(self, code):
        d = self._call(config.EP["quote"], config.TRID["quote"], {"stk_cd": code})
        return {"code": code, "price": abs(float(d.get("cur_prc") or 0)),
                "change": float(d.get("pred_pre") or 0),
                "rate": float(d.get("flu_rt") or 0),
                "volume": abs(float(d.get("trde_qty") or 0))}

    def order(self, code, side, qty, price):
        trid = config.TRID["buy" if side == "BUY" else "sell"]
        body = {"dmst_stex_tp": "KRX", "stk_cd": code, "ord_qty": str(qty),
                "ord_uv": "" if price <= 0 else str(int(price)),
                "trde_tp": "3" if price <= 0 else "0"}
        d = self._call(config.EP["order"], trid, body)
        return {"ok": True, "orderNo": d.get("ord_no", ""), "code": code,
                "side": side, "qty": qty, "price": price, "mode": "live"}

    def balance(self):
        d = self._call(config.EP["balance"], config.TRID["balance"],
                       {"qry_tp": "1", "dmst_stex_tp": "KRX"})
        rows = next((v for v in d.values() if isinstance(v, list)), []) or []
        return {"cash": float(d.get("entr") or 0), "eval": float(d.get("tot_evlt_amt") or 0),
                "pnl": float(d.get("tot_evlt_pl") or 0),
                "positions": [{"code": r.get("stk_cd"), "name": r.get("stk_nm"),
                               "qty": float(r.get("rmnd_qty") or 0),
                               "avg": float(r.get("pur_pric") or 0)} for r in rows],
                "mode": "live"}


_inst = None


def get():
    global _inst
    if _inst is None:
        _inst = LiveAdapter() if config.MODE == "live" else MockAdapter()
    return _inst
