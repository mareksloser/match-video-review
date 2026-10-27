import { useState } from 'react';
import type { Rule } from '@/lib/types';
import { Button, ErrorNote, Field, Input, Textarea } from '@/components/ui';

type RuleInput = Omit<Rule, 'id'>;

interface Props {
  initial?: RuleInput;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (input: RuleInput) => void;
  onCancel: () => void;
}

export function RuleForm({ initial, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<RuleInput>(initial ?? { code: '', area: '', title: '', body: '' });
  const set = (key: keyof RuleInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ code: form.code.trim(), area: form.area.trim(), title: form.title.trim(), body: form.body.trim() });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
        <Field label="Číslo"><Input required maxLength={20} value={form.code} onChange={set('code')} placeholder="#7" /></Field>
        <Field label="Oblast"><Input required maxLength={100} value={form.area} onChange={set('area')} placeholder="Standardky" /></Field>
      </div>
      <Field label="Název"><Input required maxLength={255} value={form.title} onChange={set('title')} placeholder="Přímý kop – obrana" /></Field>
      <Field label="Popis"><Textarea required value={form.body} onChange={set('body')} /></Field>
      {error ? <ErrorNote error={error} /> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Zrušit</Button>
        <Button type="submit" variant="primary" disabled={pending}>{submitLabel}</Button>
      </div>
    </form>
  );
}
