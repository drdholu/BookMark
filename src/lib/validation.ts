import { z } from "zod";

// Common validation schemas
export const emailSchema = z.string().email("Invalid email format");
export const passwordSchema = z.string()
  .min(6, "Password must be at least 6 characters")
  .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Password must contain both letters and numbers");

export const bookTitleSchema = z.string()
  .min(1, "Title is required")
  .max(200, "Title must be less than 200 characters")
  .transform((val) => val.trim());

export const authorSchema = z.string()
  .max(100, "Author name must be less than 100 characters")
  .transform((val) => val ? val.trim() : null)
  .nullable();

export const fileSchema = z.object({
  name: z.string().min(1, "File name is required"),
  size: z.number().max(50 * 1024 * 1024, "File size must be less than 50MB"), // 50MB limit
  type: z.string().refine(
    (type) => ["application/pdf", "application/epub+zip"].includes(type),
    "Only PDF and EPUB files are allowed"
  ),
});

// Form validation schemas
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const bookUploadSchema = z.object({
  title: bookTitleSchema,
  author: authorSchema,
  file: fileSchema,
});

// API validation schemas
export const pdfProxySchema = z.object({
  url: z.string().url("Invalid URL format"),
});

// Sanitization utilities
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = identifier;
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}