'use client';

// v64: Widget "Knoworld trên điện thoại" — cài Knoworld lên màn hình chính như một app.
//   • Android / Chrome: nút Cài đặt (dùng lời mời cài đặt của trình duyệt).
//   • iPhone / iPad: hướng dẫn 3 bước với Safari (Chia sẻ → Thêm vào MH chính).
//   • Máy tính: mã QR để mở Knoworld trên điện thoại (+ nút cài trên máy tính nếu trình duyệt hỗ trợ).
//   • Sau khi cài: nhấn giữ biểu tượng để mở nhanh các khu (shortcuts trong app/manifest.js).
// Mở bằng sự kiện window 'kw-install-open' (nút trên thanh menu). Trên điện thoại có lời nhắc nhỏ
// từ lần ghé thứ 2, ẩn 14 ngày khi bấm "Để sau".
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import './install.css';

const QUIET = ['/login', '/admin', '/upload'];
const SNOOZE_KEY = 'kw_install_snooze';
const VISITS_KEY = 'kw_install_visits';
const SHORTCUTS = ['Dashboard', 'Knowledge Hub', 'MetroGram', 'Medisland', 'Creative City'];

function platform() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}
const isStandalone = () => typeof window !== 'undefined'
  && ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export default function InstallWidget() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [plat, setPlat] = useState('desktop');
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [qr, setQr] = useState('');
  const promptRef = useRef(null);

  useEffect(() => {
    setPlat(platform());
    setInstalled(isStandalone());
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const onPrompt = (e) => { e.preventDefault(); promptRef.current = e; setCanPrompt(true); };
    const onInstalled = () => {
      setInstalled(true); setCanPrompt(false); setNudge(false); promptRef.current = null;
      window.dispatchEvent(new CustomEvent('kw-toast', { detail: { message: 'Đã thêm Knoworld vào màn hình chính', icon: 'install_mobile' } }));
    };
    const onOpen = () => { setNudge(false); setOpen(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('kw-install-open', onOpen);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('kw-install-open', onOpen);
    };
  }, []);

  // Lời nhắc trên điện thoại: từ lần ghé thứ 2, chưa cài, không bị hoãn.
  useEffect(() => {
    const p = platform();
    if (p === 'desktop' || isStandalone()) return undefined;
    let visits = Number(store.get(VISITS_KEY) || 0);
    try { if (!sessionStorage.getItem('kw_install_counted')) { visits += 1; store.set(VISITS_KEY, String(visits)); sessionStorage.setItem('kw_install_counted', '1'); } } catch { /* ignore */ }
    const snooze = Number(store.get(SNOOZE_KEY) || 0);
    if (visits < 2 || Date.now() < snooze) return undefined;
    const t = setTimeout(() => setNudge(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open || plat !== 'desktop' || qr) return;
    import('qrcode').then((m) => m.default.toDataURL(window.location.origin, { margin: 1, width: 360, color: { dark: '#13121b', light: '#ffffff' } }))
      .then(setQr).catch(() => {});
  }, [open, plat, qr]);

  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  const install = async () => {
    const ev = promptRef.current; if (!ev) return;
    ev.prompt();
    try { await ev.userChoice; } catch { /* ignore */ }
    promptRef.current = null; setCanPrompt(false);
  };
  const snooze = () => { setNudge(false); store.set(SNOOZE_KEY, String(Date.now() + 14 * 864e5)); };
  const quiet = QUIET.some((p) => pathname.startsWith(p));

  return (
    <>
      {nudge && !open && !installed && !quiet && (
        <div className="kwi-nudge kw-rise" role="dialog" aria-label="Thêm Knoworld vào màn hình chính">
          <img src="/icon-192.png" alt="" width="40" height="40" />
          <div className="kwi-nudge-txt"><b>Knoworld trên điện thoại</b><span>Thêm vào màn hình chính để mở nhanh như app.</span></div>
          <button type="button" className="kwi-btn" onClick={() => { setNudge(false); if (canPrompt) install(); else setOpen(true); }}>{canPrompt ? 'Cài' : 'Xem cách'}</button>
          <button type="button" className="kwi-x" onClick={snooze} aria-label="Để sau"><span className="material-symbols-outlined">close</span></button>
        </div>
      )}
      {open && (
        <div className="kwi-back" onClick={() => setOpen(false)}>
          <div className="kwi-sheet kw-rise" role="dialog" aria-modal="true" aria-labelledby="kwi-title" onClick={(e) => e.stopPropagation()}>
            <div className="kwi-head">
              <img src="/icon-192.png" alt="" width="48" height="48" />
              <div><span className="kwi-label">Widget</span><h2 id="kwi-title">Knoworld trên điện thoại</h2></div>
              <button type="button" className="kwi-x" onClick={() => setOpen(false)} aria-label="Đóng"><span className="material-symbols-outlined">close</span></button>
            </div>

            {installed ? (
              <p className="kwi-p">Bạn đang mở Knoworld như một app. Nhấn giữ biểu tượng Knoworld trên màn hình chính để mở nhanh các khu.</p>
            ) : plat === 'ios' ? (
              <>
                <p className="kwi-p">Trên iPhone/iPad, thêm Knoworld vào màn hình chính bằng Safari:</p>
                <ol className="kwi-steps">
                  <li><b>Mở trang này bằng Safari</b><span>Chrome trên iPhone chưa thêm được.</span></li>
                  <li><b>Bấm nút Chia sẻ</b><span className="kwi-ico"><span className="material-symbols-outlined">ios_share</span> ở thanh dưới cùng</span></li>
                  <li><b>Chọn &ldquo;Thêm vào MH chính&rdquo;</b><span>Kéo danh sách xuống nếu chưa thấy.</span></li>
                  <li><b>Bấm &ldquo;Thêm&rdquo;</b><span>Biểu tượng Knoworld hiện trên màn hình chính.</span></li>
                </ol>
              </>
            ) : plat === 'android' ? (
              canPrompt ? (
                <>
                  <p className="kwi-p">Cài Knoworld lên màn hình chính. Mở bằng một chạm, chạy toàn màn hình như app.</p>
                  <button type="button" className="kwi-btn big" onClick={install}><span className="material-symbols-outlined">install_mobile</span>Cài Knoworld</button>
                </>
              ) : (
                <ol className="kwi-steps">
                  <li><b>Bấm nút menu</b><span className="kwi-ico"><span className="material-symbols-outlined">more_vert</span> ở góc trên trình duyệt</span></li>
                  <li><b>Chọn &ldquo;Cài đặt ứng dụng&rdquo;</b><span>hoặc &ldquo;Thêm vào màn hình chính&rdquo;.</span></li>
                  <li><b>Xác nhận</b><span>Biểu tượng Knoworld hiện trên màn hình chính.</span></li>
                </ol>
              )
            ) : (
              <div className="kwi-desk">
                <div className="kwi-qr">{qr ? <img src={qr} alt="Mã QR mở Knoworld trên điện thoại" /> : <span className="kwi-p">Đang tạo mã…</span>}</div>
                <div className="kwi-desk-txt">
                  <b>Quét bằng camera điện thoại</b>
                  <p className="kwi-p">Knoworld mở trên điện thoại, rồi bấm nút này lần nữa để thêm vào màn hình chính.</p>
                  {canPrompt && <button type="button" className="kwi-btn" onClick={install}><span className="material-symbols-outlined">install_desktop</span>Cài trên máy tính này</button>}
                </div>
              </div>
            )}

            <div className="kwi-short">
              <span className="kwi-label">Sau khi cài · nhấn giữ biểu tượng để mở nhanh</span>
              <div className="kwi-chips">{SHORTCUTS.map((s) => <span key={s}>{s}</span>)}</div>
              <span className="kwi-note">Mở nhanh khi nhấn giữ hiện trên Android. Widget gắn hẳn ra màn hình chính chỉ có ở app cài từ cửa hàng, nên Knoworld dùng biểu tượng app và lối tắt.</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
