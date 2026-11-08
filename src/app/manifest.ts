import type {MetadataRoute} from 'next';

// /manifest.webmanifest · Lets people add QuemLeva to the home screen (PWA). No service worker:
// the data is live (Supabase + Realtime), so there is nothing useful to show offline.
// Opens on "My events" because whoever installs it has already used the app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'QuemLeva',
    short_name: 'QuemLeva',
    description: 'Combine quem leva o quê no churrasco, no almoço ou no Natal. Sem cadastro.',
    lang: 'pt-BR',
    start_url: '/my-events',
    scope: '/',
    display: 'standalone',
    background_color: '#f5f6f3',
    theme_color: '#1e7a4c',
    icons: [
      {src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
      {src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
      {src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
    ],
  };
}
