interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const dims = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${dims} border-2 border-slate-200 border-t-primary-500 rounded-full animate-spin`}
        role="status"
        aria-label="Carregando"
      />
    </div>
  );
}
