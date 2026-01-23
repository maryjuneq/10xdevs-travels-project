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
      className="flex items-start gap-2 p-3 text-sm text-primary bg-primary/10 border border-primary/30 rounded-md"
    >
      <CheckCircle className="size-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
