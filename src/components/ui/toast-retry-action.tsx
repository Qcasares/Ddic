import { ToastAction } from './toast';

interface ToastRetryActionProps {
  onRetry: () => void;
}

export function ToastRetryAction({ onRetry }: ToastRetryActionProps) {
  return (
    <ToastAction 
      altText="Retry the failed operation"
      onClick={onRetry}
    >
      Retry
    </ToastAction>
  );
}