import Link from 'next/link';
import './globals.css';

// 404 for URLs that match no route. It lives outside [locale], so it has no
// translations: one short line in the three languages.
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR">
      <body>
        <main style={{maxWidth: 480, margin: '0 auto', padding: 20}}>
          <h1 style={{fontSize: 24, fontWeight: 800}}>404</h1>
          <p>Página não encontrada · Página no encontrada · Page not found</p>
          <Link href="/" style={{color: 'var(--brand)', fontWeight: 700}}>
            QuemLeva
          </Link>
        </main>
      </body>
    </html>
  );
}
