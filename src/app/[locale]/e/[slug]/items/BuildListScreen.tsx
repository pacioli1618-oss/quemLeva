'use client';

import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {ButtonLink} from '@/components/ui/Button';
import {useEvent} from '@/hooks/use-event';
import {useStoredEvent} from '@/hooks/use-stored-event';
import {useFormatEventDate} from '@/i18n/dates';
import {useRpcErrorMessage} from '@/i18n/errors';
import {Link} from '@/i18n/navigation';
import {useFormatAmount} from '@/i18n/units';
import {addItem, deleteItem, updateItem, type HostEventView, type ItemInput, type ItemView} from '@/lib/api';
import {ItemEditor} from './ItemEditor';
import styles from './BuildList.module.css';

/** Screen 2 · Build the list (host). */
export function BuildListScreen({slug}: {slug: string}) {
  const stored = useStoredEvent(slug);
  const t = useTranslations('BuildList');

  if (stored === null) return <main className={styles.screen} aria-busy="true" />;
  if (!stored?.hostToken) {
    return (
      <main className={styles.screen}>
        <p className={styles.message}>{t('notHost')}</p>
      </main>
    );
  }
  return <HostBuildList slug={slug} hostToken={stored.hostToken} />;
}

function HostBuildList({slug, hostToken}: {slug: string; hostToken: string}) {
  const t = useTranslations('BuildList');
  const common = useTranslations('Common');
  const rpcErrorMessage = useRpcErrorMessage();
  const {data, error, refresh} = useEvent(slug, hostToken);

  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Every write: run it, reload this screen right away (other phones get the Realtime notice),
  // and turn any failure into a message instead of losing what the person typed.
  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await refresh();
      return true;
    } catch (failure) {
      setActionError(rpcErrorMessage(failure as {message?: string}));
      return false;
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newItemName.trim();
    if (!name) return;
    setIsAdding(true);
    const isDone = await run(() => addItem(slug, hostToken, {name}));
    if (isDone) setNewItemName('');
    setIsAdding(false);
  }

  async function handleSave(item: ItemView, input: ItemInput) {
    setBusyId(item.id);
    const isDone = await run(() => updateItem(slug, hostToken, item.id, {...input, sort: item.sort}));
    if (isDone) setEditingId(null);
    setBusyId(null);
  }

  async function handleRemove(item: ItemView) {
    if (item.claims.length > 0 && !window.confirm(t('removeConfirm', {name: item.name}))) return;
    setBusyId(item.id);
    await run(() => deleteItem(slug, hostToken, item.id));
    if (editingId === item.id) setEditingId(null);
    setBusyId(null);
  }

  return (
    <main className={styles.screen}>
      <TopBar slug={slug} data={data} backLabel={common('back')} />
      <h1 className={styles.question}>{t('question')}</h1>

      {error ? (
        <p className={styles.error} role="alert">
          {rpcErrorMessage(error as {message?: string})}
        </p>
      ) : null}

      {data && data.items.length === 0 && <p className={styles.notice}>{t('created')}</p>}

      {data && data.items.length > 0 && (
        <ul className={styles.list}>
          {data.items.map((item) => (
            <li key={item.id}>
              <div className={styles.row}>
                <button
                  type="button"
                  className={styles.rowMain}
                  aria-expanded={editingId === item.id}
                  aria-label={t('editItem', {name: item.name})}
                  onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                >
                  <span className={styles.itemName}>{item.name}</span>
                  <ItemAmount item={item} />
                </button>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={t('removeItem', {name: item.name})}
                  disabled={busyId === item.id}
                  onClick={() => void handleRemove(item)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              {editingId === item.id && (
                <ItemEditor
                  item={item}
                  isSaving={busyId === item.id}
                  onSave={(input) => void handleSave(item, input)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {actionError && (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      )}

      <form className={styles.addRow} onSubmit={handleAdd}>
        <label htmlFor="new-item" className={styles.srOnly}>
          {t('newItemLabel')}
        </label>
        <input
          id="new-item"
          className={styles.addInput}
          placeholder={t('newItemPlaceholder')}
          value={newItemName}
          onChange={(event) => setNewItemName(event.target.value)}
          maxLength={120}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button type="submit" className={styles.addButton} aria-label={t('addItem')} disabled={isAdding || !newItemName.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </form>

      <div className={styles.footer}>
        <ButtonLink href={`/e/${slug}/share`} size="cta" isFullWidth>
          {t('submit')}
        </ButtonLink>
      </div>
    </main>
  );
}

function TopBar({slug, data, backLabel}: {slug: string; data: HostEventView | null; backLabel: string}) {
  const t = useTranslations('BuildList');
  const formatEventDate = useFormatEventDate();
  const meta = data
    ? [formatEventDate(data.event.eventDate, data.event.eventTime), t('peopleSummary', {adults: data.event.adults, kids: data.event.kids})]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className={styles.topBar}>
      <Link href={`/e/${slug}`} className={styles.back} aria-label={backLabel}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <div className={styles.topTitle}>
        <span className={styles.eventName}>{data?.event.title ?? ' '}</span>
        <span className={styles.eventMeta}>{meta || ' '}</span>
      </div>
    </div>
  );
}

/** "9 kg", "4 sacos", or "à vontade" when the host set no exact amount. */
function ItemAmount({item}: {item: ItemView}) {
  const t = useTranslations('BuildList');
  const formatAmount = useFormatAmount();
  if (item.quantityNeeded === null) return <span className={`${styles.amount} ${styles.amountOpen}`}>{t('anyAmount')}</span>;
  return <span className={styles.amount}>{formatAmount(item.quantityNeeded, item.unit)}</span>;
}
