# Design: D11.rest-api.acceptance
import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
import httpx
from app import config, data, kiwoom


def response(body, status=200, **headers):
    return httpx.Response(status, json=body, headers=headers)


def bar(stamp='20260904153000', price='-70000'):
    return dict(cntr_tm=stamp, open_pric='-69000', high_pric='+71000',
                low_pric='68000', cur_prc=price, trde_qty='1,234')


class RestTests(unittest.TestCase):
    # Design: D11.market-symbol-d.vectors MSD2-MSD5
    def test_market_symbol_d_suffix_name_and_order_boundary(self):
        paths = [data._path(code, '5m') for code in ['005930', '005930_AL', '005930_NX']]
        self.assertEqual(len(set(paths)), 3)
        for code in ['../005930', '005930_XX', '005930_al', '005930_AL/x']:
            with self.assertRaises(ValueError): data._path(code, '5m')
        for code in ['005930_AL', '005930_NX']:
            with patch.object(config, 'USE_PAPER', True), patch.object(self.adapter, '_call') as call:
                with self.assertRaisesRegex(kiwoom.KiwoomError, 'KRX'):
                    self.adapter.quote(code)
                with self.assertRaisesRegex(kiwoom.KiwoomError, 'KRX'):
                    self.adapter.candles(code, '5m')
                call.assert_not_called()
            with patch.object(config, 'USE_PAPER', False), patch.object(self.adapter, '_call') as call:
                call.return_value=({'stk_nm':' 삼성전자 ', 'cur_prc':'10','pred_pre':'1','flu_rt':'1','trde_qty':'2'},'N','')
                self.assertEqual(self.adapter.quote(code)['name'], '삼성전자')
                self.assertEqual(call.call_args.args[2]['stk_cd'], code)
                with self.assertRaisesRegex(kiwoom.KiwoomError, 'Invalid stock code'):
                    self.adapter.order(code,'BUY',1,0)
                self.assertEqual(call.call_count,1)
            with patch.object(config,'USE_PAPER',False), patch.object(self.adapter,'_pages',return_value=({},[bar()])) as pages:
                self.assertEqual(len(self.adapter.candles(code,'5m')),1)
                self.assertEqual(pages.call_args.args[1]['stk_cd'],code)

    # Design: D11.rest-api.acceptance
    def setUp(self):
        self.settings = patch.multiple(config, APPKEY='fixture-key', SECRETKEY='fixture-secret')
        self.settings.start()
        self.sleep = patch.object(kiwoom.time, 'sleep')
        self.sleep.start()
        self.addCleanup(self.settings.stop)
        self.addCleanup(self.sleep.stop)
        self.adapter = kiwoom.LiveAdapter()
        self.adapter._tok = 'fixture-token'
        self.adapter._exp = 9999999999

    def test_D11_rest_no_mock_fallback_missing_credentials(self):
        with patch.multiple(config, APPKEY='', SECRETKEY=''), patch.object(kiwoom.httpx, 'post') as post:
            self.adapter._tok = None
            with self.assertRaises(kiwoom.KiwoomError):
                self.adapter.quote('005930')
            post.assert_not_called()
        self.assertFalse(hasattr(kiwoom, 'MockAdapter'))

    def test_D11_rest_token_single_issue_and_kst(self):
        self.adapter._tok = None
        replies = lambda url, **kw: response({'token':'fixture', 'expires_dt':'20990101090000'}) if url.endswith('/token') else response({'return_code':0, 'cur_prc':'-10', 'pred_pre':'-2', 'flu_rt':'-1.2', 'trde_qty':'123'})
        with patch.object(kiwoom.httpx, 'post', side_effect=replies) as post:
            with ThreadPoolExecutor(max_workers=4) as pool:
                rows = list(pool.map(self.adapter.quote, ['005930']*4))
            self.assertEqual(sum(c.args[0].endswith('/token') for c in post.call_args_list), 1)
        self.assertEqual(rows[0]['price'], 10)
        self.assertEqual(rows[0]['change'], -2)
        self.assertEqual(self.adapter._exp, 4070908800)

    def test_D11_rest_retry_reads_once_and_never_orders(self):
        with patch.object(kiwoom.httpx, 'post', side_effect=[
            response({'return_code':8005}), response({'token':'fixture','expires_dt':'20990101090000'}),
            response({'return_code':0,'cur_prc':'1','pred_pre':'0','flu_rt':'0','trde_qty':'0'})]) as post:
            self.assertEqual(self.adapter.quote('005930')['price'], 1)
            self.assertEqual(post.call_count, 3)
        with patch.object(kiwoom.httpx, 'post', return_value=response({'return_code':8005})) as post:
            with self.assertRaises(kiwoom.KiwoomError):
                self.adapter.order('005930','BUY',1,0)
            self.assertEqual(post.call_count, 1)

    def test_D11_rest_chart_keys_pagination_duplicates_and_signs(self):
        key = kiwoom.CHARTS['1m'][1]
        with patch.object(kiwoom.httpx, 'post', side_effect=[
            response({'return_code':0,key:[bar()]}, **{'cont-yn':'Y','next-key':'page2'}),
            response({'return_code':0,key:[bar(price='999'),bar('20260904152900')]})]) as post:
            rows = self.adapter.candles('005930','1m',count=2)
            self.assertEqual(len(rows),2)
            self.assertEqual(rows[-1]['close'],70000)
            self.assertEqual(rows[-1]['volume'],1234)
            self.assertLess(rows[0]['time'],rows[1]['time'])
            self.assertEqual(post.call_args.kwargs['headers']['next-key'],'page2')
        for tf, (_, key) in kiwoom.CHARTS.items():
            with self.subTest(tf=tf), patch.object(kiwoom.httpx, 'post', return_value=response({'return_code':0,key:[bar()]})):
                self.assertEqual(len(self.adapter.candles('005930',tf)),1)
        with patch.object(kiwoom.httpx, 'post', return_value=response({'return_code':0,'wrong':[bar()]})):
            with self.assertRaises(kiwoom.KiwoomError): self.adapter.candles('005930','1m')

    def test_D11_rest_repeated_key_partial_failure_and_invalid_fields(self):
        key=kiwoom.CHARTS['1m'][1]
        for replies in ([response({'return_code':0,key:[bar()]},**{'cont-yn':'Y','next-key':'same'})]*2,
                        [response({'return_code':0,key:[bar()]},**{'cont-yn':'Y','next-key':'next'}),response({'return_code':1700})],
                        [response({'return_code':0,key:[bar(price='NaN')]})]):
            with patch.object(kiwoom.httpx,'post',side_effect=replies):
                with self.assertRaises(kiwoom.KiwoomError): self.adapter.candles('005930','1m')

    def test_D11_rest_cash_separate_from_holdings(self):
        with patch.object(kiwoom.httpx,'post',side_effect=[response({'return_code':0,'entr':'12345'}),response({'return_code':0,'tot_evlt_amt':'400','tot_evlt_pl':'-50','acnt_evlt_remn_indv_tot':[]})]) as post:
            value=self.adapter.balance()
            self.assertEqual(value['cash'],12345)
            self.assertEqual(value['pnl'],-50)
            self.assertEqual([c.kwargs['headers']['api-id'] for c in post.call_args_list],['kt00001','kt00018'])

    def test_D11_rest_cache_source_isolation_and_original_preserved(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(config,'DATA_DIR',Path(tmp)):
            original=Path(tmp)/'005930_1m.json'
            original.write_text('{"schemaVersion":1,"bars":[{"close":999}]}')
            before=original.read_bytes()
            rec=data.load('005930','1m')
            self.assertEqual(rec['bars'],[])
            rec['bars']=[{'time':1,'open':1,'high':1,'low':1,'close':1,'volume':1}]
            data.save(rec)
            self.assertEqual(len(data.load('005930','1m')['bars']),1)
            with patch.object(config,'SOURCE','kiwoom-real'):
                self.assertEqual(data.load('005930','1m')['bars'],[])
            self.assertEqual(original.read_bytes(),before)

    def test_D11_rest_failure_preserves_fetched_timestamp(self):
        from app import main
        with tempfile.TemporaryDirectory() as tmp, patch.object(config,'DATA_DIR',Path(tmp)):
            rec=data.load('005930','1m'); rec['fetchedAt']=10; data.save(rec)
            with patch.object(kiwoom.get(),'candles',side_effect=kiwoom.KiwoomError('offline')):
                result=main._bars('005930','1m',True)
            self.assertEqual(result['fetchedAt'],10)
            self.assertEqual(result['bars'],[])
            self.assertEqual(result['error'],'offline')

if __name__ == '__main__':
    unittest.main()
