import test from 'node:test';
import assert from 'node:assert/strict';
import { mapOrder } from '../src/shared/adapters/viewAdapters.js';
import { orderStatuses, orderStatusGroup, isAwaitingPayment, canAdminConfirm } from '../src/shared/constants/shop.js';

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
  const states = ['Chờ thanh toán', 'Chờ xác nhận', 'Đã xác nhận', 'Đã cọc', 'Đang chuẩn bị hàng', 'Đã đóng gói', 'Đang giao hàng', 'Giao thành công', 'Đã hoàn thành', 'Đã hủy', 'Hoàn hàng', 'Hoàn tiền'];
  const counts = orderStatuses.map(group => states.filter(state => orderStatusGroup(state) === group).length);
  assert.deepEqual(counts, [1, 1, 4, 1, 2, 1, 2]);
  assert.equal(counts.reduce((sum, count) => sum + count, 0), states.length);
  assert.equal(new Set(orderStatuses).size, 7);
  assert.equal(orderStatuses.includes('Chờ thanh toán'), true);
  const delivered = mapOrder({ status: 'delivered' });
  assert.equal(orderStatusGroup(delivered.status), 'Đã hoàn thành');
  assert.equal(delivered.statusCode, 'delivered');
});

test('payment and confirmation tabs are exclusive and follow payment requirements', () => {
  const base = { status: 'pending', payment_method: 'bank_transfer', delivery_method: 'standard', total_amount: '100000', paid_amount: '0', deposit_amount: '0', deposit_status: 'none', payment_status: 'unpaid' };
  const cases = [
    [{}, 'Chờ thanh toán'],
    [{ paid_amount: '50000' }, 'Chờ thanh toán'],
    [{ payment_method: 'cod' }, 'Chờ xác nhận'],
    [{ delivery_method: 'pickup' }, 'Chờ xác nhận'],
    [{ paid_amount: '100000', payment_status: 'paid' }, 'Chờ xác nhận'],
    [{ deposit_amount: '20000', paid_amount: '10000', deposit_status: 'unpaid' }, 'Chờ thanh toán'],
    [{ deposit_amount: '20000', paid_amount: '20000', deposit_status: 'paid' }, 'Chờ xác nhận'],
    [{ deposit_amount: '20000', paid_amount: '20000', deposit_status: 'unpaid' }, 'Chờ xác nhận'],
  ];
  for (const [changes, expected] of cases) {
    const order = mapOrder({ ...base, ...changes });
    assert.equal(order.status, expected);
    assert.equal(order.statusCode, 'pending');
    assert.equal(isAwaitingPayment(order), expected === 'Chờ thanh toán');
    assert.equal(canAdminConfirm(order), expected === 'Chờ xác nhận');
    assert.equal(orderStatuses.filter(tab => orderStatusGroup(order.status) === tab).length, 1);
  }
});

test('later lifecycle states and refunded orders never revert to awaiting payment', () => {
  for (const status of ['confirmed', 'processing', 'packed', 'shipping', 'delivered', 'completed', 'cancelled', 'returned', 'refunded']) {
    const order = mapOrder({ status, payment_method: 'bank_transfer', total_amount: 100000, paid_amount: 0 });
    assert.equal(isAwaitingPayment(order), false);
    assert.notEqual(order.status, 'Chờ thanh toán');
  }
  assert.equal(mapOrder({ status: 'pending', payment_status: 'refunded', total_amount: 100000 }).status, 'Hoàn tiền');
});
