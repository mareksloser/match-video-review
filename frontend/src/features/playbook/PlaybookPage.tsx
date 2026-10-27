import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useCreateRule, useMe, useRules } from '@/app/queries';
import { Button, ErrorNote, Field, Input, Panel, Spinner, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

export function PlaybookPage() {
  const { data: me } = useMe();
  const rules = useRules(!!me);
  const create = useCreateRule();
  const { hash } = useLocation();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ code: '', area: '', title: '', body: '' });

  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: 'center' });
  }, [hash, rules.data]);

  if (!me) return <p className="text-muted">Playbook je dostupný po přihlášení.</p>;

  const areas = [...new Set(rules.data?.map((r) => r.area))];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Playbook</h1>
          <p className="mt-1 max-w-prose text-muted">Klubové zásady, na které trenér odkazuje u jednotlivých situací ze zápasů.</p>
        </div>
        {me.role === 'admin' && !adding && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Přidat zásadu
          </Button>
        )}
      </div>

      {adding && (
        <Panel className="mt-5 p-5">
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(form, {
                onSuccess: () => {
                  setAdding(false);
                  setForm({ code: '', area: '', title: '', body: '' });
                },
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
              <Field label="Číslo"><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="#7" /></Field>
              <Field label="Oblast"><Input required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Standardky" /></Field>
            </div>
            <Field label="Název"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Přímý kop – obrana" /></Field>
            <Field label="Popis"><Textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
            {create.error && <ErrorNote error={create.error} />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Zrušit</Button>
              <Button type="submit" variant="primary" disabled={create.isPending}>Přidat zásadu</Button>
            </div>
          </form>
        </Panel>
      )}

      {rules.isLoading && <Spinner />}
      {rules.error && <ErrorNote error={rules.error} />}
      {areas.map((area) => (
        <section key={area} className="mt-8">
          <h2 className="font-display text-xl font-semibold text-muted">{area}</h2>
          <div className="mt-3 flex flex-col gap-3">
            {rules.data?.filter((r) => r.area === area).map((r) => (
              <article
                key={r.id}
                id={`rule-${r.id}`}
                className={cn('rounded-xl border bg-panel p-4', hash === `rule-${r.id}` ? 'border-pitch' : 'border-line')}
              >
                <h3 className="font-display text-lg font-semibold">
                  <span className="text-pitch">{r.code}</span> {r.title}
                </h3>
                <p className="mt-1 leading-relaxed">{r.body}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
