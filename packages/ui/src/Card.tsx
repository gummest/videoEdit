import type { HTMLAttributes, PropsWithChildren } from 'react';

export function Card({ children, className = '', ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
