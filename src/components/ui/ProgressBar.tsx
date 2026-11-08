import styles from './ProgressBar.module.css';

type ProgressBarProps = {
  /** 0 to 1. */
  value: number;
  /** Accessible name, e.g. "5 de 8 itens garantidos". The bar itself carries no text. */
  label: string;
  tone?: 'brand' | 'ember';
  size?: 'medium' | 'small';
};

/** Pill-shaped progress: 10px for the event summary, 6px inside an item card. */
export function ProgressBar({value, label, tone = 'brand', size = 'medium'}: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className={`${styles.track} ${styles[tone]} ${styles[size]}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className={styles.fill} style={{width: `${percent}%`}} />
    </div>
  );
}
