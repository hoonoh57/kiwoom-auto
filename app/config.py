import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

MODE = os.getenv("KIWOOM_MODE", "mock").strip().lower()
APPKEY = os.getenv("KIWOOM_APPKEY", "").strip()
SECRETKEY = os.getenv("KIWOOM_SECRETKEY", "").strip()
USE_PAPER = os.getenv("KIWOOM_USE_PAPER", "1").strip() == "1"
ACCOUNT = os.getenv("KIWOOM_ACCOUNT", "").strip()

HOST = os.getenv("APP_HOST", "127.0.0.1")
PORT = int(os.getenv("APP_PORT", "8777"))

BASE = "https://mockapi.kiwoom.com" if USE_PAPER else "https://api.kiwoom.com"

STATE_PATH = ROOT / "state" / "workspace.json"
DATA_DIR = ROOT / "data"
WEB_DIR = ROOT / "web"

FRESH_SEC = int(os.getenv("DATA_FRESH_SEC", "20"))
STALE_BLOCK_SEC = int(os.getenv("ORDER_STALE_BLOCK_SEC", "180"))
MAX_BARS = 1200
FETCH_COUNT = 600

TFSEC = {"tick": 0, "1m": 60, "5m": 300, "30m": 1800,
         "1d": 86400, "1w": 604800, "1M": 2592000}
TFLABEL = {"tick": "틱", "1m": "1분", "5m": "5분", "30m": "30분",
           "1d": "일", "1w": "주", "1M": "월"}

EP = {
    "token": "/oauth2/token",
    "chart": "/api/dostk/chart",
    "quote": "/api/dostk/stkinfo",
    "order": "/api/dostk/ordr",
    "balance": "/api/dostk/acnt",
}

TRID = {
    "tick": "ka10079", "min": "ka10080", "1d": "ka10081",
    "1w": "ka10082", "1M": "ka10083",
    "quote": "ka10001", "buy": "kt10000", "sell": "kt10001",
    "balance": "kt00018",
}


def align(ts: int, tf: str) -> int:
    s = TFSEC[tf]
    return ts if s == 0 else (ts // s) * s
