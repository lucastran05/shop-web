import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDashboardData,
  orderBreakdown,
  orderPeriod,
} from "../src/features/management/utils/dashboard.js";

test("dashboard periods use Vietnam time and reject absent or invalid dates", () => {
  assert.deepEqual(orderPeriod("2025-12-31T18:00:00Z"), {
    year: 2026,
    month: 0,
  });
  for (const value of [null, undefined, "", "invalid"])
    assert.equal(orderPeriod(value), null);
});

test("monthly revenue and best sellers include completed orders only and preserve empty months", () => {
  const orders = [
    {
      createdAt: "2025-12-31T18:00:00Z",
      status: "Đã hoàn thành",
      total: 200000,
      items: [{ id: "a", name: "A", quantity: 2 }],
    },
    {
      createdAt: "2026-01-15T00:00:00Z",
      status: "Đã hoàn thành",
      total: 100000,
      items: [
        { id: "a", name: "A", quantity: "1" },
        { id: "b", name: "B", quantity: 1 },
      ],
    },
    {
      createdAt: "2026-02-15T00:00:00Z",
      status: "Chờ xác nhận",
      total: 500000,
      items: [{ id: "a", quantity: 10 }],
    },
    {
      createdAt: "2026-02-15T00:00:00Z",
      status: "Đã hủy",
      total: 100000,
      items: [{ id: "a", quantity: 8 }],
    },
    {
      createdAt: "2025-01-01T00:00:00Z",
      status: "Đã hoàn thành",
      total: 999999,
      items: [{ id: "a", quantity: 50 }],
    },
    { createdAt: "invalid", status: "Đã hoàn thành", total: 999999 },
  ];
  const data = buildDashboardData(orders, 2026);
  assert.equal(data.orders.length, 4);
  assert.equal(data.rows.length, 12);
  assert.equal(data.rows[0].revenue, 300000);
  assert.equal(data.rows[0].orders, 2);
  assert.equal(data.rows[1].revenue, 0);
  assert.equal(data.rows[1].orders, 2);
  assert.equal(data.rows[11].revenue, 0);
  assert.deepEqual(
    data.topProducts.map((p) => [p.id, p.quantity]),
    [
      ["a", 3],
      ["b", 1],
    ],
  );
  assert.equal(orders[0].items[0].quantity, 2);
});

test("top sellers are limited to five with no zero quantity entries", () => {
  const data = buildDashboardData(
    [
      {
        createdAt: "2026-10-01",
        status: "Đã hoàn thành",
        total: 0,
        items: Array.from({ length: 7 }, (_, index) => ({
          id: String(index),
          quantity: index,
        })),
      },
    ],
    2026,
  );
  assert.deepEqual(
    data.topProducts.map((p) => p.quantity),
    [6, 5, 4, 3, 2],
  );
  assert.deepEqual(buildDashboardData([], 2026).topProducts, []);
});

test("donut combines lifecycle states without losing orders and percentages total 100", () => {
  const statuses = orderBreakdown(
    [
      "Đã xác nhận",
      "Đã đóng gói",
      "Hoàn hàng",
      "Hoàn tiền",
      "Đã hoàn thành",
    ].map((status) => ({ status })),
  );
  assert.equal(
    statuses.find((s) => s.status === "Đang chuẩn bị hàng").count,
    2,
  );
  assert.equal(
    statuses.find((s) => s.status === "Hoàn hàng / Hoàn tiền").count,
    2,
  );
  assert.equal(
    statuses.reduce((sum, s) => sum + s.count, 0),
    5,
  );
  assert.equal(
    statuses.reduce((sum, s) => sum + s.percentage, 0),
    100,
  );
  assert.ok(statuses.every((s) => /^#[0-9a-f]{6}$/i.test(s.color)));
  assert.deepEqual(orderBreakdown([]), []);
});
