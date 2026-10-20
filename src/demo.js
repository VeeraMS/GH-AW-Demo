import { calculateOrder } from "./pricing.js";

const order = {
  subtotalCents: 10000,
  shippingCents: 1000,
  discountPercent: 10,
  taxPercent: 0,
};

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const format = (cents) => dollars.format(cents / 100);
const result = calculateOrder(order);

console.log("Shopping cart pricing demo");
console.log("--------------------------");
console.log(`Merchandise: ${format(result.subtotalCents)}`);
console.log(`Shipping:    ${format(result.shippingCents)}`);
console.log(`Discount:    ${order.discountPercent}% (${format(result.discountCents)})`);
console.log(`Tax:         ${format(result.taxCents)}`);
console.log(`Total:       ${format(result.totalCents)}`);
