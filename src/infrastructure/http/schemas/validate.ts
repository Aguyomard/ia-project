import type { Response } from 'express';
import { type ZodSchema, type ZodIssue, ZodError } from 'zod';

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
}

function formatZodError(error: ZodError): string {
  const messages = error.issues.map((e: ZodIssue) => {
    const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
    return `${path}${e.message}`;
  });
  return messages.join(', ');
}

export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
  res: Response
): ValidationResult<T> | ValidationError {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    res.status(400).json({ 
      error: formatZodError(result.error)
    });
    return { success: false };
  }
  
  return { success: true, data: result.data };
}

export function validateQuery<T>(
  schema: ZodSchema<T>,
  query: unknown,
  res: Response
): ValidationResult<T> | ValidationError {
  const result = schema.safeParse(query);
  
  if (!result.success) {
    res.status(400).json({ 
      error: formatZodError(result.error)
    });
    return { success: false };
  }
  
  return { success: true, data: result.data };
}

export function validateParams<T>(
  schema: ZodSchema<T>,
  params: unknown,
  res: Response
): ValidationResult<T> | ValidationError {
  const result = schema.safeParse(params);
  
  if (!result.success) {
    res.status(400).json({ 
      error: formatZodError(result.error)
    });
    return { success: false };
  }
  
  return { success: true, data: result.data };
}

