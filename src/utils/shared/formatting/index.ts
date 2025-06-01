/**
 * Shared Formatting Utilities
 *
 * Common formatting functions that can be used in both Vue 3 and Vanilla JS implementations.
 */

/**
 * Formats a date as a string using the browser's locale
 * @param date The date to format
 * @param locales The locale(s) to use, defaults to browser's locale
 * @param options Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions,
): string {
  const dateObject = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locales, options).format(dateObject);
}

/**
 * Formats a number as a currency string
 * @param value The number to format
 * @param currency The currency code (e.g., 'USD', 'EUR')
 * @param locale The locale to use, defaults to browser's locale
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency: string = "EUR",
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}

/**
 * Formats a number with thousands separators
 * @param value The number to format
 * @param locale The locale to use, defaults to browser's locale
 * @param options Formatting options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes The file size in bytes
 * @param decimals The number of decimal places to show
 * @returns Human-readable file size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
  );
}

/**
 * Truncates a string to a maximum length and adds an ellipsis if truncated
 * @param text The text to truncate
 * @param maxLength The maximum length before truncation
 * @param ellipsis The ellipsis to use
 * @returns Truncated text
 */
export function truncate(
  text: string,
  maxLength: number,
  ellipsis: string = "...",
): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}
