import { MIN_PASSWORD_LENGTH } from "@/lib/constants";

const WEAK = new Set([
  "password",
  "password1",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "letmein",
  "welcome1",
]);

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (WEAK.has(password.toLowerCase())) {
    return "Choose a stronger password — avoid common passwords";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use letters and numbers in your password";
  }
  return null;
}
