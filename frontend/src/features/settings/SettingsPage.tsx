import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Wrench } from 'lucide-react';
import { useAdminSettings, useMe } from '@/app/queries';
import { Button, ErrorNote, Input, Panel, Spinner, Textarea } from '@/components/ui';
import type { AccentInk, AdminSetting, SettingKey } from '@/lib/types';
import { formatRelative } from '@/lib/datetime';
import { hexToRgb, inkFor, rgbTriplet } from '@/lib/color';
import { cn } from '@/lib/cn';
import { ColorField } from './ColorField';

type Draft = Partial<Record<SettingKey, unknown>>;

const themeOptions = [
  { value: 'system', label: 'Podle zařízení' },
  { value: 'light', label: 'Světlý' },
  { value: 'dark', label: 'Tmavý' },
];

export function SettingsPage() {
  const { data: me } = useMe();
  const { query, update } = useAdminSettings();
  const [draft, setDraft] = useState<Draft>({});
  const [resets, setResets] = useState<Set<SettingKey>>(new Set());
  const [saved, setSaved] = useState(false);

  const rows = useMemo(() => Object.fromEntries((query.data ?? []).map((r) => [r.key, r])) as Record<SettingKey, AdminSetting>, [query.data]);
  const value = <T,>(key: SettingKey): T => (key in draft ? draft[key] : resets.has(key) ? rows[key]?.default : rows[key]?.value) as T;
  const set = (key: SettingKey, v: unknown) => {
    setSaved(false);
    setResets((r) => {
      const n = new Set(r);
      n.delete(key);
      return n;
    });
    setDraft((d) => {
      const n = { ...d };
      if (v === rows[key]?.value) delete n[key];
      else n[key] = v;
      return n;
    });
  };
  const reset = (key: SettingKey) => {
    setSaved(false);
    setDraft((d) => {
      const n = { ...d };
      delete n[key];
      return n;
    });
    setResets((r) => new Set(r).add(key));
  };
  const changes = Object.keys(draft).length + resets.size;

  // Live preview of the accent color (and button text) while editing; the saved ones come back on leave.
  const previewColor = value<string>('accentColor');
  const previewInk = value<AccentInk>('accentInk');
  const savedColor = rows.accentColor?.value as string | undefined;
  const savedInk = (rows.accentInk?.value as AccentInk | undefined) ?? 'auto';
  useEffect(() => {
    const rgb = previewColor && hexToRgb(previewColor);
    if (!rgb || (previewColor === savedColor && previewInk === savedInk)) return;
    const root = document.documentElement;
    root.style.setProperty('--pitch', rgbTriplet(rgb));
    root.style.setProperty('--pitch-ink', rgbTriplet(inkFor(rgb, previewInk ?? 'auto')));
    return () => {
      const back = savedColor && hexToRgb(savedColor);
      if (!back) return;
      root.style.setProperty('--pitch', rgbTriplet(back));
      root.style.setProperty('--pitch-ink', rgbTriplet(inkFor(back, savedInk)));
    };
  }, [previewColor, previewInk, savedColor, savedInk]);

  if (me?.role !== 'admin') return <p className="text-muted">Nastavení spravuje trenér.</p>;
  if (query.isLoading) return <Spinner />;
  if (query.error) return <ErrorNote error={query.error} />;

  const save = () => {
    const values: Draft = { ...draft };
    resets.forEach((k) => (values[k] = null));
    update.mutate(values, {
      onSuccess: () => {
        setDraft({});
        setResets(new Set());
        setSaved(true);
      },
    });
  };
  const discard = () => {
    setDraft({});
    setResets(new Set());
  };
  const fieldError = (key: SettingKey) => {
    const e = update.error as { fields?: Record<string, string> } | null;
    return e?.fields?.[key];
  };
  const meta = (key: SettingKey) => ({ row: rows[key], pendingReset: resets.has(key), error: fieldError(key), onReset: () => reset(key) });
  const maintenance = value<boolean>('maintenanceEnabled');

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <h1 className="font-display text-3xl font-semibold">Nastavení</h1>
      <p className="mt-1 text-muted">Platí pro celou aplikaci a všechny uživatele.</p>
      {saved && <p className="mt-4 rounded-lg border border-pitch/50 bg-pitch/10 px-4 py-2 text-sm" role="status">Nastavení je uložené.</p>}

      <Section title="Vzhled">
        <Setting label="Název aplikace" hint="Titulek v záložce prohlížeče." {...meta('siteTitle')}>
          <Input value={value<string>('siteTitle')} maxLength={80} onChange={(e) => set('siteTitle', e.target.value)} aria-label="Název aplikace" />
        </Setting>
        <Setting label="Název klubu" hint="Ve veřejné galerii, na přihlášení a u loga." {...meta('clubName')}>
          <Input value={value<string>('clubName')} maxLength={80} onChange={(e) => set('clubName', e.target.value)} aria-label="Název klubu" />
        </Setting>
        <Setting label="Hlavní barva" hint="Tlačítka, odkazy, aktivní položky. Náhled se projeví hned, uloží se až tlačítkem Uložit." {...meta('accentColor')}>
          <ColorField value={value<string>('accentColor')} ink={value<AccentInk>('accentInk') ?? 'auto'} onChange={(v) => set('accentColor', v)} />
        </Setting>
        <Setting label="Text na tlačítkách" hint="Automaticky se volí bílý nebo tmavý text podle toho, co je na hlavní barvě čitelnější." {...meta('accentInk')}>
          <Segmented
            label="Text na tlačítkách"
            value={value<string>('accentInk') ?? 'auto'}
            onChange={(v) => set('accentInk', v)}
            options={[
              { value: 'auto', label: 'Automaticky' },
              { value: 'light', label: 'Bílý' },
              { value: 'dark', label: 'Tmavý' },
            ]}
          />
        </Setting>
        <Setting label="Motiv" hint="„Podle zařízení“ respektuje světlý nebo tmavý režim telefonu či počítače." {...meta('defaultTheme')}>
          <Segmented label="Motiv" value={value<string>('defaultTheme')} onChange={(v) => set('defaultTheme', v)} options={themeOptions} />
        </Setting>
      </Section>

      <Section title="Přístup">
        <Setting label="Veřejná galerie" hint="Nepřihlášení návštěvníci vidí zápasy označené jako veřejné. Vypnutím uvidí obsah jen přihlášení." {...meta('publicGallery')}>
          <Switch checked={value<boolean>('publicGallery')} onChange={(v) => set('publicGallery', v)} label="Veřejná galerie" />
        </Setting>
        <Setting
          label="Režim údržby"
          hint="Hráči a náhledové účty uvidí jen zprávu níže a API jim nic nevrátí. Trenéři pracují dál normálně."
          {...meta('maintenanceEnabled')}
        >
          <div className={cn('flex items-center gap-3 rounded-lg', maintenance && 'border border-card-yellow/50 bg-card-yellow/10 p-3')}>
            <Switch checked={maintenance} onChange={(v) => set('maintenanceEnabled', v)} label="Režim údržby" />
            {maintenance && (
              <span className="inline-flex items-center gap-1.5 text-sm text-card-yellow">
                <Wrench className="h-4 w-4" /> Po uložení se aplikace pro ostatní uzavře.
              </span>
            )}
          </div>
        </Setting>
        <Setting label="Zpráva při údržbě" hint="Co uvidí hráči, například do kdy údržba potrvá." {...meta('maintenanceMessage')}>
          <Textarea value={value<string>('maintenanceMessage')} maxLength={500} rows={3} onChange={(e) => set('maintenanceMessage', e.target.value)} aria-label="Zpráva při údržbě" />
        </Setting>
      </Section>

      {update.error && !(update.error as { fields?: unknown }).fields ? <div className="mt-4"><ErrorNote error={update.error} /></div> : null}

      {changes > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 px-4 py-3 backdrop-blur" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <span className="text-sm">
              Neuložené změny: <span className="tabular font-medium">{changes}</span>
            </span>
            <Button variant="ghost" className="ml-auto" onClick={discard} disabled={update.isPending}>Zahodit</Button>
            <Button variant="primary" onClick={save} disabled={update.isPending}>{update.isPending ? 'Ukládám…' : 'Uložit'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="mt-6">
      <h2 className="border-b border-line px-5 py-3 font-display text-xl font-semibold">{title}</h2>
      <div className="divide-y divide-line">{children}</div>
    </Panel>
  );
}

function Setting({
  label,
  hint,
  row,
  pendingReset,
  error,
  onReset,
  children,
}: {
  label: string;
  hint: string;
  row: AdminSetting | undefined;
  pendingReset: boolean;
  error?: string;
  onReset: () => void;
  children: React.ReactNode;
}) {
  const showReset = row && !row.isDefault && !pendingReset;
  return (
    <div className="grid gap-2 px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-medium">{label}</span>
        {pendingReset && <span className="text-xs text-card-yellow">vrátí se na výchozí po uložení</span>}
        {showReset && (
          <button onClick={onReset} className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-ink" title={`Výchozí: ${String(row.default)}`}>
            <RotateCcw className="h-3.5 w-3.5" /> Obnovit výchozí
          </button>
        )}
      </div>
      <p className="-mt-1 text-sm text-muted">{hint}</p>
      {children}
      {error && <p className="text-sm text-card-red">{error}</p>}
      {row && !row.isDefault && row.updatedAt && (
        <p className="text-xs text-muted">
          Změněno {formatRelative(row.updatedAt)}{row.updatedBy ? `, ${row.updatedBy}` : ''}
        </p>
      )}
    </div>
  );
}

function Segmented({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex w-fit rounded-lg border border-line p-1" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('rounded-md px-3 py-1.5 text-sm', value === o.value ? 'bg-pitch text-pitch-ink' : 'text-muted hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-pitch' : 'bg-raised ring-1 ring-line')}
    >
      <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  );
}
