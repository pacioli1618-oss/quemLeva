import {Suspense} from 'react';
import {ManageScreen} from './ManageScreen';

// /e/[slug]/manage#<hostToken> · Opening the host link on any device makes it a host device.
export default function ManagePage({params}: PageProps<'/[locale]/e/[slug]/manage'>) {
  return (
    <Suspense>
      <ManageRoute params={params} />
    </Suspense>
  );
}

async function ManageRoute({params}: {params: PageProps<'/[locale]/e/[slug]/manage'>['params']}) {
  const {slug} = await params;
  return <ManageScreen slug={slug} />;
}
