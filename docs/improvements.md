# Future improvements

QuemLeva starts **minimal**. Everything below ships only if the app gets real use (see the gates in the business model and the roadmap). Each item notes what is already prepared.

## Recovery when someone loses their phone

Event data lives on the server and is never lost. What is lost are the keys kept on the device, all in `src/lib/device-store.ts`:

| Key | Who loses it | Impact |
| --- | --- | --- |
| `deviceId` | participant | On a new phone they join as someone else, and their claims stay under the old name. |
| `hostToken` | host | They can no longer edit the event. The server keeps only the hash, so it cannot be resent. |
| event list | everyone | "My events" and "repeat event" are gone. |

What the MVP already covers: the event link is still in the WhatsApp group, and "move to another phone" (`exportStore` / `importStore`) works while the person still has the old device.

### Layer 1: keep the host link in WhatsApp
- On the Share screen, a "Send my host link to myself" button that opens WhatsApp with the link. The WhatsApp backup becomes the vault.
- **Prepared:** nothing needed in the database.

### Layer 2: reconnect a participant
- On the Guests screen, the host clicks "Create reconnect link". This clears the participant's `device_id` and issues a new `invite_token`, which binds the new phone.
- **Missing:** the RPC `ql_relink_participant(p_slug, p_host_token, p_participant_id)`.
- **Prepared:** `ql_join_event` already binds an invite to a device, and `ql_open_invite` exists.
- **Do not:** recover by name. Anyone could type "Ana".

### Layer 3: co-host and host-link rotation
- More than one host link per event, and "change link" to invalidate the old one.
- **Missing:** the RPCs `ql_add_host_token(p_slug, p_host_token)`, which returns a new token, and `ql_rotate_host_token(p_slug, p_host_token)`, which revokes the current one and returns a new one.
- **Prepared:** `quemleva.host_tokens` accepts several tokens per event (`token_hash` is unique), `revoked_at` exists, and `quemleva.require_host_event` already rejects revoked tokens. Tested.

### Layer 4: optional recovery email
- When creating an event, the person may leave an email. On "Recover my events", they type it and receive new host links, one new token per event, since the old one cannot be resent.
- **Missing:**
  - an `email_hash` column on `host_tokens` (or its own table);
  - a server route with the secret key and a transactional email provider;
  - rate limits per email and per IP;
  - always the same answer ("if there are events, we sent them");
  - a privacy policy entry.
- **Prepared:** issuing a new token for an event is a single insert into `host_tokens`.

### Bigger alternative: optional sign-in
- Supabase anonymous sign-in, with the option to link Google or email. Syncs everything across devices.
- **Cost:** replacing `p_device_id` with `auth.uid()` in the RPCs.
- **Prepared:** all device access goes through `device-store.ts`, so on the client only that module changes.
- Fits together with the paid "Festa" plan.

## Other planned improvements
- Barbecue calculator with list templates per locale (`src/i18n/templates/<locale>.ts`).
- "Order what's missing" with local partners: `events.postal_code`, tables `partners` and `partner_clicks`.
- Measure host return rate: `events.created_device_id`.
- Anti-spam on event creation (Turnstile) and cleanup of old events.

## Rule for all of this
No improvement may require participants to sign up, or take away anything a regular event already has.

## Spliit: automatic group creation

MVP: the host opens Spliit, pastes the expense summary ("Copiar resumo dos gastos") and saves the
group link (`events.spliit_group_url`); everyone then sees "Acertar as contas no Spliit" on the list.
Next: create the group and its expenses from a server route using Spliit's unofficial API, with the
manual flow kept as the fallback when the API fails (`Expenses.spliitError`).
