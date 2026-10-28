import { Link } from '@tanstack/react-router';
import { Wrench } from 'lucide-react';
import { Crest } from '@/components/Crest';
import { PenaltyGame } from '@/features/maintenance/PenaltyGame';
import { useSettingsValues } from './queries';

export function MaintenanceScreen({ signedIn }: { signedIn: boolean }) {
  const { maintenanceMessage, clubName } = useSettingsValues();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Crest className="h-20 w-16 shrink-0" label={clubName} />
        <div>
          <h1 className="inline-flex items-center gap-2 font-display text-3xl font-semibold">
            <Wrench className="h-6 w-6 text-card-yellow" /> Probíhá údržba
          </h1>
          <p className="mt-1 whitespace-pre-line text-lg text-muted">{maintenanceMessage}</p>
        </div>
      </div>

      <div className="mt-6">
        <PenaltyGame />
      </div>

      {!signedIn && (
        <p className="mt-6 text-center text-sm text-muted">
          Jste trenér?{' '}
          <Link to="/login" className="font-medium text-pitch hover:underline">Přihlásit se</Link>
        </p>
      )}
    </div>
  );
}
