import { Link } from '@tanstack/react-router';
import { Wrench } from 'lucide-react';
import { Crest } from '@/components/Crest';
import { useSettingsValues } from './queries';

export function MaintenanceScreen({ signedIn }: { signedIn: boolean }) {
  const { maintenanceMessage, clubName } = useSettingsValues();
  return (
    <div className="mx-auto mt-10 max-w-md text-center">
      <Crest className="mx-auto h-24 w-20" label={clubName} />
      <h1 className="mt-4 inline-flex items-center gap-2 font-display text-3xl font-semibold">
        <Wrench className="h-6 w-6 text-muted" /> Probíhá údržba
      </h1>
      <p className="mt-3 whitespace-pre-line text-lg text-muted">{maintenanceMessage}</p>
      {!signedIn && (
        <p className="mt-6 text-sm text-muted">
          Jste trenér?{' '}
          <Link to="/login" className="font-medium text-pitch hover:underline">Přihlásit se</Link>
        </p>
      )}
    </div>
  );
}
