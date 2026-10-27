import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoadStatus({
  progress,
  error,
  partCount,
}: {
  progress: number;
  error: string;
  partCount?: number;
}) {
  if (error)
    return (
      <div className="loading glass error" role="alert">
        <p>{error}</p>
        <Button variant="ghost" onClick={() => location.reload()}>
          Reload viewer
        </Button>
      </div>
    );
  if (progress >= 100) return null;
  return (
    <div className="loading glass" role="status">
      <Activity size={18} />
      <div>
        <strong>Preparing the anatomy</strong>
        <span>
          {progress}% · Loading {partCount?.toLocaleString() ?? '2,234'} pieces
        </span>
        <div className="loading-track">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
