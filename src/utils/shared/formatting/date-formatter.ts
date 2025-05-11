/**
 * Date Formatting Utilities
 * 
 * This module provides date formatting functions that are used in both
 * Vue 3 SFC and Vanilla JS implementations.
 */

/**
 * Supported date format options
 */
export type DateFormatOptions = {
  timeZone?: string;
  includeTime?: boolean;
  locale?: string;
};

/**
 * Formats a date using the specified format
 * @param {Date|string|number} date - The date to format
 * @param {string} format - The format to use
 * @param {DateFormatOptions} options - Formatting options
 * @returns {string} The formatted date
 */
export function formatDate(
  date: Date | string | number, 
  format: string = 'yyyy-MM-dd',
  options: DateFormatOptions = {}
): string {
  const {
    timeZone = 'UTC',
    includeTime = false,
    locale = 'de-DE'
  } = options;
  
  // Convert to Date object if necessary
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date)
    : date;
  
  // Basic formatting using Intl.DateTimeFormat
  const dateTimeFormat = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: includeTime ? '2-digit' : undefined,
    minute: includeTime ? '2-digit' : undefined,
    second: includeTime ? '2-digit' : undefined,
    timeZone
  });
  
  const formattedDate = dateTimeFormat.format(dateObj);
  
  // Handle custom format
  if (format === 'iso') {
    return dateObj.toISOString();
  }
  
  if (format === 'localized') {
    return formattedDate;
  }
  
  // Basic custom format parsing
  let result = format;
  
  // Extract date parts
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const seconds = dateObj.getSeconds();
  
  // Replace format tokens
  result = result.replace(/yyyy/g, year.toString());
  result = result.replace(/MM/g, month.toString().padStart(2, '0'));
  result = result.replace(/dd/g, day.toString().padStart(2, '0'));
  
  if (includeTime) {
    result = result.replace(/HH/g, hours.toString().padStart(2, '0'));
    result = result.replace(/mm/g, minutes.toString().padStart(2, '0'));
    result = result.replace(/ss/g, seconds.toString().padStart(2, '0'));
  }
  
  return result;
}

/**
 * Formats a relative time (e.g., "2 hours ago")
 * @param {Date|string|number} date - The date to format
 * @param {string} locale - The locale to use
 * @returns {string} The formatted relative time
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string = 'de-DE'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date)
    : date;
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  
  // Convert to seconds
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return 'Gerade eben';
  }
  
  // Convert to minutes
  const diffMin = Math.floor(diffSec / 60);
  
  if (diffMin < 60) {
    return `Vor ${diffMin} Minute${diffMin === 1 ? '' : 'n'}`;
  }
  
  // Convert to hours
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffHour < 24) {
    return `Vor ${diffHour} Stunde${diffHour === 1 ? '' : 'n'}`;
  }
  
  // Convert to days
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay < 7) {
    return `Vor ${diffDay} Tag${diffDay === 1 ? '' : 'en'}`;
  }
  
  // Format the date for older dates
  return formatDate(dateObj, 'localized', { locale });
}

/**
 * Bundle all formatting functions into a single object for backwards compatibility
 */
export const DateFormatter = {
  formatDate,
  formatRelativeTime
};

export default DateFormatter;
