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
  primary: 'border-blue-800 bg-blue-800 text-white hover:bg-blue-900',
  secondary: 'border-blue-800 bg-white text-blue-900 hover:bg-blue-50',
  danger: 'border-red-700 bg-white text-red-700 hover:bg-red-50',
  success: 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800',
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
        'focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:opacity-50',
        size==='sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        variants[variant],className,
      ].join(' ')}>
      {children}
    </button>
  );
}
