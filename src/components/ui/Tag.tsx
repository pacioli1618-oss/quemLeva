import type {ReactNode} from 'react';
import styles from './Tag.module.css';

type TagProps = {
  /** brand = covered/confirmed, ember = still missing, neutral = everything else. */
  tone?: 'brand' | 'neutral' | 'ember';
  children: ReactNode;
};

/** Small read-only label: "11 confirmados", "3 itens faltando". */
export function Tag({tone = 'neutral', children}: TagProps) {
  return <span className={`${styles.tag} ${styles[tone]}`}>{children}</span>;
}
