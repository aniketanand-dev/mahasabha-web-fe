import { environment } from '../../environments/environment';

const API_BASE_URL = environment.apiBaseUrl;
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, '');
const ensureLeadingSlash = (value: string) => `/${trimLeadingSlash(value)}`;

const getApiOrigin = (): string => {
  if (!ABSOLUTE_URL_PATTERN.test(API_BASE_URL)) {
    return '';
  }

  return new URL(API_BASE_URL).origin;
};

export const buildApiUrl = (path: string): string => {
  const normalizedBase = trimTrailingSlash(API_BASE_URL);
  const normalizedPath = trimLeadingSlash(path);
  return `${normalizedBase}/${normalizedPath}`;
};

export const buildManagedAssetUrl = (path: string): string => {
  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  const normalizedPath = ensureLeadingSlash(path);
  const apiOrigin = getApiOrigin();

  return apiOrigin ? `${apiOrigin}${normalizedPath}` : normalizedPath;
};
