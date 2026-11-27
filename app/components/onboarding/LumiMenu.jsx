'use client';

// v61: Menu khi bấm nút Lumi trên thanh menu.
//   🧭 Dẫn mình tới…        — đi nhanh tới các khu của thành phố
//   🎲 Khám phá ngẫu nhiên  — Lumi bốc 1 khái niệm / case study cho bạn xem
//   ❓ Trang này dùng sao?  — vài mẹo cho đúng trang đang mở
//   🛠️ Lối tắt admin        — chỉ thầy Thịnh thấy
import { useEffect, useState } from 'react';
import { fetchConcepts, fetchContent } from '@/lib/content';
import { replayOnboarding } from '@/lib/onboarding';

const PLACES = [
  { href: '/knowledge-hub', icon: 'hub', label: 'Knowledge Hub', c: '#c6bfff' },
  { href: '/videos', icon: 'play_circle', label: 'Video Case Studies', c: '#5ee0a0' },
  { href: '/students', icon: 'school', label: 'Student Case Studies', c: '#5ee0a0' },
  { href: '/images', icon: 'image', label: 'Image Case Studies', c: '#5ee0a0' },
  { href: '/news', icon: 'newspaper', label: 'News', c: '#ff8a8a' },
  { href: '/discussion', icon: 'forum', label: 'Discussion', c: '#ff9bd2' },
  { href: '/games', icon: 'casino', label: 'Game Island', c: '#5ee0a0' },
  { href: '/temple', icon: 'temple_buddhist', label: 'Temple', c: '#ffb347' },
  { href: '/metro/gram', icon: 'subway', label: 'MetroGram (ga B1)', c: '#ff4fd8' },
  { href: '/medisland', icon: 'campaign', label: 'Medisland', c: '#ff8f6b' },
  { href: '/home', icon: 'cottage', label: 'My Home', c: '#e9a8ff' },
  { href: '/journey', icon: 'local_fire_department', label: 'My Journey', c: '#f6bd56' },
  { href: '/', icon: 'location_city', label: 'Về Main City', c: '#7ee8ff' },
];

const ADMIN = [
  { act: 'compose', icon: 'campaign', label: 'Đăng tin lên City Notice Board' },
  { href: '/upload', icon: 'upload', label: 'Upload nội dung' },
  { href: '/knowledge-hub/import', icon: 'upload_file', label: 'Concept Import' },
  { href: '/island', icon: 'sailing', label: "Thinh's Island (lịch riêng)" },
  { href: '/metro/gram', icon: 'how_to_vote', label: 'MetroGram — chấm điểm' },
  { href: '/medisland', icon: 'campaign', label: 'Medisland — quản lý nhóm' },
  { href: '/dashboard', icon: 'monitoring', label: 'Dashboard' },
  { href: '/admin/visitors', icon: 'group', label: 'Visitors' },
  { href: '/admin/reviews', icon: 'reviews', label: 'Reviews' },
  { href: '/admin/access', icon: 'admin_panel_settings', label: 'Access' },
];

// Mẹo theo từng trang (đường dẫn dài hơn được ưu tiên).
const HELP = [
  ['/knowledge-hub/import', 'Concept Import', ['Dán hoặc tải file khái niệm lên để thêm hàng loạt vào Knowledge Hub.', 'Kiểm tra bản xem trước rồi mới lưu.']],
  ['/knowledge-hub', 'Knowledge Hub', ['Bấm một khái niệm để xem định nghĩa, ví dụ và case study liên quan.', 'Đồ thị liên kết: kéo các nút để sắp xếp, bấm nút để xem chi tiết.', 'Ctrl + K để tìm nhanh một khái niệm.']],
  ['/videos', 'Video Case Studies', ['Chọn một video để xem; lọc theo chủ đề ở trên cùng.', 'Thả tim / reaction cho video bạn thấy hay.', 'Video gắn với khái niệm nào sẽ hiện trong Knowledge Hub.']],
  ['/students', 'Student Case Studies', ['Bài của các anh chị khoá trước — bấm vào thẻ để đọc đầy đủ.', 'Bài nổi bật nằm trên cùng.', 'Dùng làm cảm hứng, đừng sao chép nha 😉']],
  ['/images', 'Image Case Studies', ['Bấm vào hình để phóng to và đọc phân tích.', 'Để ý bố cục, màu sắc, thông điệp của từng quảng cáo.']],
  ['/news', 'News', ['Tin tức ngành marketing – truyền thông được cập nhật thường xuyên.', 'Bấm vào tin để đọc chi tiết.']],
  ['/discussion', 'Discussion', ['Đăng câu hỏi hoặc ý kiến của bạn, trả lời bài của người khác.', 'Thả tim cho bài bạn thấy hay.']],
  ['/games', 'Game Island', ['Bốc thăm thứ tự thuyết trình cho các nhóm.', 'Nhận ngẫu nhiên thương hiệu cho nhóm làm bài.']],
  ['/temple', 'Temple', ['Di chuyển: phím mũi tên / WASD (điện thoại: chạm để đi), Shift để chạy.', 'Space để nói chuyện / tương tác: gõ mõ lấy công đức, thắp nhang ở cổng.', 'Dùng công đức để xin quẻ ở chính điện.']],
  ['/metro/gram', 'MetroGram', ['Mỗi ngày nhóm viết 1 hook theo brand guideline của nhóm.', 'Tự gắn style cho hook của mình.', 'Cư dân mục tiêu và người dùng web sẽ like / share hook.']],
  ['/metro', 'Metro', ['Tàu điện ngầm dưới thành phố có 2 tầng B1 và B2.', 'Ga B1 là MetroGram.']],
  ['/medisland', 'Medisland', ['Nhóm bạn là một agency: vào văn phòng agency để chạy quảng cáo.', 'Mỗi lượt chạy đúng 2 ngày thật, có báo cáo sau mỗi lượt.', 'Đi phỏng vấn cư dân trên đảo để biết quảng cáo hợp với ai.']],
  ['/home', 'My Home', ['Ngôi nhà riêng: chọn đồ nội thất và đặt vào phòng.', 'Treo ảnh, thành tích lên đồ vật; chọn ai được vào nhà.']],
  ['/island', "Thinh's Island", ['Lịch dạy, lịch họp và các ngày quan trọng của thầy.', 'Kéo một lớp sang ngày/giờ khác để dời lịch.']],
  ['/journey', 'My Journey', ['Mỗi ngày ghé Knoworld là thêm 1 ngày streak 🔥.', 'Xem huy hiệu đã nhận và hành trình của bạn.', 'Không có điểm, không có bài kiểm tra.']],
  ['/profile', 'Profile', ['Thẻ cư dân của bạn: tên, lớp, nhân vật.', 'Chỉnh bộ đồ cho nhân vật cư dân ở đây.']],
  ['/dashboard', 'Dashboard', ['Số liệu của thành phố: người dùng, lượt xem, tim, nội dung mới.', 'Biểu đồ theo thời gian ở phía dưới.']],
  ['/research', 'Research', ['Góc nghiên cứu: bài báo và tài liệu học thuật.', 'Bấm vào một mục để xem chi tiết.']],
  ['/search', 'Tìm kiếm', ['Gõ từ khoá để tìm khái niệm, case study, tin tức.', 'Mẹo: Ctrl + K mở tìm nhanh ở bất kỳ đâu.']],
  ['/upload', 'Upload', ['Chọn loại nội dung, điền tiêu đề và mô tả.', 'Kéo thả hoặc bấm để chọn file.']],
  ['/', 'Main City', ['Kéo để xoay và nhìn quanh thành phố; bấm vào toà nhà nào cũng vào được khu đó.', 'Bảng City Notice Board bên phải: tin mới của thành phố.', 'Có thể xuống tầng B1 / B2 để xem tàu điện ngầm.']],
];
const helpFor = (path) => HELP.find(([p]) => (p === '/' ? path === '/' : path === p || path.startsWith(`${p}/`))) || null;

// Kho nội dung để bốc ngẫu nhiên (nạp 1 lần mỗi phiên).
let pool = null;
async function loadPool(withCases) {
  if (pool && pool.withCases === withCases) return pool.items;
  const tasks = [fetchConcepts()];
  if (withCases) tasks.push(fetchContent('video'), fetchContent('student'), fetchContent('image'));
  const res = await Promise.all(tasks.map((t) => t.catch(() => ({ data: [] }))));
  const [c, v, s, i] = res.map((r) => r?.data || []);
  const items = [
    ...c.map((x) => ({ t: 'Khái niệm', icon: 'hub', title: x.title, sub: x.summary || x.body, href: `/knowledge-hub?c=${x.id}` })),
    ...(v || []).map((x) => ({ t: 'Video case study', icon: 'play_circle', title: x.title, sub: x.summary, href: `/videos?v=${x.id}` })),
    ...(s || []).map((x) => ({ t: 'Student case study', icon: 'school', title: x.title, sub: x.summary, href: `/students/${x.id}` })),
    ...(i || []).map((x) => ({ t: 'Image case study', icon: 'image', title: x.title, sub: x.summary, href: `/images?i=${x.id}` })),
  ].filter((x) => x.title);
  pool = { withCases, items };
  return items;
}

export default function LumiMenu({ pathname, isAdmin, loggedIn, onGo, onCompose, onClose, onTalk, autoOff, onToggleAuto }) {
  const [view, setView] = useState('main');
  const [pick, setPick] = useState(null);
  const [loading, setLoading] = useState(false);
  const help = helpFor(pathname);

  const draw = async () => {
    setLoading(true);
    const items = await loadPool(loggedIn);
    setLoading(false);
    if (!items.length) { setPick(false); return; }
    let next = items[(Math.random() * items.length) | 0];
    if (pick && items.length > 1 && next.href === pick.href) next = items[(Math.random() * items.length) | 0];
    setPick(next);
    onTalk?.();
  };
  useEffect(() => { if (view === 'random' && pick == null) draw(); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = (
    <button type="button" className="kwm-back" onClick={() => setView('main')}>
      <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại
    </button>
  );

  return (
    <div className="kwm" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="kwm-x" onClick={onClose} aria-label="Đóng">
        <span className="material-symbols-outlined" aria-hidden="true">close</span>
      </button>

      {view === 'main' && (
        <>
          <p className="kwm-hi"><span className="kwo-nm">Lumi</span> Lumi đây! Bạn cần gì nè? ✨</p>
          <div className="kwm-list">
            <button type="button" className="kwm-item" onClick={() => setView('go')}><span className="kwm-e">🧭</span>Dẫn mình tới…</button>
            <button type="button" className="kwm-item" onClick={() => { setPick(null); setView('random'); }}><span className="kwm-e">🎲</span>Khám phá ngẫu nhiên</button>
            <button type="button" className="kwm-item" onClick={() => setView('help')}><span className="kwm-e">❓</span>Trang này dùng sao?</button>
            {isAdmin && <button type="button" className="kwm-item" onClick={() => setView('admin')}><span className="kwm-e">🛠️</span>Lối tắt admin</button>}
          </div>
          {onToggleAuto && (
            <button type="button" className="kwl-mute" onClick={onToggleAuto}>
              {autoOff ? 'Bật Lumi tự ghé ngang' : 'Tắt Lumi tự ghé ngang'}
            </button>
          )}
        </>
      )}

      {view === 'go' && (
        <>
          {back}
          <p className="kwm-hi"><span className="kwo-nm">Lumi</span> Muốn đi đâu? Lumi dẫn đường cho! 🧭</p>
          <div className="kwm-grid">
            {PLACES.filter((p) => p.href !== pathname).map((p) => (
              <button key={p.href} type="button" className="kwm-place" onClick={() => onGo(p.href)}>
                <span className="material-symbols-outlined" style={{ color: p.c }} aria-hidden="true">{p.icon}</span>{p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {view === 'random' && (
        <>
          {back}
          <p className="kwm-hi"><span className="kwo-nm">Lumi</span> Lumi bốc cho bạn cái này nè 🎲</p>
          {loading && !pick && <div className="kwm-card is-load">Lumi đang lục thư viện…</div>}
          {pick === false && <div className="kwm-card">Thư viện đang trống, quay lại sau nha!</div>}
          {pick && (
            <div className={`kwm-card ${loading ? 'is-load' : ''}`}>
              <span className="kwm-kind"><span className="material-symbols-outlined" aria-hidden="true">{pick.icon}</span>{pick.t}</span>
              <b>{pick.title}</b>
              {pick.sub && <small>{pick.sub}</small>}
              <div className="kwm-row">
                <button type="button" className="kwm-btn is-p" onClick={() => onGo(pick.href)}>Xem ngay</button>
                <button type="button" className="kwm-btn" onClick={draw} disabled={loading}>Bốc cái khác</button>
              </div>
            </div>
          )}
        </>
      )}

      {view === 'help' && (
        <>
          {back}
          {help ? (
            <>
              <p className="kwm-hi"><span className="kwo-nm">Lumi</span> Ở <b>{help[1]}</b> nè:</p>
              <ol className="kwm-tips">{help[2].map((t) => <li key={t}>{t}</li>)}</ol>
            </>
          ) : (
            <p className="kwm-hi"><span className="kwo-nm">Lumi</span> Trang này dễ lắm, cứ bấm thử nha! Cần tìm gì thì nhấn Ctrl + K.</p>
          )}
          <button type="button" className="kwm-btn is-wide" onClick={() => { onClose(); replayOnboarding(); }}>
            Xem lại hướng dẫn đầy đủ cùng Lumi
          </button>
        </>
      )}

      {view === 'admin' && isAdmin && (
        <>
          {back}
          <p className="kwm-hi"><span className="kwo-nm">Lumi</span> Chào thầy! Thầy cần mở gì ạ? 🛠️</p>
          <div className="kwm-list is-tight">
            {ADMIN.map((a) => (
              <button key={a.label} type="button" className="kwm-item is-sm" onClick={() => (a.act === 'compose' ? onCompose() : onGo(a.href))}>
                <span className="material-symbols-outlined" aria-hidden="true">{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
