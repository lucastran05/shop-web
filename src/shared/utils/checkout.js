import { shopConfig } from "../constants/shop";
export function calculateCheckout(
  items,
  delivery,
  couponApplied,
  deposit,
  payment,
  commerce = shopConfig.commerce,
  couponDiscount = null,
) {
  const c = commerce;
  const subtotal = items.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const shipping =
    delivery === "pickup" || subtotal >= c.freeShippingFrom ? 0 : c.shippingFee;
  const off =
    couponDiscount !== null && couponDiscount !== undefined
      ? Math.max(
          0,
          Math.min(
            Math.round(Number(couponDiscount) || 0),
            subtotal + shipping,
          ),
        )
      : couponApplied
        ? Math.min(Math.round(subtotal * c.coupon.rate), c.coupon.maxDiscount)
        : 0;
  const total = subtotal + shipping - off;
  const due = deposit
    ? Math.round(total * c.depositRate)
    : payment === "cash"
      ? 0
      : total;
  return { subtotal, shipping, off, total, due };
}
