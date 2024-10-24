export function isAlchemyRateLimitError(err: unknown): err is AlchemyRateLimitError {
  if (typeof err !== 'object' || err === null) return false;

  const errorObj = err as { info?: { error?: { code?: number; message?: string } } };
  const errorInfo = errorObj.info?.error;

  return (
    errorInfo?.code === 429 &&
    typeof errorInfo.message === 'string' &&
    errorInfo.message.includes('exceeded its compute units per second capacity')
  );
}

type AlchemyRateLimitError = {
  info: {
    error: {
      code: 429;
      message: string;
    };
  };
};
