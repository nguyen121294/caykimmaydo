import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeVietnamesePhone } from './customer-phone';

test('normalizes common Vietnamese mobile phone formats', () => {
  assert.equal(normalizeVietnamesePhone('0912 345 678'), '0912345678');
  assert.equal(normalizeVietnamesePhone('+84 912-345-678'), '0912345678');
  assert.equal(normalizeVietnamesePhone('912345678'), '0912345678');
});

test('rejects missing and malformed phone numbers', () => {
  assert.equal(normalizeVietnamesePhone(''), null);
  assert.equal(normalizeVietnamesePhone('12345'), null);
  assert.equal(normalizeVietnamesePhone('849123456789'), null);
});
