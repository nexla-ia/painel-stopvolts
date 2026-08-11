import { HTMLAttributes } from 'react';

export default function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-edge bg-panel ${className}`}
      {...props}
    />
  );
}
