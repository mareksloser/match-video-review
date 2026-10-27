import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCreateRule, useDeleteRule, useMe, useRules, useUpdateRule } from '@/app/queries';
import { Button, ErrorNote, Panel, Spinner } from '@/components/ui';
import type { Rule } from '@/lib/types';
import { RuleForm } from './RuleForm';
import { cn } from '@/lib/cn';

export function PlaybookPage() {
  const { data: me } = useMe();
  const rules = useRules(!!me);
  const create = useCreateRule();
  const { hash } = useLocation();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: 'center' });
  }, [hash, rules.data]);

  if (!me) return <p className="text-muted">Playbook je dostupný po přihlášení.</p>;
  const isAdmin = me.role === 'admin';
  const areas = [...new Set(rules.data?.map((r) => r.area))];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Playbook</h1>
          <p className="mt-1 max-w-prose text-muted">Klubové zásady, na které trenér odkazuje u jednotlivých situací ze zápasů.</p>
        </div>
        {isAdmin && !adding && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Přidat zásadu
          </Button>
        )}
      </div>

      {adding && (
        <Panel className="mt-5 p-5">
          <RuleForm
            submitLabel="Přidat zásadu"
            pending={create.isPending}
            error={create.error}
            onCancel={() => setAdding(false)}
            onSubmit={(input) => create.mutate(input, { onSuccess: () => setAdding(false) })}
          />
        </Panel>
      )}

      {rules.isLoading && <Spinner />}
      {rules.error && <ErrorNote error={rules.error} />}
      {areas.map((area) => (
        <section key={area} className="mt-8">
          <h2 className="font-display text-xl font-semibold text-muted">{area}</h2>
          <div className="mt-3 flex flex-col gap-3">
            {rules.data
              ?.filter((r) => r.area === area)
              .map((r) =>
                editingId === r.id ? (
                  <EditRule key={r.id} rule={r} onDone={() => setEditingId(null)} />
                ) : (
                  <RuleCard key={r.id} rule={r} highlighted={hash === `rule-${r.id}`} isAdmin={isAdmin} onEdit={() => setEditingId(r.id)} />
                ),
              )}
          </div>
        </section>
      ))}
    </div>
  );
}

function RuleCard({ rule, highlighted, isAdmin, onEdit }: { rule: Rule; highlighted: boolean; isAdmin: boolean; onEdit: () => void }) {
  const remove = useDeleteRule();
  const [confirming, setConfirming] = useState(false);

  return (
    <article id={`rule-${rule.id}`} className={cn('rounded-xl border bg-panel p-4', highlighted ? 'border-pitch' : 'border-line')}>
      <div className="flex items-start gap-3">
        <h3 className="flex-1 font-display text-lg font-semibold">
          <span className="text-pitch">{rule.code}</span> {rule.title}
        </h3>
        {isAdmin && !confirming && (
          <div className="-mr-1 -mt-1 flex shrink-0">
            <Button size="icon" variant="ghost" onClick={onEdit} aria-label={`Upravit zásadu ${rule.code}`} title="Upravit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setConfirming(true)} aria-label={`Smazat zásadu ${rule.code}`} title="Smazat">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <p className="mt-1 whitespace-pre-line leading-relaxed">{rule.body}</p>
      {confirming && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-card-red/40 bg-card-red/5 p-3 text-sm">
          <span className="flex-1">Markery, které na zásadu odkazují, zůstanou, jen bez odkazu.</span>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Ponechat</Button>
          <Button size="sm" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(rule.id)}>
            Opravdu smazat
          </Button>
        </div>
      )}
      {remove.error ? <div className="mt-2"><ErrorNote error={remove.error} /></div> : null}
    </article>
  );
}

function EditRule({ rule, onDone }: { rule: Rule; onDone: () => void }) {
  const update = useUpdateRule();
  return (
    <Panel className="border-pitch/60 p-4">
      <RuleForm
        initial={rule}
        submitLabel="Uložit změny"
        pending={update.isPending}
        error={update.error}
        onCancel={onDone}
        onSubmit={(input) => update.mutate({ id: rule.id, input }, { onSuccess: onDone })}
      />
    </Panel>
  );
}
