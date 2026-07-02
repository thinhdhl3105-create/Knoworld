'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FIELDS, hasRegistered, registerVisitor } from '@/lib/visitor';

const CURRENT_YEAR = new Date().getFullYear();
// Danh sách năm sinh: từ 16 tuổi đến 80 tuổi.
const BIRTH_YEARS = Array.from({ length: 65 }, (_, i) => CURRENT_YEAR - 16 - i);

// Không hiện cổng trên các trang quản trị / đăng nhập.
const SKIP_PREFIXES = ['/login', '/admin'];

export default function VisitorGate() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [needGate, setNeedGate] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [field, setField] = useState('');
  const [otherField, setOtherField] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    setNeedGate(!hasRegistered());
  }, []);

  const skip = SKIP_PREFIXES.some((p) => pathname?.startsWith(p));
  if (!mounted || skip || !needGate) return null;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const resolvedField = field === 'Khác' ? otherField.trim() : field;
  const canSubmit =
    fullName.trim().length > 1 && emailOk && !!resolvedField && !busy;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError('Vui lòng điền đầy đủ: họ tên, email hợp lệ và lĩnh vực.');
      return;
    }
    setBusy(true);
    const res = await registerVisitor({
      fullName,
      email,
      birthYear,
      field: resolvedField,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Không lưu được thông tin. Vui lòng thử lại.');
      return;
    }
    setNeedGate(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="nebula w-[420px] h-[420px] -top-20 -right-20 hidden md:block pointer-events-none" />
      <div className="relative w-full max-w-md glass-card rounded-card p-7 my-8">
        <div className="flex items-center gap-2 mb-5">
          <span className="material-symbols-outlined text-primary">blur_on</span>
          <span className="font-display text-xl font-semibold">Knoworld</span>
        </div>

        <h1 className="h-md mb-1">Chào mừng bạn ghé thăm</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          Vui lòng điền một vài thông tin trước khi khám phá nội dung. Điều này giúp
          chúng tôi hiểu ai đang quan tâm và cải thiện trải nghiệm cho bạn.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Họ và tên *">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputCls}
              placeholder="Nguyễn Văn A"
              autoFocus
            />
          </Field>

          <Field label="Email *">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="ban@example.com"
            />
          </Field>

          <Field label="Năm sinh">
            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className={inputCls}
            >
              <option value="">— Chọn năm sinh —</option>
              {BIRTH_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Lĩnh vực muốn tìm hiểu *">
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              className={inputCls}
            >
              <option value="">— Chọn lĩnh vực —</option>
              {FIELDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>

          {field === 'Khác' && (
            <Field label="Lĩnh vực khác">
              <input
                value={otherField}
                onChange={(e) => setOtherField(e.target.value)}
                className={inputCls}
                placeholder="Nhập lĩnh vực của bạn"
              />
            </Field>
          )}

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-1 bg-primary text-on-primary py-3 rounded-lg text-sm font-bold hover:scale-[0.98] transition-transform disabled:opacity-40 disabled:hover:scale-100"
          >
            {busy ? 'Đang lưu…' : 'Vào khám phá'}
          </button>

          <p className="text-xs text-on-surface-variant/70 text-center">
            Thông tin của bạn chỉ dùng nội bộ để cải thiện nội dung.
          </p>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40';

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-sm text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}
