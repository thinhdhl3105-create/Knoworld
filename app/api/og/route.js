// v21: Lấy ảnh đại diện (og:image) của một bài báo — chạy phía server để
// tránh CORS. Dùng khi admin thêm tin: dán link -> tự tìm thumbnail.
// GET /api/og?url=https://...  ->  { image: "https://..." | null }

export const dynamic = 'force-dynamic';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

function extractImage(html, baseUrl) {
  // og:image / twitter:image — chấp nhận cả thứ tự property/content đảo nhau.
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      try {
        // Chuẩn hoá URL tương đối -> tuyệt đối; chỉ nhận http(s).
        const abs = new URL(m[1].replace(/&amp;/g, '&'), baseUrl);
        if (abs.protocol === 'http:' || abs.protocol === 'https:') return abs.toString();
      } catch {
        /* bỏ qua URL hỏng */
      }
    }
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get('url') || '').trim();

  let target;
  try {
    target = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new Error();
  } catch {
    return Response.json({ image: null, error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(target.toString(), {
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return Response.json({ image: null });

    // Chỉ đọc phần đầu trang (meta tags nằm trong <head>).
    const html = (await res.text()).slice(0, 400_000);
    return Response.json({ image: extractImage(html, res.url || target.toString()) });
  } catch {
    return Response.json({ image: null });
  }
}
