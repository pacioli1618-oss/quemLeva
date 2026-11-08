import {Suspense} from 'react';
import {ClaimScreen} from './ClaimScreen';

// /e/[slug]/claim/[itemId] · "Eu levo": how much of an item this device brings.
export default function ClaimPage({params}: PageProps<'/[locale]/e/[slug]/claim/[itemId]'>) {
  return (
    <Suspense>
      <ClaimRoute params={params} />
    </Suspense>
  );
}

async function ClaimRoute({params}: {params: PageProps<'/[locale]/e/[slug]/claim/[itemId]'>['params']}) {
  const {slug, itemId} = await params;
  return <ClaimScreen slug={slug} itemId={itemId} />;
}
