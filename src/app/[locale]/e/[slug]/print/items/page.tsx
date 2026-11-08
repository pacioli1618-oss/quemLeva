import {Suspense} from 'react';
import {PrintItemsScreen} from './PrintItemsScreen';

// /e/[slug]/print/items · A4 print version.
export default function PrintItemsPage({params}: PageProps<'/[locale]/e/[slug]/print/items'>) {
  return (
    <Suspense>
      <PrintItemsRoute params={params} />
    </Suspense>
  );
}

async function PrintItemsRoute({params}: {params: PageProps<'/[locale]/e/[slug]/print/items'>['params']}) {
  const {slug} = await params;
  return <PrintItemsScreen slug={slug} />;
}
