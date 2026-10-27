import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ErrorCode } from '../errors';
import { useI18n } from '../i18n';

export function LoadStatus({
  progress,
  error,
  partCount,
}: {
  progress: number;
  error: ErrorCode | null;
  partCount: number;
}) {
  const { t, n } = useI18n();
  if (error)
    return (
      <div className="loading glass error" role="alert">
        <p>{t.errors[error]}</p>
        <Button variant="ghost" onClick={() => location.reload()}>
          {t.loading.reload}
        </Button>
      </div>
    );
  if (progress >= 100) return null;
  return (
    <div className="loading glass" role="status">
      <Activity size={18} />
      <div>
        <strong>{t.loading.title}</strong>
        <span>{t.loading.progress(progress, n(partCount))}</span>
        <div className="loading-track">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
