import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { createStore } from "../src/store.js";
import { createApp } from "../src/server.js";
import { calculateOrder } from "../src/pricing.js";

test("CART-001 repeated Add accumulates quantities", (t) => {
  const store = createStore();
  t.after(() => store.close());
  const cart = store.ensureCart();
  store.add(cart, "coffee", 1);
  const result = store.add(cart, "coffee", 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.itemCount, 2);
  assert.equal(result.totals.subtotalCents, 20000);
});

test("CAT-001 category filters return only matching products, including search", (t) => {
  const store = createStore();
  t.after(() => store.close());
  for (const category of ["electronics", "appliances", "mobiles"]) {
    const result = store.products(category);
    assert.equal(result.length, 3, category);
    assert.ok(result.every((product) => product.category === category));
  }
  assert.equal(store.products("mobiles", "Nova").length, 1);
  assert.equal(store.products("appliances", "Nova").length, 0);
  assert.equal(store.products().length, 9);
});

test("CHECKOUT-001 the actual checkout link reaches a payment page", async (t) => {
  const store = createStore();
  const server = createApp({ store });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const html = await (await fetch(base)).text();
  const href = html.match(/<a[^>]*id="checkout"[^>]*href="([^"]+)"/)?.[1];
  assert.ok(href, "The storefront must expose a checkout link.");
  const target = await fetch(new URL(href, base));
  assert.equal(target.status, 200, `Checkout destination ${href} must exist.`);
  assert.match(await target.text(), /id="pay"/);
});

test("THEME-001 theme control is available; browser persistence remains a required manual check", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const button = html.match(/<button[^>]*id="theme-toggle"[^>]*>/)?.[0];
  assert.ok(button, "A theme toggle is required.");
  assert.doesNotMatch(button, /\bdisabled\b/, "Theme switching must be enabled.");
});

test("PRICE-001 percentage discount never reduces paid shipping", () => {
  const result = calculateOrder({ subtotalCents: 10000, shippingCents: 1000, discountPercent: 10 });
  assert.equal(result.discountCents, 1000);
  assert.equal(result.totalCents, 10000);
});
