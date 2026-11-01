import { NextResponse } from 'next/server';

// An error whose message is written for users and safe to send to the browser.
export class UserFacingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// Turns any error into a JSON response. Only UserFacingError messages reach the
// browser; anything else is logged on the server and replaced with the fallback,
// so internal details (file paths, Prisma output) never leak to users.
export function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof UserFacingError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  globalThis.console?.error(error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
