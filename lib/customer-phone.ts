export function normalizeVietnamesePhone(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;

  const localPhone = digits.startsWith('84')
    ? `0${digits.slice(2)}`
    : digits.length === 9
      ? `0${digits}`
      : digits;

  return /^0\d{9}$/.test(localPhone) ? localPhone : null;
}
