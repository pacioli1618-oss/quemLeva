import {Suspense} from 'react';
import {GuestsScreen} from './GuestsScreen';

// /e/[slug]/guests · "Quem vai" (participants) / "Convidados" (host).
export default function GuestsPage({params}: PageProps<'/[locale]/e/[slug]/guests'>) {
  return (
    <Suspense>
      <GuestsRoute params={params} />
    </Suspense>
  );
}

async function GuestsRoute({params}: {params: PageProps<'/[locale]/e/[slug]/guests'>['params']}) {
  const {slug} = await params;
  return <GuestsScreen slug={slug} />;
}
