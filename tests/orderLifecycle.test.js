import { expect, test } from "vitest";
import {
  deductPurchased,
  expireOrders,
  PAYMENT_TTL,
} from "../src/utils/orderLifecycle";

test("purchase subtracts only purchased variants and removes zero quantities", () => {
  const cart = [
    { key: "a", quantity: 5 },
    { key: "b", quantity: 2 },
    { key: "c", quantity: 1 },
  ];
  expect(
    deductPurchased(cart, [
      { key: "a", quantity: 2 },
      { key: "b", quantity: 2 },
    ]),
  ).toEqual([
    { key: "a", quantity: 3 },
    { key: "c", quantity: 1 },
  ]);
  expect(cart[0].quantity).toBe(5);
});

test("unpaid online orders expire at 15 minutes, including after reopening", () => {
  const start = Date.parse("2026-10-12T00:00:00Z");
  const order = {
    payment: "qr",
    due: 100,
    paid: 0,
    status: "Chờ xác nhận",
    paymentExpiresAt: new Date(start + PAYMENT_TTL).toISOString(),
  };
  const orders = [order];
  expect(expireOrders(orders, start + PAYMENT_TTL - 1)).toBe(orders);
  expect(expireOrders(orders, start + PAYMENT_TTL)[0].status).toBe("Đã hủy");
  expect(expireOrders(orders, start + PAYMENT_TTL * 5)[0].status).toBe(
    "Đã hủy",
  );
  expect(
    expireOrders([{ ...order, payment: "card" }], start + PAYMENT_TTL)[0]
      .status,
  ).toBe("Đã hủy");
});

test("paid deposits, cash and already cancelled orders do not expire again", () => {
  const orders = [
    {
      payment: "qr",
      due: 50,
      total: 100,
      paid: 50,
      paymentExpiresAt: "2020-01-01",
      status: "Chờ xác nhận",
    },
    {
      payment: "cash",
      due: 100,
      paid: 0,
      paymentExpiresAt: "2020-01-01",
      status: "Chờ xác nhận",
    },
    {
      payment: "qr",
      due: 100,
      paid: 0,
      paymentExpiresAt: "2020-01-01",
      status: "Đã hủy",
    },
  ];
  expect(expireOrders(orders)).toBe(orders);
});
