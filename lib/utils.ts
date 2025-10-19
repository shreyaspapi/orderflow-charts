import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format large numbers to human-readable format (k, M, B)
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.2k", "5.5M", "1.2B")
 */
export function formatVolume(num: number, decimals: number = 1): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 1_000_000_000) {
    return `${sign}${(absNum / 1_000_000_000).toFixed(decimals)}B`;
  } else if (absNum >= 1_000_000) {
    return `${sign}${(absNum / 1_000_000).toFixed(decimals)}M`;
  } else if (absNum >= 1_000) {
    return `${sign}${(absNum / 1_000).toFixed(decimals)}k`;
  }
  
  return `${sign}${absNum.toFixed(0)}`;
}
