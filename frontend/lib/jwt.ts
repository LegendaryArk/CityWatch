export function decodeJwtPayload(token: string): Record<string, string> | null {
  const base64Payload = token.split('.')[1];
  if (!base64Payload || typeof globalThis.atob !== 'function') return null;

  try {
    return JSON.parse(globalThis.atob(base64Payload));
  } catch {
    return null;
  }
}
