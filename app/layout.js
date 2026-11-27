import './globals.css';
import Nav from './components/Nav';
import Footer from './components/Footer';
import { AuthProvider } from './components/AuthProvider';
import ReviewWidget from './components/ReviewWidget';
import VisitorGate from './components/VisitorGate';
import EngagementLayer from './components/EngagementLayer';
import HolidayLayer from './components/holiday/HolidayLayer';
import SiteChrome from './components/SiteChrome';
import InstallWidget from './components/InstallWidget';

export const metadata = {
  title: 'Knoworld — Explore knowledge like a universe',
  description: 'A celestial platform for scientific precision in knowledge discovery.',
  applicationName: 'Knoworld',
  appleWebApp: { capable: true, title: 'Knoworld', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  themeColor: '#0e0b1f',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-on-background min-h-screen flex flex-col">
        <AuthProvider>
          {/* v64: Creative City (/creative) là thành phố riêng -> không hiện các lớp của Knoworld City */}
          <SiteChrome><Nav /></SiteChrome>
          <main className="flex-1">{children}</main>
          <SiteChrome>
            <Footer />
            <ReviewWidget />
            <VisitorGate />
            <EngagementLayer />
            <HolidayLayer />
          </SiteChrome>
          <InstallWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
