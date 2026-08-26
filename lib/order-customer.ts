import { normalizeVietnamesePhone } from './customer-phone';

export const MISSING_ORDER_PHONE = '1111111111';

export interface OrderPhonePlan {
  phone: string;
  normalizedPhone: string | null;
  needsCustomerPhone: boolean;
  shouldLinkCustomer: boolean;
}

export function getOrderPhonePlan(value: unknown): OrderPhonePlan {
  const rawDigits = String(value ?? '').replace(/\D/g, '');
  if (!rawDigits || rawDigits === MISSING_ORDER_PHONE) {
    return {
      phone: MISSING_ORDER_PHONE,
      normalizedPhone: null,
      needsCustomerPhone: true,
      shouldLinkCustomer: false,
    };
  }

  const normalizedPhone = normalizeVietnamesePhone(value);
  if (!normalizedPhone) {
    return {
      phone: MISSING_ORDER_PHONE,
      normalizedPhone: null,
      needsCustomerPhone: true,
      shouldLinkCustomer: false,
    };
  }

  return {
    phone: normalizedPhone,
    normalizedPhone,
    needsCustomerPhone: false,
    shouldLinkCustomer: true,
  };
}
