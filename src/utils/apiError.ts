interface ApiErrorShape {
  response?: {
    data?: {
      message?: unknown;
    };
  };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as ApiErrorShape | null)?.response?.data?.message;
  return typeof message === 'string' && message.length > 0 ? message : fallback;
}
