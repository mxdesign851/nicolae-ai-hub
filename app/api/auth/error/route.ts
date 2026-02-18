import { NextResponse } from 'next/server';
import { resolvePublicAppUrl } from '@/lib/public-url';

function toSignInRedirect(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const callbackUrl = url.searchParams.get('callbackUrl');

  const baseUrl = resolvePublicAppUrl(request) ?? url;
  const destination = new URL('/sign-in', baseUrl);
  if (error) destination.searchParams.set('error', error);
  if (callbackUrl) destination.searchParams.set('callbackUrl', callbackUrl);

  return NextResponse.redirect(destination, { status: 307 });
}

export async function GET(request: Request) {
  return toSignInRedirect(request);
}

export async function POST(request: Request) {
  return toSignInRedirect(request);
}
