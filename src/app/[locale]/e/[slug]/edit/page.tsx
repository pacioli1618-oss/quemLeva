import {Suspense} from 'react';
import {EditEventScreen} from './EditEventScreen';

// /e/[slug]/edit · Edit the event's details (host): name, date, time, place, kind, people.
export default function EditEventPage({params}: PageProps<'/[locale]/e/[slug]/edit'>) {
  return (
    <Suspense>
      <EditEventRoute params={params} />
    </Suspense>
  );
}

async function EditEventRoute({params}: {params: PageProps<'/[locale]/e/[slug]/edit'>['params']}) {
  const {slug} = await params;
  return <EditEventScreen slug={slug} />;
}
