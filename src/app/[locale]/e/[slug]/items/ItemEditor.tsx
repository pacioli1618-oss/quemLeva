'use client';

import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/Button';
import {SelectField} from '@/components/ui/SelectField';
import {TextField} from '@/components/ui/TextField';
import {categoryCodes, isCategoryCode, isUnitCode, unitCodes} from '@/i18n/units';
import type {ItemInput, ItemView} from '@/lib/api';
import {parseQuantity} from '@/lib/quantity';
import styles from './BuildList.module.css';

type ItemEditorProps = {
  item: ItemView;
  isSaving: boolean;
  onSave: (input: ItemInput) => void;
  onCancel: () => void;
};

/** Inline editor that opens under a tapped item: name, quantity, unit and category. */
export function ItemEditor({item, isSaving, onSave, onCancel}: ItemEditorProps) {
  const t = useTranslations('BuildList');
  const common = useTranslations('Common');
  const units = useTranslations('Units');
  const categories = useTranslations('Categories');

  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantityNeeded === null ? '' : String(item.quantityNeeded));
  // Free-text units/categories typed before codes existed are kept as they are.
  const [unit, setUnit] = useState(item.unit ?? '');
  const [category, setCategory] = useState(item.category ?? '');
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const unitOptions = [
    {value: '', label: t('noUnit')},
    ...unitCodes.map((code) => ({value: code, label: units(code, {count: 2})})),
    ...(item.unit && !isUnitCode(item.unit) ? [{value: item.unit, label: item.unit}] : []),
  ];
  const categoryOptions = [
    {value: '', label: t('noCategory')},
    ...categoryCodes.map((code) => ({value: code, label: categories(code)})),
    ...(item.category && !isCategoryCode(item.category) ? [{value: item.category, label: item.category}] : []),
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseQuantity(quantity);
    if (parsed === null) {
      setQuantityError(t('quantityInvalid'));
      return;
    }
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      quantityNeeded: parsed,
      unit: unit || undefined,
      category: category || undefined,
    });
  }

  return (
    <form className={styles.editor} onSubmit={handleSubmit}>
      <TextField label={t('itemName')} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
      <div className={styles.editorRow}>
        <TextField
          label={t('quantity')}
          inputMode="decimal"
          value={quantity}
          onChange={(event) => {
            setQuantity(event.target.value);
            setQuantityError(null);
          }}
          placeholder={t('anyAmount')}
          error={quantityError}
        />
        <SelectField label={t('unit')} value={unit} onChange={(event) => setUnit(event.target.value)} options={unitOptions} />
      </div>
      <SelectField
        label={t('category')}
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        options={categoryOptions}
      />
      <div className={styles.editorActions}>
        <Button variant="ghost" onClick={onCancel}>
          {common('cancel')}
        </Button>
        <Button type="submit" isLoading={isSaving}>
          {common('save')}
        </Button>
      </div>
    </form>
  );
}
