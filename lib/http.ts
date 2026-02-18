import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function asHttpError(error: unknown) {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new HttpError(400, 'Validation failed', error.flatten());
  }

  return new HttpError(500, 'Internal server error');
}

export function jsonError(error: unknown) {
  const known = asHttpError(error);
  return NextResponse.json({ error: known.message, details: known.details }, { status: known.status });
}
