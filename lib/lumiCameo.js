// v59: Lumi lấp ló (góc màn hình) + Lumi đi dạo trong city — bật/tắt theo từng trình duyệt.
const KEY = 'kw_lumi_cameo';
export const LUMI_CAMEO_EVENT = 'kw-lumi-cameo';

export function isCameoOff() {
  try { return localStorage.getItem(KEY) === 'off'; } catch { return false; }
}

export function setCameoOff(off) {
  try { if (off) localStorage.setItem(KEY, 'off'); else localStorage.removeItem(KEY); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(LUMI_CAMEO_EVENT, { detail: { off: !!off } })); } catch { /* ignore */ }
}
