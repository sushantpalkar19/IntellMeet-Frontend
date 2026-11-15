import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './apiBase';

describe('API base URL configuration', () => {
  it('adds the backend /api prefix when Vercel is configured with the Render origin', () => {
    expect(resolveApiBaseUrl('https://intellmeet-api.onrender.com')).toBe('https://intellmeet-api.onrender.com/api');
  });

  it('does not duplicate an existing /api prefix', () => {
    expect(resolveApiBaseUrl('https://intellmeet-api.onrender.com/api/')).toBe('https://intellmeet-api.onrender.com/api');
  });

  it('keeps local development pointed at the local API when no override is set', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:3000/api');
  });
});
