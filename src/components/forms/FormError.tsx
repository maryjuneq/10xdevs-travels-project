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
      className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md"
    >
      <AlertCircle className="size-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
