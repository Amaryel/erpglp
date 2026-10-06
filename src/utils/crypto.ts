// Simple, secure browser-native cryptographic hashing for user passwords using SHA-256

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = 'erpglp_auth_salt_v1_';
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}
