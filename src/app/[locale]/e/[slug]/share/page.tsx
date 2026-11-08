import {Suspense} from 'react';
import {ShareScreen} from './ShareScreen';

// /e/[slug]/share · Share the event link (everyone) and the host link (host only).
export default function SharePage({params}: PageProps<'/[locale]/e/[slug]/share'>) {
  return (
    <Suspense>
      <ShareRoute params={params} />
    </Suspense>
  );
}

async function ShareRoute({params}: {params: PageProps<'/[locale]/e/[slug]/share'>['params']}) {
  const {slug} = await params;
  return <ShareScreen slug={slug} />;
}
