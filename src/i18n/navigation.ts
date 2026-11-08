import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';

// Use these instead of next/link and next/navigation inside the app:
// they keep the current locale and can switch it (router.replace(path, {locale})).
export const {Link, redirect, usePathname, useRouter, getPathname} = createNavigation(routing);
