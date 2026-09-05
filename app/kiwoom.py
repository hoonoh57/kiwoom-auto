# Design: D5.rest-api.contract, D10.rest-api.errors
import math
import re
import threading
import time
from datetime import datetime, timedelta, timezone

import httpx
from . import config

KST = timezone(timedelta(hours=9))
CHARTS = {
    'tick': ('ka10079', 'stk_tic_chart_qry'),
    '1m': ('ka10080', 'stk_min_pole_chart_qry'),
    '5m': ('ka10080', 'stk_min_pole_chart_qry'),
    '30m': ('ka10080', 'stk_min_pole_chart_qry'),
    '1d': ('ka10081', 'stk_dt_pole_chart_qry'),
    '1w': ('ka10082', 'stk_stk_pole_chart_qry'),
    '1M': ('ka10083', 'stk_mth_pole_chart_qry'),
}

# Design: D10.rest-api.errors
class KiwoomError(Exception):
    pass


def _number(row, key, unsigned=False):
    try:
        value = float(str(row[key]).strip().replace(',', ''))
        if not math.isfinite(value):
            raise ValueError()
        return abs(value) if unsigned else value
    except (KeyError, TypeError, ValueError):
        raise KiwoomError(f'Invalid numeric field: {key}') from None


def _stamp(value):
    try:
        text = str(value)
        fmt = '%Y%m%d%H%M%S' if len(text) == 14 else '%Y%m%d'
        return int(datetime.strptime(text, fmt).replace(tzinfo=KST).timestamp())
    except (TypeError, ValueError):
        raise KiwoomError('Invalid KST timestamp') from None


def _symbol(code):
    if not re.fullmatch(r'[0-9]{6}', code):
        raise KiwoomError('Invalid stock code')


# Design: D5.rest-api.contract
class LiveAdapter:
    mode = 'live'

    def __init__(self):
        self._tok = None
        self._exp = 0
        self._lock = threading.RLock()
        self._next = 0

    def _post(self, path, **kwargs):
        delay = self._next - time.monotonic()
        if delay > 0:
            time.sleep(delay)
        self._next = time.monotonic() + 1.2
        try:
            response = httpx.post(config.BASE + path, timeout=15, **kwargs)
        except httpx.HTTPError:
            raise KiwoomError('Kiwoom connection failed') from None
        try:
            data = response.json()
        except ValueError:
            raise KiwoomError(f'Kiwoom non-JSON response (HTTP {response.status_code})') from None
        if not isinstance(data, dict):
            raise KiwoomError('Invalid Kiwoom response object')
        return response, data

    def _token(self):
        if self._tok and time.time() < self._exp - 60:
            return self._tok
        if not (config.APPKEY and config.SECRETKEY):
            raise KiwoomError('KIWOOM_APPKEY / KIWOOM_SECRETKEY 미설정')
        r, d = self._post('/oauth2/token', json={
            'grant_type': 'client_credentials', 'appkey': config.APPKEY, 'secretkey': config.SECRETKEY})
        if not r.is_success or str(d.get('return_code', 0)) != '0' or not d.get('token'):
            raise KiwoomError(f"Kiwoom token rejected (HTTP {r.status_code}, code {d.get('return_code')})")
        self._exp = _stamp(d.get('expires_dt'))
        self._tok = d['token']
        return self._tok

    def _call(self, ep, trid, body, cont='N', key='', retry=True):
        with self._lock:
            for attempt in range(2 if retry else 1):
                token = self._token()
                r, d = self._post(ep, headers={
                    'authorization': f'Bearer {token}', 'api-id': trid,
                    'cont-yn': cont, 'next-key': key,
                    'Content-Type': 'application/json;charset=UTF-8'}, json=body)
                rc = str(d.get('return_code', 'missing'))
                if (r.status_code == 401 or rc == '8005') and retry and attempt == 0:
                    self._tok = None
                    continue
                if not r.is_success or rc not in ('0', '000000'):
                    raise KiwoomError(f'{trid}: HTTP {r.status_code}, Kiwoom code {rc}')
                return d, r.headers.get('cont-yn', 'N'), r.headers.get('next-key', '')

    def _pages(self, trid, body, list_key, ep, count=None, since=0):
        cont, key = 'N', ''
        seen = set()
        rows = []
        for _ in range(20):
            d, cont, next_key = self._call(ep, trid, body, cont, key)
            batch = d.get(list_key)
            if not isinstance(batch, list):
                raise KiwoomError(f'{trid}: missing array {list_key}')
            rows.extend(batch)
            if count is not None:
                times = {_stamp(r.get('cntr_tm') or r.get('dt')) for r in rows}
                if len(times) >= count or (since and any(t <= since for t in times)):
                    return d, rows
            if cont != 'Y' or not next_key:
                return d, rows
            if next_key in seen:
                raise KiwoomError(f'{trid}: repeated continuation key')
            seen.add(next_key)
            key = next_key
        raise KiwoomError(f'{trid}: pagination limit exceeded')

    # Design: D5.rest-api.contract
    def candles(self, code, tf, count=None, since=0):
        _symbol(code)
        if tf not in CHARTS:
            raise KiwoomError('Unknown timeframe')
        limit = min(config.MAX_BARS, max(1, count or config.FETCH_COUNT))
        trid, list_key = CHARTS[tf]
        body = {'stk_cd': code, 'upd_stkpc_tp': '1'}
        if tf == 'tick' or tf.endswith('m'):
            body['tic_scope'] = '1' if tf == 'tick' else tf[:-1]
        else:
            body['base_dt'] = datetime.now(KST).strftime('%Y%m%d')
        _, rows = self._pages(trid, body, list_key, config.EP['chart'], limit, since)
        out = {}
        for row in rows:
            ts = _stamp(row.get('cntr_tm') or row.get('dt'))
            if ts in out or (since and ts <= since):
                continue
            out[ts] = {'time': ts, 'open': _number(row, 'open_pric', True),
                       'high': _number(row, 'high_pric', True), 'low': _number(row, 'low_pric', True),
                       'close': _number(row, 'cur_prc', True), 'volume': _number(row, 'trde_qty', True)}
        return [out[t] for t in sorted(out)[-limit:]]

    # Design: D5.rest-api.contract
    def quote(self, code):
        _symbol(code)
        d, _, _ = self._call(config.EP['quote'], 'ka10001', {'stk_cd': code})
        return {'code': code, 'price': _number(d, 'cur_prc', True),
                'change': _number(d, 'pred_pre'), 'rate': _number(d, 'flu_rt'),
                'volume': _number(d, 'trde_qty', True)}

    # Design: D5.rest-api.contract
    def order(self, code, side, qty, price):
        _symbol(code)
        if side not in ('BUY', 'SELL') or qty <= 0 or not math.isfinite(price) or price < 0:
            raise KiwoomError('Invalid order')
        body = {'dmst_stex_tp': 'KRX', 'stk_cd': code, 'ord_qty': str(qty),
                'ord_uv': '' if price == 0 else str(int(price)), 'trde_tp': '3' if price == 0 else '0'}
        d, _, _ = self._call(config.EP['order'], config.TRID['buy' if side == 'BUY' else 'sell'], body, retry=False)
        if not d.get('ord_no'):
            raise KiwoomError('Missing order number; verify order status before resubmitting')
        return {'ok': True, 'orderNo': d['ord_no'], 'code': code, 'side': side,
                'qty': qty, 'price': price, 'mode': 'live'}

    # Design: D5.rest-api.contract
    def balance(self):
        cash, _, _ = self._call(config.EP['balance'], 'kt00001', {'qry_tp': '3'})
        d, rows = self._pages('kt00018', {'qry_tp': '1', 'dmst_stex_tp': 'KRX'},
                              'acnt_evlt_remn_indv_tot', config.EP['balance'])
        return {'cash': _number(cash, 'entr'), 'eval': _number(d, 'tot_evlt_amt'),
                'pnl': _number(d, 'tot_evlt_pl'), 'positions': [
                    {'code': r['stk_cd'], 'name': r['stk_nm'], 'qty': _number(r, 'rmnd_qty'),
                     'avg': _number(r, 'pur_pric')} for r in rows], 'mode': 'live'}


_inst = LiveAdapter()

# Design: D5.rest-api.contract
def get():
    return _inst
