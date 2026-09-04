MIN_BARS = 40
MIN_GAP_PCT = 0.15


def ma(bars, n, i):
    if i + 1 < n:
        return None
    return sum(b["close"] for b in bars[i + 1 - n:i + 1]) / n


def evaluate(bars, fast=5, slow=20):
    if len(bars) < max(MIN_BARS, slow + 2):
        return {"signal": "NO_TRADE", "reason": f"봉 부족 ({len(bars)}<{max(MIN_BARS, slow + 2)})"}
    i = len(bars) - 1
    f0, s0 = ma(bars, fast, i), ma(bars, slow, i)
    f1, s1 = ma(bars, fast, i - 1), ma(bars, slow, i - 1)
    if None in (f0, s0, f1, s1):
        return {"signal": "NO_TRADE", "reason": "이동평균 계산 불가"}
    gap = abs(f0 - s0) / s0 * 100
    if gap < MIN_GAP_PCT:
        return {"signal": "NO_TRADE", "reason": f"이격 {gap:.3f}% < {MIN_GAP_PCT}%"}
    if f1 <= s1 < f0:
        return {"signal": "BUY", "reason": f"골든크로스, 이격 {gap:.2f}%"}
    if f1 >= s1 > f0:
        return {"signal": "SELL", "reason": f"데드크로스, 이격 {gap:.2f}%"}
    return {"signal": "NO_TRADE", "reason": "교차 없음"}


def markers(bars, fast=5, slow=20):
    out = []
    for i in range(slow + 1, len(bars)):
        f0, s0 = ma(bars, fast, i), ma(bars, slow, i)
        f1, s1 = ma(bars, fast, i - 1), ma(bars, slow, i - 1)
        if None in (f0, s0, f1, s1):
            continue
        if abs(f0 - s0) / s0 * 100 < MIN_GAP_PCT:
            continue
        if f1 <= s1 < f0:
            out.append({"time": bars[i]["time"], "position": "belowBar",
                        "color": "#26a69a", "shape": "arrowUp", "text": "B"})
        elif f1 >= s1 > f0:
            out.append({"time": bars[i]["time"], "position": "aboveBar",
                        "color": "#ef5350", "shape": "arrowDown", "text": "S"})
    return out[-200:]
