import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { useCategories } from '@/app/queries';
import { Button, ErrorNote, Field, Input, Select } from '@/components/ui';
import { roleLabels } from '@/lib/labels';
import type { Role, User, UserInput } from '@/lib/types';
import { generatePassword } from './password';

interface Props {
  /** Existing user when editing. */
  initial: User | null;
  /** Editing your own account: the role can't be changed (prevents locking yourself out). */
  isSelf: boolean;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (input: UserInput) => void;
  onCancel: () => void;
}

const roleHints: Record<Role, string> = {
  player: 'Vidí zápasy svého týmu a veřejná videa.',
  viewer: 'Vidí všechny týmy, nic nemění.',
  admin: 'Spravuje zápasy, markery, playbook i uživatele.',
};

export function UserForm({ initial, isSelf, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const categories = useCategories();
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState<Role>(initial?.role ?? 'player');
  const [teamCategoryId, setTeamCategoryId] = useState<number | ''>(initial?.teamCategoryId ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: name.trim(), email: email.trim(), role, teamCategoryId: role === 'player' ? teamCategoryId || null : null, password });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jméno">
          <Input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="E-mail">
          <Input type="email" required maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" hint={isSelf ? 'Vlastní roli změnit nemůžete.' : roleHints[role]}>
          <Select value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as Role)}>
            {(Object.keys(roleLabels) as Role[]).map((r) => (
              <option key={r} value={r}>{roleLabels[r]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tým" hint={role === 'player' ? undefined : 'Platí jen pro hráče.'}>
          <Select required={role === 'player'} disabled={role !== 'player'} value={role === 'player' ? teamCategoryId : ''} onChange={(e) => setTeamCategoryId(Number(e.target.value) || '')}>
            <option value="">{role === 'player' ? 'Vyberte tým' : 'Všechny týmy'}</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={initial ? 'Nové heslo' : 'Heslo'} hint={initial ? 'Nechte prázdné, pokud heslo neměníte. Po změně se uživatel odhlásí na všech zařízeních.' : 'Alespoň 8 znaků.'}>
        <div className="flex gap-2">
          <Input
            type={showPassword ? 'text' : 'password'}
            required={!initial}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-label={initial ? 'Nové heslo' : 'Heslo'}
            className="font-mono"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPassword(generatePassword());
              setShowPassword(true);
            }}
          >
            <Wand2 className="h-4 w-4" /> Vygenerovat
          </Button>
        </div>
      </Field>
      {error ? <ErrorNote error={error} /> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Zrušit</Button>
        <Button type="submit" variant="primary" disabled={pending}>{submitLabel}</Button>
      </div>
    </form>
  );
}
