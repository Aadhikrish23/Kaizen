import dotenv from 'dotenv';

// Imports are evaluated before server.ts calls dotenv.config(), so load here too.
dotenv.config();

const isDevLike = (): boolean => {
  const env = process.env.NODE_ENV;
  return !env || env === 'development' || env === 'test';
};

const DEV_FALLBACKS: Record<string, string> = {
  JWT_SECRET: 'dev_only_jwt_secret_not_for_production',
  JWT_REFRESH_SECRET: 'dev_only_refresh_secret_not_for_production',
};

const warned = new Set<string>();

const readSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string => {
  const value = process.env[name];
  if (value && value.trim().length >= 16) return value;
  if (!isDevLike()) {
    throw new Error(`${name} must be set (min 16 chars) when NODE_ENV is not development/test`);
  }
  if (!warned.has(name)) {
    warned.add(name);
    console.warn(`[Kaizen Config] ${name} not set; using insecure dev-only fallback`);
  }
  return DEV_FALLBACKS[name];
};

export const getJwtSecret = (): string => readSecret('JWT_SECRET');
export const getJwtRefreshSecret = (): string => readSecret('JWT_REFRESH_SECRET');

/** Fail fast at startup instead of on the first login request. */
export const assertSecretsConfigured = (): void => {
  getJwtSecret();
  getJwtRefreshSecret();
};
