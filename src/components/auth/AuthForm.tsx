import { useState, useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { InputField, PasswordField, FormError, FormSuccess } from "@/components/forms";
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  type LoginFormData,
  type RegisterFormData,
  type PasswordResetRequestFormData,
  type PasswordResetConfirmFormData,
} from "@/lib/schemas/auth.schema";

type AuthMode = "login" | "register" | "reset" | "reset-confirm";

interface AuthFormProps {
  mode: AuthMode;
  resetToken?: string;
}

type FormData = LoginFormData | RegisterFormData | PasswordResetRequestFormData | PasswordResetConfirmFormData;

type FormFieldName = "email" | "password" | "confirmPassword";

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function AuthForm({ mode, resetToken }: AuthFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    ...(mode === "register" || mode === "reset-confirm" ? { confirmPassword: "" } : {}),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");

  const getSchema = useCallback(() => {
    switch (mode) {
      case "login":
        return loginSchema;
      case "register":
        return registerSchema;
      case "reset":
        return passwordResetRequestSchema;
      case "reset-confirm":
        return passwordResetConfirmSchema;
    }
  }, [mode]);

  const getTitle = useCallback(() => {
    switch (mode) {
      case "login":
        return "Sign in to your account";
      case "register":
        return "Create your account";
      case "reset":
        return "Reset your password";
      case "reset-confirm":
        return "Set new password";
    }
  }, [mode]);

  const getSubmitLabel = useCallback(() => {
    switch (mode) {
      case "login":
        return "Sign in";
      case "register":
        return "Create account";
      case "reset":
        return "Send reset link";
      case "reset-confirm":
        return "Reset password";
    }
  }, [mode]);

  const handleInputChange = useCallback((field: FormFieldName) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Clear form-level messages
    if (formError) setFormError("");
    if (formSuccess) setFormSuccess("");
  }, [errors, formError, formSuccess]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError("");
      setFormSuccess("");
      setErrors({});

      // Validate form data
      const schema = getSchema();
      const result = schema.safeParse(formData);

      if (!result.success) {
        // Extract field errors
        const fieldErrors: FormErrors = {};
        result.error.errors.forEach((error) => {
          const field = error.path[0] as keyof FormErrors;
          if (field) {
            fieldErrors[field] = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      // In a real implementation, this would call the API
      // For now, we just show a success message for reset requests
      startTransition(() => {
        if (mode === "reset") {
          // Simulate API call
          setTimeout(() => {
            setFormSuccess(
              "If an account exists with this email, you will receive a password reset link shortly."
            );
          }, 500);
        } else if (mode === "reset-confirm") {
          setFormSuccess("Your password has been reset successfully. You can now sign in.");
        } else {
          // Login/Register would redirect on success
          console.log("Form submitted:", result.data);
        }
      });
    },
    [formData, getSchema, mode]
  );

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{getTitle()}</h1>
        {mode === "reset" && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        )}
        {mode === "register" && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Join us to start planning your next adventure.
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <FormError message={formError} />
          <FormSuccess message={formSuccess} />

          {(mode === "login" || mode === "register" || mode === "reset") && (
            <InputField
              label="Email"
              type="email"
              name="email"
              autoComplete={mode === "register" ? "email" : "username"}
              required
              value={(formData as { email: string }).email}
              onChange={handleInputChange("email")}
              error={errors.email}
              disabled={isPending}
            />
          )}

          {(mode === "login" || mode === "register" || mode === "reset-confirm") && (
            <PasswordField
              label={mode === "reset-confirm" ? "New Password" : "Password"}
              name="password"
              autoComplete={mode === "register" || mode === "reset-confirm" ? "new-password" : "current-password"}
              required
              value={(formData as { password: string }).password}
              onChange={handleInputChange("password")}
              error={errors.password}
              disabled={isPending}
              helperText={
                mode === "register" || mode === "reset-confirm"
                  ? "At least 8 characters with a number and letter"
                  : undefined
              }
            />
          )}

          {(mode === "register" || mode === "reset-confirm") && (
            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={(formData as { confirmPassword: string }).confirmPassword}
              onChange={handleInputChange("confirmPassword")}
              error={errors.confirmPassword}
              disabled={isPending}
            />
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Processing..." : getSubmitLabel()}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          {mode === "login" && (
            <>
              <div className="text-center">
                <a
                  href="/password-reset"
                  className="text-sm font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <a href="/register" className="font-medium text-primary hover:text-primary/90 transition-colors">
                  Sign up
                </a>
              </div>
            </>
          )}

          {mode === "register" && (
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <a href="/login" className="font-medium text-primary hover:text-primary/90 transition-colors">
                Sign in
              </a>
            </div>
          )}

          {(mode === "reset" || mode === "reset-confirm") && (
            <div className="text-center">
              <a
                href="/login"
                className="text-sm font-medium text-primary hover:text-primary/90 transition-colors"
              >
                Back to sign in
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
