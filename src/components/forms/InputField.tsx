import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InputFieldProps extends React.ComponentProps<typeof Input> {
  label: string;
  error?: string;
  helperText?: string;
}

export function InputField({ label, error, helperText, id: providedId, ...props }: InputFieldProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
}
