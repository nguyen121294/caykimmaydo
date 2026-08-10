const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value: string) => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export interface SyncDateRange {
  startDate: string;
  endDate: string;
}

export function createSyncPeriod(startDate: unknown, endDate: unknown): string {
  if (typeof startDate !== 'string' || typeof endDate !== 'string'
    || !isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error('Ngày bắt đầu hoặc ngày kết thúc không hợp lệ.');
  }
  if (startDate > endDate) throw new Error('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
  return `${startDate}:${endDate}`;
}

export function parseSyncPeriod(value: unknown): SyncDateRange | null {
  if (value === 'all') return null;
  if (typeof value === 'string' && value.includes(':')) {
    const [startDate, endDate] = value.split(':');
    if (isValidDate(startDate) && isValidDate(endDate) && startDate <= endDate) {
      return { startDate, endDate };
    }
  }

  const days = value === '7' || value === '30' || value === '90' ? Number(value) : 30;
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export function getSyncDateBounds(value: unknown) {
  const range = parseSyncPeriod(value);
  if (!range) return { start: null, endExclusive: null };
  const start = new Date(`${range.startDate}T00:00:00.000Z`);
  const endExclusive = new Date(`${range.endDate}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { start, endExclusive };
}

export function getMetaDateFilter(value: unknown): string {
  const range = parseSyncPeriod(value);
  if (!range) return 'date_preset=maximum';
  return `time_range=${encodeURIComponent(JSON.stringify({ since: range.startDate, until: range.endDate }))}`;
}
