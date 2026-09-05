// Design: D5.v6.market-time-display
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const seconds = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
function asDate(time) {
  if (typeof time === 'number') return new Date(time * 1000);
  if (typeof time === 'string') return new Date(time + 'T00:00:00+09:00');
  return new Date(Date.UTC(time.year, time.month - 1, time.day) - 9 * 3600000);
}
// Design: D5.v6.market-time-display
export function marketTimeOptions(tf) {
  const intraday = tf === 'tick' || ['1m', '5m', '30m'].includes(tf);
  const formatter = tf === 'tick' ? seconds : clock;
  return {
    localization: { locale: 'ko-KR', timeFormatter: time => {
      const d = asDate(time);
      return date.format(d) + (intraday ? ' ' + formatter.format(d) : '');
    } },
    timeScale: { timeVisible: intraday, secondsVisible: tf === 'tick', tickMarkFormatter: time => {
      const d = asDate(time);
      return intraday ? formatter.format(d) : date.format(d).slice(2);
    } },
  };
}
