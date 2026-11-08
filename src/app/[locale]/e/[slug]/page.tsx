import {Suspense} from 'react';
import {EventScreen} from './EventScreen';

// /e/[slug] · Join the event (first visit on this device), then the event list.
export default function EventPage({params}: PageProps<'/[locale]/e/[slug]'>) {
  return (
    <Suspense>
      <EventRoute params={params} />
    </Suspense>
  );
}

async function EventRoute({params}: {params: PageProps<'/[locale]/e/[slug]'>['params']}) {
  const {slug} = await params;
  return <EventScreen slug={slug} />;
}
