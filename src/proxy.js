import { NextResponse } from 'next/server';

export function proxy(request) {
  // Standard middleware logic - can be expanded for Auth later
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip all internal paths (_next) and static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
