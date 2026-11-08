import {Suspense} from 'react';
import {PrintGuestsScreen} from './PrintGuestsScreen';

// /e/[slug]/print/guests · A4 print version.
export default function PrintGuestsPage({params}: PageProps<'/[locale]/e/[slug]/print/guests'>) {
  return (
    <Suspense>
      <PrintGuestsRoute params={params} />
    </Suspense>
  );
}

async function PrintGuestsRoute({params}: {params: PageProps<'/[locale]/e/[slug]/print/guests'>['params']}) {
  const {slug} = await params;
  return <PrintGuestsScreen slug={slug} />;
}
