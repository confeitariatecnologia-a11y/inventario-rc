import { AlertCircle, X } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorState({ message, onDismiss }: ErrorStateProps) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 animate-slide-down">
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-500 hover:text-red-700">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
