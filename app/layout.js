import './globals.css';
import Nav from './components/Nav';
import Footer from './components/Footer';
import { AuthProvider } from './components/AuthProvider';

export const metadata = {
  title: 'Knoworld — Explore knowledge like a universe',
  description: 'A celestial platform for scientific precision in knowledge discovery.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-on-background min-h-screen flex flex-col">
        <AuthProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
