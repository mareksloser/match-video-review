import { ArrowUpRight, Circle, Eraser, Minus, MousePointer2, Trash2, Type, Undo2, UserRound } from 'lucide-react';
import type { DrawingEditor, Tool } from '@/canvas/useDrawingEditor';
import { shapeColors } from '@/canvas/render';
import type { ShapeColor } from '@/lib/types';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

const tools: { tool: Tool; label: string; icon: typeof ArrowUpRight }[] = [
  { tool: 'arrow', label: 'Šipka', icon: ArrowUpRight },
  { tool: 'line', label: 'Čára', icon: Minus },
  { tool: 'zone', label: 'Zóna', icon: Circle },
  { tool: 'player', label: 'Hráč', icon: UserRound },
  { tool: 'text', label: 'Text', icon: Type },
  { tool: 'select', label: 'Posunout', icon: MousePointer2 },
  { tool: 'erase', label: 'Gumovat', icon: Eraser },
];

const colorNames: Record<ShapeColor, string> = { yellow: 'Žlutá', blue: 'Modrá', red: 'Červená', white: 'Bílá' };

export function DrawingToolbar({ editor, onSave, onCancel, saving }: { editor: DrawingEditor; onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-panel px-3 py-2">
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Kreslicí nástroje">
        {tools.map(({ tool, label, icon: Icon }) => (
          <button
            key={tool}
            onClick={() => editor.setTool(tool)}
            aria-pressed={editor.tool === tool}
            title={label}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm',
              editor.tool === tool ? 'bg-pitch text-pitch-ink' : 'text-muted hover:bg-raised hover:text-ink',
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden xl:inline">{label}</span>
          </button>
        ))}
      </div>

      {['arrow', 'line', 'zone', 'text'].includes(editor.tool) && (
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Barva">
          {(Object.keys(shapeColors) as ShapeColor[]).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={editor.color === c}
              aria-label={colorNames[c]}
              onClick={() => editor.setColor(c)}
              className={cn('h-6 w-6 rounded-full border-2 ring-1 ring-line', editor.color === c ? 'border-ink' : 'border-transparent')}
              style={{ background: shapeColors[c] }}
            />
          ))}
        </div>
      )}
      {editor.tool === 'arrow' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editor.dashed} onChange={(e) => editor.setDashed(e.target.checked)} className="h-4 w-4" />
          Přerušovaná (běh bez míče)
        </label>
      )}
      {editor.tool === 'player' && (
        <div className="flex rounded-md border border-line p-0.5 text-sm" role="radiogroup" aria-label="Tým">
          {(['own', 'opponent'] as const).map((t) => (
            <button
              key={t}
              role="radio"
              aria-checked={editor.team === t}
              onClick={() => editor.setTeam(t)}
              className={cn('rounded px-2.5 py-1', editor.team === t ? 'bg-raised text-ink' : 'text-muted')}
            >
              {t === 'own' ? 'Náš hráč' : 'Soupeř'}
            </button>
          ))}
        </div>
      )}
      {editor.tool === 'text' && (
        <input
          value={editor.text}
          onChange={(e) => editor.setText(e.target.value)}
          placeholder="Napište text a klikněte do obrazu"
          className="h-9 w-56 rounded-md border border-line bg-bg px-2 text-sm"
        />
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={editor.undo} disabled={!editor.canUndo} aria-label="Zpět" title="Zpět">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={editor.clear} disabled={!editor.shapes.length} aria-label="Smazat vše" title="Smazat vše">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Zrušit</Button>
        <Button size="sm" variant="primary" onClick={onSave} disabled={saving}>Uložit kresbu</Button>
      </div>
    </div>
  );
}
