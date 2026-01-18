import { z } from "zod";

/**
 * Email validation schema
 * RFC-5322 compliant, max 254 characters
 */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email")
  .max(254, "Email must be less than 254 characters");

/**
 * Password validation schema
 * Minimum 8 characters, at least 1 number and 1 letter
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/(?=.*[0-9])(?=.*[a-zA-Z])/, "Password must contain at least one number and one letter");

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * Registration schema
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset confirmation schema
 */
export const passwordResetConfirmSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * Type exports for form data
 */
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetRequestFormData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmFormData = z.infer<typeof passwordResetConfirmSchema>;
