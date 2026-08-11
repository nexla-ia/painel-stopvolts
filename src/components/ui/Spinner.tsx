export default function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Carregando"
    />
  );
}
