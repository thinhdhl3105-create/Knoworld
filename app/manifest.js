export default function manifest() {
  return {
    name: 'Knoworld — Explore knowledge like a universe',
    short_name: 'Knoworld',
    description: 'A celestial platform for scientific precision in knowledge discovery.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0e0b1f',
    theme_color: '#0e0b1f',
    // v64: nhấn giữ biểu tượng Knoworld trên màn hình chính -> mở nhanh các khu
    shortcuts: [
      { name: 'Dashboard', short_name: 'Dashboard', url: '/dashboard', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Knowledge Hub', short_name: 'Knowledge', url: '/knowledge-hub', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'MetroGram', short_name: 'MetroGram', url: '/metro/gram', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Medisland', short_name: 'Medisland', url: '/medisland', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Creative City', short_name: 'Creative', url: '/creative', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
