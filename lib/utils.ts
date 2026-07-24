import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format money display - giữ nguyên đầy đủ số 0, không làm tròn, không rút gọn.
 * 1000000 → "1,000,000đ"
 * 2500000 → "2,500,000đ"
 */
export function formatMoney(value: any): string {
  if (value === null || value === undefined || value === '') return '0đ';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.\-]/g, ''));
  if (isNaN(num)) return '0đ';

  // Split integer and decimal parts
  const parts = num.toString().split('.');
  let intPart = parts[0];
  const isNeg = intPart.startsWith('-');
  if (isNeg) intPart = intPart.substring(1);

  // Add thousand separators
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let result = isNeg ? '-' + intPart : intPart;
  if (parts[1] !== undefined) {
    result += '.' + parts[1];
  }
  return result + 'đ';
}

/**
 * Format number with thousand separators (no currency suffix).
 */
export function formatNumber(value: any): string {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.\-]/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}