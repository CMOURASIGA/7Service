import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export type IconActionKind = 'view' | 'edit' | 'danger' | 'success';

const paths: Record<IconActionKind, ReactNode> = {
  view: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  edit: <><path d="M12 20h9" /><path d="m17 4 3 3-11 11-4 1 1-4L17 4Z" /></>,
  danger: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="m6 7 1 14h10l1-14M9 7V4h6v3" /></>,
  success: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
};

const tones: Record<IconActionKind, string> = {
  view: 'border-slate-300 text-slate-700 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700',
  edit: 'border-slate-300 text-slate-700 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700',
  danger: 'border-red-300 text-red-700 hover:border-red-700 hover:bg-danger-soft',
  success: 'border-emerald-300 text-emerald-700 hover:border-emerald-700 hover:bg-success-soft',
};

export function IconActionLink({ href, kind, label, ...props }: {
  href: ComponentProps<typeof Link>['href'];
  kind: IconActionKind;
  label: string;
}) {
  return (
    <Link href={href} aria-label={label} title={label} {...props}
      className={[
        'inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-white sm:h-10 sm:w-10',
        'transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-brand-600 disabled:opacity-50',
        tones[kind],
      ].join(' ')}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        {paths[kind]}
      </svg>
    </Link>
  );
}
