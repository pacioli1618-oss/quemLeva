import {notFound} from 'next/navigation';
import {UiShowcase} from './UiShowcase';

// Component showcase for development only (npm run dev → /dev/ui). 404 in production builds.
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <UiShowcase />;
}
