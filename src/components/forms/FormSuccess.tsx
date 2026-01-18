import { CheckCircle } from "lucide-react";

interface FormSuccessProps {
  message?: string;
}

export function FormSuccess({ message }: FormSuccessProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-2 p-3 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
    >
      <CheckCircle className="size-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
