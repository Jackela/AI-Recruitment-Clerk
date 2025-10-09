export const testUsers = new Map<string, {
  userId: string;
  email: string;
  name?: string;
  role?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}>();

/**
 * Performs the make token operation.
 * @param email - The email.
 * @returns The result of the operation.
 */
export function makeToken(email: string) {
  return 'test-token-' + Buffer.from(email).toString('base64');
}

/**
 * Performs the decode email from token operation.
 * @param authHeader - The auth header.
 * @returns The string | null.
 */
export function decodeEmailFromToken(authHeader?: string): string | null {
  const token = authHeader?.split(' ')[1] || '';
  if (!token.startsWith('test-token-')) return null;
  try {
    return Buffer.from(token.replace('test-token-', ''), 'base64').toString();
  } catch {
    return null;
  }
}

