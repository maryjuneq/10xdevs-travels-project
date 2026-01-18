import { AlertCircle } from "lucide-react";

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
    >
      <AlertCircle className="size-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
