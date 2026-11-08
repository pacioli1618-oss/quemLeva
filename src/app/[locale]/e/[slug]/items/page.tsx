import {Suspense} from 'react';
import {BuildListScreen} from './BuildListScreen';

// /e/[slug]/items · Build the list (host). The slug is request data, so it is read inside
// Suspense; the event itself loads in the browser because access depends on this device.
export default function BuildListPage({params}: PageProps<'/[locale]/e/[slug]/items'>) {
  return (
    <Suspense>
      <BuildListRoute params={params} />
    </Suspense>
  );
}

async function BuildListRoute({params}: {params: PageProps<'/[locale]/e/[slug]/items'>['params']}) {
  const {slug} = await params;
  return <BuildListScreen slug={slug} />;
}
