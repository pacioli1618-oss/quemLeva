import {Suspense} from 'react';
import {ExpensesScreen} from './ExpensesScreen';

// /e/[slug]/expenses · Expenses (host): who spent what, then settle up in Spliit.
export default function ExpensesPage({params}: PageProps<'/[locale]/e/[slug]/expenses'>) {
  return (
    <Suspense>
      <ExpensesRoute params={params} />
    </Suspense>
  );
}

async function ExpensesRoute({params}: {params: PageProps<'/[locale]/e/[slug]/expenses'>['params']}) {
  const {slug} = await params;
  return <ExpensesScreen slug={slug} />;
}
