import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

// eslint-disable-next-line
export async function auth_middleware(request: NextRequest) {
  return await updateSession(request);
}
// TODO: Move to an ENV variable
// eslint-disable-next-line
const secretKey = 'secret';
const key = new TextEncoder().encode(secretKey);

export async function login(formData: FormData) {
  // Verify credentials && get the user
  const user = { email: formData.get('email'), name: 'John' };
  // Create the session
  const expires = new Date(Date.now() + 10 * 1000);
  const session = await encrypt({ user, expires });
  // Save the session in a cookie
  (
    await // Save the session in a cookie
    cookies()
  ).set('session', session, { expires, httpOnly: true });
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload;
}
export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;
  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session);
  parsed.expires = new Date(Date.now() + 10 * 1000);
  const res = NextResponse.next();
  res.cookies.set({
    name: 'session',
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
  });
  return res;
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10 sec from now')
    .sign(key);
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function logout() {
  // Destroy the session
  (
    await // Destroy the session
    cookies()
  ).set('session', '', { expires: new Date(0) });
}
