import { STATUS_LABELS, STATUS_STYLES } from '@/lib/utils';
import type { AssetStatus } from '@/types';

interface StatusBadgeProps {
  status: AssetStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export default function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const styles = STATUS_STYLES[status];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${styles.bg} ${styles.text} ${styles.border} border ${sizeClasses}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      {STATUS_LABELS[status]}
    </span>
  );
}
