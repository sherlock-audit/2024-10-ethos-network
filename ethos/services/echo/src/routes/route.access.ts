export function shouldBlockRoute(
  method: string,
  path: unknown,
  blockedRoutes: Record<string, string>,
): boolean {
  if (isValidHttpMethod(method, blockedRoutes) && blockedRoutes[method]) {
    const route = blockedRoutes[method];

    if (typeof path === 'string') {
      return path.startsWith(route);
    }
  }

  return false;
}

function isValidHttpMethod<T extends Record<string, string>>(
  method: string,
  routes: T,
): method is string {
  return typeof method === 'string' && method in routes;
}
