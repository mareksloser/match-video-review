import { useState } from 'react';
import type { MarkerInput, Rule } from '@/lib/types';
import { markerKinds } from '@/lib/labels';
import { extractVeoTime, formatTime, parseTimeString } from '@/lib/time';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';

interface Props {
  initial: MarkerInput;
  rules: Rule[];
  currentTime: number;
  submitLabel: string;
  pending: boolean;
  onSubmit: (input: MarkerInput) => void;
  onCancel: () => void;
}

export function MarkerForm({ initial, rules, currentTime, submitLabel, pending, onSubmit, onCancel }: Props) {
  const [time, setTime] = useState(formatTime(initial.timestampSeconds));
  const [kind, setKind] = useState(initial.kind);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [ruleId, setRuleId] = useState<number | ''>(initial.ruleId ?? '');
  const [ruleLink, setRuleLink] = useState(initial.ruleLink ?? '');

  // Accepts "14:20" as well as a pasted VEO link with "#t=14:20"
  const seconds = parseTimeString(time) ?? extractVeoTime(time);

  return (
    <form
      className="flex flex-col gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (seconds === null) return;
        onSubmit({
          timestampSeconds: seconds,
          kind,
          title: title.trim(),
          description: description.trim() || null,
          ruleId: ruleId || null,
          ruleLink: ruleLink.trim() || null,
        });
      }}
    >
      <Field
        label="Čas"
        hint={seconds === null ? <span className="text-card-red">Zadejte čas jako 14:20 nebo vložte VEO odkaz s #t=…</span> : 'Lze vložit i odkaz z VEO s časem.'}
      >
        <div className="flex gap-2">
          <Input value={time} onChange={(e) => setTime(e.target.value)} className="tabular" aria-label="Čas" aria-invalid={seconds === null} />
          <Button type="button" size="md" variant="ghost" onClick={() => setTime(formatTime(currentTime))}>
            Aktuální
          </Button>
        </div>
      </Field>
      <Field label="Typ situace">
        <Select value={kind} onChange={(e) => setKind(e.target.value as MarkerInput['kind'])}>
          {markerKinds.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </Select>
      </Field>
      <Field label="Název situace">
        <Input required maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neúspěšný vysoký presink" />
      </Field>
      <Field label="Rozbor a doporučení">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Co se stalo a co chceme příště udělat jinak." />
      </Field>
      <Field label="Klubová zásada">
        <Select value={ruleId} onChange={(e) => setRuleId(Number(e.target.value) || '')}>
          <option value="">Bez zásady</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>{r.code} {r.title}</option>
          ))}
        </Select>
      </Field>
      <Field label="Externí odkaz" hint="Např. pravidla FAČR nebo dokument se standardkami.">
        <Input type="url" value={ruleLink} onChange={(e) => setRuleLink(e.target.value)} placeholder="https://" />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Zrušit</Button>
        <Button type="submit" variant="primary" disabled={pending || seconds === null}>{submitLabel}</Button>
      </div>
    </form>
  );
}
