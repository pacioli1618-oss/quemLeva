import {Suspense} from 'react';
import {EventScreen} from '../../EventScreen';

// /e/[slug]/invite/[inviteToken] · Personal invite: the join form arrives with the name filled in.
export default function InvitePage({params}: PageProps<'/[locale]/e/[slug]/invite/[inviteToken]'>) {
  return (
    <Suspense>
      <InviteRoute params={params} />
    </Suspense>
  );
}

async function InviteRoute({params}: {params: PageProps<'/[locale]/e/[slug]/invite/[inviteToken]'>['params']}) {
  const {slug, inviteToken} = await params;
  return <EventScreen slug={slug} inviteToken={inviteToken} />;
}
