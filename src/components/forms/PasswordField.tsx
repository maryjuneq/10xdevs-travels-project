import { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PasswordFieldProps extends Omit<React.ComponentProps<typeof Input>, "type"> {
  label: string;
  error?: string;
  helperText?: string;
}

export function PasswordField({ label, error, helperText, id: providedId, ...props }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className="pr-10"
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
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
