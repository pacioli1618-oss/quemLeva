'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {CoveredItemList, ItemCard} from '@/components/event/ItemCard';
import {TabBar} from '@/components/event/TabBar';
import {Button, ButtonLink} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {ChipGroup} from '@/components/ui/Chip';
import {ProgressBar} from '@/components/ui/ProgressBar';
import {Stepper} from '@/components/ui/Stepper';
import {Tag} from '@/components/ui/Tag';
import {TextField} from '@/components/ui/TextField';
import type {EventKind, ItemView} from '@/lib/api-mappers';
import {splitItemsByStatus} from '@/lib/item-status';
import {useFormatAmount} from '@/i18n/units';

const ME = 'p-me';

const sampleItems: ItemView[] = [
  {
    id: 'meat', name: 'Carne', unit: 'kg', quantityNeeded: 9, quantityClaimed: 5, category: 'meat', sort: 1,
    claims: [
      {participantId: 'p1', name: 'Tio Zé', quantity: 3, note: null, amountSpent: null},
      {participantId: 'p2', name: 'Paulo', quantity: 2, note: null, amountSpent: null},
    ],
  },
  {id: 'ice', name: 'Gelo', unit: 'bag', quantityNeeded: 4, quantityClaimed: 0, category: 'supplies', sort: 2, claims: []},
  {
    id: 'dessert', name: 'Sobremesa', unit: null, quantityNeeded: 2, quantityClaimed: 1, category: 'desserts', sort: 3,
    claims: [{participantId: 'p3', name: 'Juliana', quantity: 1, note: 'pudim', amountSpent: null}],
  },
  {
    id: 'charcoal', name: 'Carvão', unit: 'bag', quantityNeeded: 2, quantityClaimed: 2, category: 'supplies', sort: 4,
    claims: [{participantId: 'p1', name: 'Tio Zé', quantity: 2, note: null, amountSpent: null}],
  },
  {
    id: 'soda', name: 'Refrigerante', unit: 'bottle', quantityNeeded: 6, quantityClaimed: 6, category: 'drinks', sort: 5,
    claims: [{participantId: ME, name: 'Luca', quantity: 6, note: null, amountSpent: null}],
  },
  {
    id: 'farofa', name: 'Farofa e vinagrete', unit: null, quantityNeeded: null, quantityClaimed: 1, category: 'sides', sort: 6,
    claims: [{participantId: 'p4', name: 'Tia Rosa', quantity: 1, note: null, amountSpent: null}],
  },
];

export function UiShowcase() {
  const create = useTranslations('CreateEvent');
  const kinds = useTranslations('EventKind');
  const list = useTranslations('EventList');
  const formatAmount = useFormatAmount();
  const [adults, setAdults] = useState(20);
  const [meat, setMeat] = useState(1.5);
  const [kind, setKind] = useState<EventKind>('barbecue');
  const [name, setName] = useState('Churrasco de domingo');
  const {missing, covered} = splitItemsByStatus(sampleItems);

  return (
    <main style={{maxWidth: 420, margin: '0 auto', padding: 16, display: 'grid', gap: 20}}>
      <h1 style={{fontSize: 19, fontWeight: 800, margin: 0}}>UI showcase</h1>

      <Section title="Button">
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <Button>{list('claim')}</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button isLoading>Saving</Button>
          <Button disabled>Disabled</Button>
        </div>
        <ButtonLink href="/" size="cta" isFullWidth>
          {create('submit')}
        </ButtonLink>
      </Section>

      <Section title="TextField">
        <Card variant="large" style={{display: 'grid', gap: 14}}>
          <TextField label={create('name')} value={name} onChange={(event) => setName(event.target.value)} />
          <TextField label={create('location')} placeholder={create('locationPlaceholder')} hint="Opcional" />
          <TextField label={create('hostName')} defaultValue="" error="Escreva seu nome para entrar no evento." />
        </Card>
      </Section>

      <Section title="Stepper and Chip">
        <Card variant="large" style={{display: 'grid', gap: 12}}>
          <ChipGroup
            label={create('kind')}
            value={kind}
            onChange={setKind}
            options={(['barbecue', 'lunch', 'birthday', 'other'] as const).map((value) => ({value, label: kinds(value)}))}
          />
          <Stepper
            label={create('adults')}
            value={adults}
            onChange={setAdults}
            decreaseLabel={create('decreaseAdults')}
            increaseLabel={create('increaseAdults')}
          />
          <Stepper
            label="Carne"
            value={meat}
            onChange={setMeat}
            step={0.5}
            max={4}
            decreaseLabel="−0,5 kg"
            increaseLabel="+0,5 kg"
            formatValue={(value) => formatAmount(value, 'kg')}
          />
        </Card>
      </Section>

      <Section title="Tag and ProgressBar">
        <Card style={{display: 'grid', gap: 10}}>
          <strong style={{fontSize: 15}}>{list('summary', {done: 5, total: 8})}</strong>
          <ProgressBar value={5 / 8} label={list('summary', {done: 5, total: 8})} />
          <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
            <Tag tone="brand">{list('confirmed', {count: 11})}</Tag>
            <Tag>{list('maybe', {count: 3})}</Tag>
            <Tag tone="ember">{list('missingItems', {count: 3})}</Tag>
          </div>
        </Card>
      </Section>

      <Section title="ItemCard">
        <div style={{display: 'grid', gap: 8}}>
          {missing.map((item) => (
            <ItemCard key={item.id} item={item} meId={ME} onClaim={() => undefined} />
          ))}
        </div>
        <Card variant="flush">
          <CoveredItemList items={covered} meId={ME} />
        </Card>
      </Section>

      <Section title="TabBar (host, then participant)">
        <div style={{display: 'grid', gap: 8, margin: '0 -16px'}}>
          <TabBar slug="abc123" isHost activeTab="list" />
          <TabBar slug="abc123" isHost={false} activeTab="guests" />
        </div>
      </Section>
    </main>
  );
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section style={{display: 'grid', gap: 10}}>
      <h2 style={{margin: 0, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)'}}>
        {title}
      </h2>
      {children}
    </section>
  );
}
