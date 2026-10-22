import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../src/store.js";

function setup(t) {
  const store = createStore();
  t.after(() => store.close());
  return { store, cart: store.ensureCart() };
}

test("catalog seeds nine products and supports case-insensitive search", (t) => {
  const { store } = setup(t);
  assert.equal(store.products().length, 9);
  assert.equal(store.products("", "WIRELESS").length, 2);
  assert.equal(store.products("", "' OR 1=1 --").length, 0);
  assert.throws(() => store.products("unknown"), /Unknown category/);
  assert.throws(() => store.products("", "x".repeat(101)), /100 characters/);
});

test("empty and single-item carts, explicit quantity changes and removal work", (t) => {
  const { store, cart } = setup(t);
  assert.equal(store.cart(cart).totals.totalCents, 0);
  assert.equal(store.add(cart, "coffee", 1).itemCount, 1);
  assert.equal(store.update(cart, "coffee", 3).itemCount, 3);
  assert.equal(store.remove(cart, "coffee").itemCount, 0);
  assert.throws(() => store.update(cart, "coffee", 1), /Cart item not found/);
  assert.throws(() => store.remove(cart, "coffee"), /Cart item not found/);
});

test("carts are isolated and unknown cart identifiers are replaced", (t) => {
  const { store, cart } = setup(t);
  const other = store.ensureCart("untrusted");
  assert.notEqual(other, "untrusted");
  assert.equal(store.ensureCart(cart), cart);
  store.add(cart, "phone", 1);
  assert.equal(store.cart(other).itemCount, 0);
});

test("invalid quantity, unavailable stock and unknown products do not mutate a cart", (t) => {
  const { store, cart } = setup(t);
  for (const quantity of [0, -1, 1.5, 100, "2", null]) {
    assert.throws(() => store.add(cart, "coffee", quantity), /Quantity/);
    assert.throws(() => store.update(cart, "coffee", quantity), /Quantity/);
  }
  assert.throws(() => store.add(cart, "missing", 1), /Product not found/);
  assert.throws(() => store.add(cart, "coffee", 17), /available stock/);
  assert.equal(store.cart(cart).itemCount, 0);
  store.add(cart, "coffee", 16);
  assert.throws(() => store.add(cart, "coffee", 1), /available stock/);
  assert.throws(() => store.update(cart, "coffee", 17), /available stock/);
  assert.equal(store.cart(cart).itemCount, 16);
});

test("checkout snapshots, payment, ownership and idempotency", (t) => {
  const { store, cart } = setup(t);
  assert.throws(() => store.checkout(cart), /Add an item/);
  store.add(cart, "coffee", 1);
  const order = store.checkout(cart);
  assert.equal(order.status, "pending");
  assert.equal(store.checkout(cart).id, order.id);
  const other = store.ensureCart();
  assert.throws(() => store.order(other, order.id), /Order not found/);
  assert.throws(() => store.pay(other, order.id), /Order not found/);
  const paid = store.pay(cart, order.id);
  assert.equal(paid.status, "paid");
  assert.equal(store.cart(cart).itemCount, 0);
  assert.equal(store.products().find((product) => product.id === "coffee").stock, 15);
  assert.deepEqual(store.pay(cart, order.id), paid);
  assert.equal(store.products().find((product) => product.id === "coffee").stock, 15);
});

test("cart changes invalidate unpaid snapshots", (t) => {
  const { store, cart } = setup(t);
  store.add(cart, "coffee", 1);
  const order = store.checkout(cart);
  store.update(cart, "coffee", 2);
  assert.throws(() => store.pay(cart, order.id), /Cart changed/);
  assert.equal(store.order(cart, order.id).status, "pending");
  assert.notEqual(store.checkout(cart).id, order.id);
});

test("stock conflicts roll back every inventory update and leave the cart intact", (t) => {
  const { store, cart } = setup(t);
  const other = store.ensureCart();
  store.add(cart, "coffee", 1);
  store.add(cart, "vacuum", 9);
  const order = store.checkout(cart);
  store.add(other, "vacuum", 9);
  store.pay(other, store.checkout(other).id);
  assert.throws(() => store.pay(cart, order.id), /no longer has enough stock/);
  assert.equal(store.products().find((product) => product.id === "coffee").stock, 16);
  assert.equal(store.cart(cart).itemCount, 10);
  assert.equal(store.order(cart, order.id).status, "pending");
});

test("catalog, cart and orders survive reopening a file-backed database without reseeding stock", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "everyday-store-"));
  t.after(() => rmSync(directory, { recursive: true }));
  const filename = join(directory, "store.sqlite");
  let store = createStore(filename);
  const cart = store.ensureCart();
  store.add(cart, "coffee", 1);
  const order = store.checkout(cart);
  store.close();
  store = createStore(filename);
  assert.equal(store.cart(cart).itemCount, 1);
  store.pay(cart, order.id);
  store.close();
  store = createStore(filename);
  try {
    assert.equal(store.order(cart, order.id).status, "paid");
    assert.equal(store.products().length, 9);
    assert.equal(store.products().find((product) => product.id === "coffee").stock, 15);
  } finally {
    store.close();
  }
});
