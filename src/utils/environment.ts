/**
 * Environment utilities for the AtPack application
 */

/**
 * Check if the application is running in development mode
 * @returns true if in development mode, false otherwise
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.MODE === 'development';
};

/**
 * Check if the application is running in production mode
 * @returns true if in production mode, false otherwise
 */
export const isProduction = (): boolean => {
  return import.meta.env.MODE === 'production';
};

/**
 * Get the current environment mode
 * @returns the current mode (development, production, etc.)
 */
export const getMode = (): string => {
  return import.meta.env.MODE;
};
