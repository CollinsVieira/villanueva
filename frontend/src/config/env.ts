const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const apiBaseUrl = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configured) {
    return '/api/v1';
  }
  return `${trimTrailingSlash(configured)}/api/v1`;
})();

export const publicOrigin = (() => {
  const configured = import.meta.env.VITE_IMAGE_IP?.trim();
  if (!configured) {
    return '';
  }
  return trimTrailingSlash(configured);
})();
