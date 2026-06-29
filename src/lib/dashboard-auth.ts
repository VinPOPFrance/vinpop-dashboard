const encoder = new TextEncoder();

export const AUTH_COOKIE_NAME = 'dashboard_auth';
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

async function sha256Hex(input: string): Promise<string> {
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function getExpectedAuthToken(): Promise<string | null> {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    return null;
  }

  return sha256Hex(password);
}

export async function isValidPassword(password: string): Promise<boolean> {
  const expectedToken = await getExpectedAuthToken();
  if (!expectedToken) {
    return false;
  }

  const receivedToken = await sha256Hex(password);
  return receivedToken === expectedToken;
}
