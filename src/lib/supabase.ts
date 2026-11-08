import {createClient} from '@supabase/supabase-js';
import type {Database} from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).');
}

// One client for browser and server. There is no Supabase Auth session: identity is the
// anonymous deviceId plus host/invite tokens, sent as RPC arguments (docs/conventions.md).
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
});
