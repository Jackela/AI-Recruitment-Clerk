export const testUsers = new Map<string, {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}>();

export function makeToken(email: string) {
  return 'test-token-' + Buffer.from(email).toString('base64');
}

export function decodeEmailFromToken(authHeader?: string): string | null {
  const token = authHeader?.split(' ')[1] || '';
  if (!token.startsWith('test-token-')) return null;
  try {
    return Buffer.from(token.replace('test-token-', ''), 'base64').toString();
  } catch {
    return null;
  }
}

