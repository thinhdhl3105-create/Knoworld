// v49: thời tiết thật ở TP.HCM cho Knoworld City — Open-Meteo (miễn phí, không cần key, cho phép gọi từ trình duyệt).
// Kết quả được nhớ 10 phút trong sessionStorage để chuyển trang không phải gọi lại.
const URL_WX = 'https://api.open-meteo.com/v1/forecast?latitude=10.8231&longitude=106.6297'
  + '&current=temperature_2m,precipitation,weather_code,cloud_cover,is_day&timezone=Asia%2FBangkok';
const KEY = 'kw_live_wx', TTL = 10 * 60 * 1000;

// Mã thời tiết WMO -> mức mưa 0..1 (điều khiển mưa, mây và sấm chớp trong thành phố)
export function readWeather(cur) {
  if (!cur) return null;
  const code = +cur.weather_code, mm = +cur.precipitation || 0;
  let kind = 'clear', rain = 0, thunder = false;
  if (code >= 95) { kind = 'storm'; rain = 1; thunder = true; }
  else if (code === 65 || code === 82) { kind = 'rain'; rain = 1; }
  else if (code === 63 || code === 81) { kind = 'rain'; rain = 0.9; }
  else if (code === 61 || code === 80 || code === 66 || code === 67) { kind = 'rain'; rain = 0.65; }
  else if (code >= 51 && code <= 57) { kind = 'drizzle'; rain = 0.4; }
  else if (code === 45 || code === 48) kind = 'fog';
  else if (code === 3) kind = 'overcast';
  else if (code === 2) kind = 'cloudy';
  if (rain === 0 && mm >= 0.2) { kind = 'rain'; rain = Math.min(1, 0.4 + mm * 0.15); }
  return { kind, rain, thunder, code, temp: cur.temperature_2m, cloud: cur.cloud_cover, at: Date.now() };
}

export async function fetchLiveWeather() {
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (c && Date.now() - c.at < TTL) return c;
  } catch { /* ignore */ }
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = setTimeout(() => ctl && ctl.abort(), 8000);
  try {
    const r = await fetch(URL_WX, { signal: ctl ? ctl.signal : undefined, cache: 'no-store' });
    if (!r.ok) return null;
    const w = readWeather((await r.json()).current);
    if (w) try { sessionStorage.setItem(KEY, JSON.stringify(w)); } catch { /* ignore */ }
    return w;
  } catch { return null; } finally { clearTimeout(t); }
}
