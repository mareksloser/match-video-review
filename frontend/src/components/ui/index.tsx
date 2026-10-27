import { cva, type VariantProps } from 'class-variance-authority';
import { cloneElement, forwardRef, isValidElement, useId, type ReactElement, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch',
  {
    variants: {
      variant: {
        primary: 'bg-pitch text-pitch-ink hover:bg-pitch/90',
        outline: 'border border-line bg-transparent text-ink hover:bg-raised',
        ghost: 'text-muted hover:text-ink hover:bg-raised',
        danger: 'border border-card-red/50 text-card-red hover:bg-card-red/10',
      },
      size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-[0.95rem]', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';

const field =
  'w-full rounded-md border border-line bg-bg px-3 py-2 text-[0.95rem] text-ink placeholder:text-muted/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pitch';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, 'h-10', className)} {...p} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, 'min-h-[88px] resize-y', className)} {...p} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(field, 'h-10 pr-8', className)} {...p} />
));
Select.displayName = 'Select';

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  const hintId = `${id}-hint`;
  // Label and hint are linked to the control by id, so screen readers announce just "label" + hint.
  const control =
    isValidElement(children) && [Input, Select, Textarea].includes(children.type as never)
      ? cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, { id, 'aria-describedby': hint ? hintId : undefined })
      : children;
  const linked = control !== children;
  return (
    <div className={cn('flex flex-col gap-1.5 text-sm', className)}>
      {linked ? (
        <label htmlFor={id} className="font-medium text-ink">{label}</label>
      ) : (
        <span className="font-medium text-ink" id={`${id}-label`}>{label}</span>
      )}
      {linked ? control : <div role="group" aria-labelledby={`${id}-label`}>{control}</div>}
      {hint && <span id={hintId} className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export function Badge({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span style={style} className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium', className)}>
      {children}
    </span>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-xl border border-line bg-panel', className)}>{children}</section>;
}

export function Spinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-pitch" role="status" aria-label="Načítání" />;
}

export function ErrorNote({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Něco se nepovedlo.';
  return <p className="rounded-md border border-card-red/40 bg-card-red/10 px-3 py-2 text-sm text-card-red">{message}</p>;
}
