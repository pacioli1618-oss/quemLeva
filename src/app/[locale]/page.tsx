import {useTranslations} from 'next-intl';
import {Logo} from '@/components/brand/Logo';
import {HeaderControls} from '@/components/HeaderControls';
import {MyEventsLink} from '@/components/MyEventsLink';
import {CreateEventForm} from './CreateEventForm';
import styles from './CreateEvent.module.css';

// Screen 1 · Create event. Static shell; the form runs in the browser (device id, host token).
export default function CreateEventPage() {
  const t = useTranslations('CreateEvent');

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <Logo />
        <HeaderControls />
      </header>
      <MyEventsLink className={styles.myEvents} />
      <section className={styles.intro}>
        <h1 className={styles.headline}>{t('headline')}</h1>
        <p className={styles.lead}>{t('intro')}</p>
      </section>
      <CreateEventForm />
    </main>
  );
}
