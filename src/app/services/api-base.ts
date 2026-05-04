import { environment } from '../../environments/environment';

const API_BASE_URL = environment.apiBaseUrl;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, '');

export const buildApiUrl = (path: string): string => {
  const normalizedBase = trimTrailingSlash(API_BASE_URL);
  const normalizedPath = trimLeadingSlash(path);
  return `${normalizedBase}/${normalizedPath}`;
};

export const buildManagedAssetUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return buildApiUrl(path);
};
