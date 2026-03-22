import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', children, className = '', ...props }: PropsWithChildren<ButtonProps>) {
  const base = 'rounded-md px-4 py-2 text-sm font-medium transition';
  const styles = variant === 'primary'
    ? 'bg-primary text-white hover:bg-primary-hover'
    : 'bg-surface-elevated text-text-primary border border-border hover:border-primary';

  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
