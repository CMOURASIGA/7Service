import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md';
export type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};
const variants: Record<ButtonVariant,string> = {
  primary: 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border-brand-600 bg-white text-brand-700 hover:bg-brand-50',
  danger: 'border-danger bg-white text-danger hover:bg-danger-soft',
  success: 'border-success bg-success text-white hover:brightness-90',
};

/** Shared Consult Services action style. Defaults to primary, not full width. */
export function ActionButton({
  variant='primary',size='md',loading=false,disabled,className='',children,...props
}: ActionButtonProps) {
  return (
    <button {...props} disabled={disabled || loading} aria-busy={loading || undefined}
      className={[
        'inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-md border font-medium',
        'transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50',
        size==='sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        variants[variant],className,
      ].join(' ')}>
      {children}
    </button>
  );
}
