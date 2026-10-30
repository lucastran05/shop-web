import test from 'node:test';
import assert from 'node:assert/strict';
import { mapOrder } from '../src/shared/adapters/viewAdapters.js';
import { orderStatuses, orderStatusGroup } from '../src/shared/constants/shop.js';

test('each order tab maps to its own lifecycle or payment state', () => {
  const base = { total_amount: 130000, paid_amount: 0, payment_status: 'unpaid', deposit_status: 'none' };
  assert.equal(mapOrder({ ...base, status: 'processing' }).status, 'Đang chuẩn bị hàng');
  assert.equal(mapOrder({ ...base, status: 'packed' }).status, 'Đã đóng gói');
  assert.equal(mapOrder({ ...base, status: 'returned' }).status, 'Hoàn hàng');
  assert.equal(mapOrder({ ...base, status: 'confirmed', deposit_status: 'paid', paid_amount: 65000 }).status, 'Đã cọc');
  assert.equal(mapOrder({ ...base, status: 'confirmed', deposit_status: 'paid', paid_amount: 130000, payment_status: 'paid' }).status, 'Đã xác nhận');
  assert.equal(mapOrder({ ...base, status: 'returned', paid_amount: 130000, payment_status: 'refunded' }).status, 'Hoàn tiền');
});

test('merged customer tabs contain every previous state without duplicates', () => {
  const states = ['Chờ xác nhận', 'Đã xác nhận', 'Đã cọc', 'Đang chuẩn bị hàng', 'Đã đóng gói', 'Đang giao hàng', 'Giao thành công', 'Đã hoàn thành', 'Đã hủy', 'Hoàn hàng', 'Hoàn tiền'];
  const counts = orderStatuses.map(group => states.filter(state => orderStatusGroup(state) === group).length);
  assert.deepEqual(counts, [1, 4, 1, 2, 1, 2]);
  assert.equal(counts.reduce((sum, count) => sum + count, 0), states.length);
  assert.equal(new Set(orderStatuses).size, 6);
  const delivered = mapOrder({ status: 'delivered' });
  assert.equal(orderStatusGroup(delivered.status), 'Đã hoàn thành');
  assert.equal(delivered.statusCode, 'delivered');
});
