import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { createStore, categories, StoreError } from "./store.js";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const assets = new Map([
  ["/", ["index.html", "text/html"]],
  ["/payment", ["payment.html", "text/html"]],
  ["/styles.css", ["styles.css", "text/css"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/payment.js", ["payment.js", "text/javascript"]],
  ["/shared.js", ["shared.js", "text/javascript"]],
  ["/favicon.svg", ["favicon.svg", "image/svg+xml"]],
  ["/favicon.ico", ["favicon.svg", "image/svg+xml"]],
]);

async function jsonBody(request) {
  if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
    throw new StoreError("Content-Type must be application/json.", 415);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) throw new StoreError("Request body is too large.", 413);
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new StoreError("Request body must be a JSON object.");
    }
    return value;
  } catch (error) {
    if (error instanceof SyntaxError) throw new StoreError("Invalid JSON body.");
    throw error;
  }
}

export function createApp({ store = createStore(), logger = console } = {}) {
  return createServer(async (request, response) => {
    const send = (status, body, type = "application/json") => {
      response.writeHead(status, { "Content-Type": `${type}; charset=utf-8` });
      response.end(type === "application/json" ? JSON.stringify(body) : body);
    };
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url = new URL(request.url, "http://localhost");
      const { pathname } = url;
      const method = request.method;
      if (!["GET", "HEAD"].includes(method) && request.headers.origin) {
        if (!URL.canParse(request.headers.origin)) {
          throw new StoreError("Invalid request origin.", 403);
        }
        const origin = new URL(request.headers.origin);
        if (origin.host !== request.headers.host || origin.protocol !== "http:") {
          throw new StoreError("Cross-origin writes are not allowed.", 403);
        }
      }
      if (method === "GET" && pathname === "/api/health") return send(200, { status: "ok", database: "sqlite" });
      if (method === "GET" && pathname === "/api/categories") return send(200, { categories });
      if (method === "GET" && pathname === "/api/products") {
        return send(200, { products: store.products(url.searchParams.get("category") ?? "", url.searchParams.get("search") ?? "") });
      }
      if (pathname.startsWith("/api/")) {
        const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("cart="))?.slice(5);
        const cartId = store.ensureCart(cookie);
        response.setHeader("Set-Cookie", `cart=${cartId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
        if (pathname === "/api/cart" && method === "GET") return send(200, store.cart(cartId));
        if (pathname === "/api/cart/items" && method === "POST") {
          const body = await jsonBody(request);
          if (typeof body.productId !== "string") throw new StoreError("productId must be a string.");
          return send(200, store.add(cartId, body.productId, body.quantity));
        }
        const item = pathname.match(/^\/api\/cart\/items\/([a-z0-9-]+)$/);
        if (item && method === "PATCH") return send(200, store.update(cartId, item[1], (await jsonBody(request)).quantity));
        if (item && method === "DELETE") return send(200, store.remove(cartId, item[1]));
        if (pathname === "/api/checkout" && method === "POST") return send(201, store.checkout(cartId));
        const order = pathname.match(/^\/api\/orders\/([a-f0-9-]+)(\/pay)?$/);
        if (order && !order[2] && method === "GET") return send(200, store.order(cartId, order[1]));
        if (order && order[2] && method === "POST") return send(200, store.pay(cartId, order[1]));
        throw new StoreError("API route or method not found.", 404);
      }
      const asset = assets.get(pathname);
      if (asset && method === "GET") return send(200, await readFile(resolve(publicDirectory, asset[0])), asset[1]);
      return send(404, "Page not found. Return to the store at /.", "text/plain");
    } catch (error) {
      if (error instanceof StoreError) {
        logger.warn(`${request.method} ${request.url}: ${error.message}`);
        return send(error.status, { error: error.message });
      }
      logger.error(error);
      return send(500, { error: "Unexpected server error. See server logs." });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const filename = resolve(process.env.DATABASE_PATH ?? "data/store.sqlite");
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be an integer between 0 and 65535.");
  mkdirSync(dirname(filename), { recursive: true });
  const store = createStore(filename);
  const server = createApp({ store });
  server.on("error", (error) => {
    console.error(error);
    store.close();
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => console.log(`Everyday Market: http://127.0.0.1:${server.address().port}`));
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close(() => store.close()));
  }
}
