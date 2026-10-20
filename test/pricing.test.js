import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrder } from "../src/pricing.js";

test("adds shipping when no discount or tax applies", () => {
  assert.deepEqual(
    calculateOrder({ subtotalCents: 10000, shippingCents: 1000 }),
    {
      subtotalCents: 10000,
      shippingCents: 1000,
      discountCents: 0,
      taxCents: 0,
      totalCents: 11000,
    },
  );
});

test("discounts merchandise when shipping is free", () => {
  const result = calculateOrder({
    subtotalCents: 10000,
    discountPercent: 10,
  });
  assert.equal(result.discountCents, 1000);
  assert.equal(result.totalCents, 9000);
});

test("calculates tax after discount when shipping is free", () => {
  const result = calculateOrder({
    subtotalCents: 10000,
    discountPercent: 10,
    taxPercent: 10,
  });
  assert.equal(result.taxCents, 900);
  assert.equal(result.totalCents, 9900);
});

test("does not tax shipping", () => {
  const result = calculateOrder({
    subtotalCents: 10000,
    shippingCents: 1000,
    taxPercent: 10,
  });
  assert.equal(result.taxCents, 1000);
  assert.equal(result.totalCents, 12000);
});

test("rounds discount and tax to whole cents", () => {
  const result = calculateOrder({
    subtotalCents: 999,
    discountPercent: 10,
    taxPercent: 5,
  });
  assert.equal(result.discountCents, 100);
  assert.equal(result.taxCents, 45);
  assert.equal(result.totalCents, 944);
});

test("supports an empty order", () => {
  assert.equal(calculateOrder({ subtotalCents: 0 }).totalCents, 0);
});

test("rejects invalid monetary amounts", () => {
  for (const value of [-1, 1.5, NaN, Infinity, "100", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => calculateOrder({ subtotalCents: value }),
      /subtotalCents must be a non-negative safe integer/,
    );
    assert.throws(
      () => calculateOrder({ subtotalCents: 100, shippingCents: value }),
      /shippingCents must be a non-negative safe integer/,
    );
  }
});

test("rejects invalid percentage rates", () => {
  for (const value of [-1, 101, NaN, Infinity, "10"]) {
    assert.throws(
      () => calculateOrder({ subtotalCents: 100, discountPercent: value }),
      /discountPercent must be a number between 0 and 100/,
    );
    assert.throws(
      () => calculateOrder({ subtotalCents: 100, taxPercent: value }),
      /taxPercent must be a number between 0 and 100/,
    );
  }
});

test("rejects calculated amounts outside the supported integer range", () => {
  assert.throws(
    () => calculateOrder({
      subtotalCents: Number.MAX_SAFE_INTEGER,
      shippingCents: 1,
    }),
    /Calculated amounts exceed the supported integer range/,
  );
});
