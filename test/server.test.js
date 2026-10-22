import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createApp } from "../src/server.js";
import { createStore } from "../src/store.js";

export async function startApp(t) {
  const store = createStore();
  const warnings = [];
  const server = createApp({ store, logger: { warn: (message) => warnings.push(message), error: (error) => { throw error; } } });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  return {
    base, warnings,
    async request(path, method = "GET", body) {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.headers.has("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
      return { status: response.status, body: await response.json(), headers: response.headers };
    },
  };
}

test("serves storefront, payment and local assets with security headers", async (t) => {
  const { base } = await startApp(t);
  for (const path of ["/", "/payment", "/styles.css", "/app.js", "/payment.js", "/shared.js", "/favicon.svg", "/favicon.ico"]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);
    assert.ok((await response.text()).length > 50);
  }
  assert.equal((await fetch(`${base}/not-a-page`)).status, 404);
  assert.equal((await fetch(`${base}/..%2fpackage.json`)).status, 404);
});

test("API supports browsing, persisted session cart, quantity update, checkout and simulated payment", async (t) => {
  const { request } = await startApp(t);
  assert.equal((await request("/api/health")).body.database, "sqlite");
  assert.equal((await request("/api/products")).body.products.length, 9);
  assert.equal((await request("/api/categories")).body.categories.length, 3);
  const initial = await request("/api/cart");
  assert.match(initial.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
  assert.equal(initial.body.itemCount, 0);
  assert.equal((await request("/api/cart/items", "POST", { productId: "coffee", quantity: 1 })).body.itemCount, 1);
  assert.equal((await request("/api/cart")).body.itemCount, 1);
  assert.equal((await request("/api/cart/items/coffee", "PATCH", { quantity: 2 })).body.itemCount, 2);
  const checkout = await request("/api/checkout", "POST");
  assert.equal(checkout.status, 201);
  assert.equal((await request(`/api/orders/${checkout.body.id}`)).body.status, "pending");
  assert.equal((await request(`/api/orders/${checkout.body.id}/pay`, "POST")).body.status, "paid");
  assert.equal((await request("/api/cart")).body.itemCount, 0);
});

test("API reports invalid JSON, content type, quantity, category, route, empty checkout and cross-origin writes", async (t) => {
  const { base, request, warnings } = await startApp(t);
  assert.equal((await request("/api/cart/items", "POST", { productId: "coffee", quantity: "1" })).status, 400);
  assert.equal((await request("/api/cart/items", "POST", { quantity: 1 })).status, 400);
  assert.equal((await request("/api/products?category=invalid")).status, 400);
  assert.equal((await request("/api/checkout", "POST")).status, 409);
  assert.equal((await request("/api/unknown")).status, 404);
  for (const body of ["{", "null", "[]"]) {
    assert.equal((await fetch(`${base}/api/cart/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body })).status, 400);
  }
  assert.equal((await fetch(`${base}/api/cart/items`, { method: "POST", body: "{}" })).status, 415);
  assert.equal((await fetch(`${base}/api/cart/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: "x".repeat(9000) }) })).status, 413);
  assert.equal((await fetch(`${base}/api/checkout`, { method: "POST", headers: { Origin: "http://unrelated.invalid" } })).status, 403);
  assert.equal((await fetch(`${base}/api/checkout`, { method: "POST", headers: { Origin: "null" } })).status, 403);
  assert.ok(warnings.length >= 12);
});

test("a different browser session cannot read or pay an order", async (t) => {
  const { base, request } = await startApp(t);
  await request("/api/cart/items", "POST", { productId: "coffee", quantity: 1 });
  const { body: order } = await request("/api/checkout", "POST");
  assert.equal((await fetch(`${base}/api/orders/${order.id}`)).status, 404);
  assert.equal((await fetch(`${base}/api/orders/${order.id}/pay`, { method: "POST" })).status, 404);
});
