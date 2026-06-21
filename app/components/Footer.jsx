import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-24">
      <div className="max-w-container mx-auto px-5 md:px-16 py-12 flex flex-col md:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-base">blur_on</span>
            <span className="font-display font-semibold tracking-tight">Knoworld</span>
          </div>
          <p className="text-sm text-on-surface-variant">© 2026 Knoworld. Scientific precision in knowledge discovery.</p>
        </div>
        <div className="flex gap-8 text-sm text-on-surface-variant">
          <Link href="#" className="hover:text-on-surface transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-on-surface transition-colors">Terms</Link>
          <Link href="#" className="hover:text-on-surface transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
