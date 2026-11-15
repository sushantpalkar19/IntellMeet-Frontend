/** The frontend env may contain either the Render origin or its /api base path. */
export function resolveApiBaseUrl(configuredUrl: string | undefined): string {
  const value = configuredUrl?.trim().replace(/\/+$/, '');
  if (!value) return 'http://localhost:3000/api';
  return /\/api$/i.test(value) ? value : `${value}/api`;
}
