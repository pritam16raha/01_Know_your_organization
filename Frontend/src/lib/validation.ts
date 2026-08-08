import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const accountIdSchema = z.uuid();

export const createNoteSchema = z.object({
  body: z.string().trim().min(1, "Enter a note before submitting.").max(2000),
  idempotencyKey: z.uuid(),
});

