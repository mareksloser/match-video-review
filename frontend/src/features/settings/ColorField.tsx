import { TriangleAlert } from 'lucide-react';
import { BACKGROUNDS, contrast, hexToRgb, readableInk, rgbTriplet } from '@/lib/color';
import { cn } from '@/lib/cn';

const PRESETS: { label: string; hex: string }[] = [
  { label: 'Zelená (výchozí)', hex: '#1fbf75' },
  { label: 'Klubová červená', hex: '#d3012a' },
  { label: 'Modrá', hex: '#2f6bff' },
  { label: 'Fialová', hex: '#8b5cf6' },
  { label: 'Oranžová', hex: '#f97316' },
];

export function ColorField({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const rgb = hexToRgb(value);
  const warnings: string[] = [];
  if (rgb) {
    const light = contrast(rgb, BACKGROUNDS.light);
    const dark = contrast(rgb, BACKGROUNDS.dark);
    if (light < 3) warnings.push(`Ve světlém motivu bude barva špatně čitelná (kontrast ${light.toFixed(1)} : 1, doporučeno aspoň 3 : 1).`);
    if (dark < 3) warnings.push(`V tmavém motivu bude barva špatně čitelná (kontrast ${dark.toFixed(1)} : 1, doporučeno aspoň 3 : 1).`);
    const [r, g, b] = rgb;
    if (r > 150 && g < 110 && b < 130)
      warnings.push('Červenou aplikace používá pro chyby, mazání a marker „Chyba“. Tlačítka by se s varováními mohla plést.');
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={rgb ? value : '#1fbf75'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-line bg-bg p-1"
          aria-label="Vybrat barvu"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          maxLength={7}
          className={cn('h-10 w-28 rounded-md border bg-bg px-3 font-mono text-sm', rgb ? 'border-line' : 'border-card-red')}
          aria-label="Barva jako HEX"
          aria-invalid={!rgb}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Předvolby">
          {PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              title={p.label}
              aria-label={p.label}
              aria-pressed={value.toLowerCase() === p.hex}
              onClick={() => onChange(p.hex)}
              className={cn('h-8 w-8 rounded-full border-2 ring-1 ring-line', value.toLowerCase() === p.hex ? 'border-ink' : 'border-transparent')}
              style={{ background: p.hex }}
            />
          ))}
        </div>
      </div>

      {rgb && (
        <div className="grid gap-2 sm:grid-cols-2" aria-label="Náhled">
          {(['light', 'dark'] as const).map((theme) => {
            const bg = BACKGROUNDS[theme];
            const text = theme === 'light' ? '#101824' : '#e5ebf2';
            return (
              <div key={theme} className="flex items-center gap-3 rounded-lg border border-line p-3" style={{ background: `rgb(${rgbTriplet(bg)})`, color: text }}>
                <span className="rounded-md px-3 py-1.5 text-sm font-medium" style={{ background: value, color: `rgb(${rgbTriplet(readableInk(rgb))})` }}>
                  Tlačítko
                </span>
                <span className="text-sm font-medium" style={{ color: value }}>Odkaz</span>
                <span className="ml-auto text-xs opacity-70">{theme === 'light' ? 'Světlý' : 'Tmavý'}</span>
              </div>
            );
          })}
        </div>
      )}

      {warnings.map((w) => (
        <p key={w} className="flex gap-2 text-sm text-card-yellow">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {w}
        </p>
      ))}
    </div>
  );
}
