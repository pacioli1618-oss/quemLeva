import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Version shown in the footer: "version" from package.json (bump it on each release)
// plus the short commit of the deploy (Vercel sets VERCEL_GIT_COMMIT_SHA; empty locally).
const {version} = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {version: string};

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: version,
    APP_COMMIT: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7),
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The root layout lives in app/[locale]; URLs that match no route
    // fall back to app/global-not-found.tsx.
    globalNotFound: true,
  },
};

export default withNextIntl(nextConfig);
