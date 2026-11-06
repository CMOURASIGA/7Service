export function internalAccessHttpStatus(input: {
  authenticated: boolean;
  authorized: boolean;
}): 200 | 401 | 403 {
  if (!input.authenticated) return 401;
  return input.authorized ? 200 : 403;
}
