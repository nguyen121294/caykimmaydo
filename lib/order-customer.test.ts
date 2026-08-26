import assert from 'node:assert/strict';
import test from 'node:test';

import { getOrderPhonePlan } from './order-customer';

test('placeholder phone stays on Order and never creates a CRM customer', () => {
  assert.deepEqual(getOrderPhonePlan('1111111111'), {
    phone: '1111111111',
    normalizedPhone: null,
    needsCustomerPhone: true,
    shouldLinkCustomer: false,
  });
});

test('blank or invalid phone is converted to the searchable placeholder', () => {
  assert.equal(getOrderPhonePlan('').phone, '1111111111');
  assert.equal(getOrderPhonePlan('123').phone, '1111111111');
  assert.equal(getOrderPhonePlan('123').shouldLinkCustomer, false);
});

test('valid phone is normalized and is eligible for CRM linking', () => {
  assert.deepEqual(getOrderPhonePlan('+84 912-345-678'), {
    phone: '0912345678',
    normalizedPhone: '0912345678',
    needsCustomerPhone: false,
    shouldLinkCustomer: true,
  });
});
