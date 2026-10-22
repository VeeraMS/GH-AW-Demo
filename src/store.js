import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { calculateOrder } from "./pricing.js";

export class StoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const products = [
  ["headphones", "Studio wireless headphones", "electronics", 12900, 18, "Sound, without distractions.", "audio", "Best seller"],
  ["speaker", "Pocket Bluetooth speaker", "electronics", 4900, 24, "Big sound. Small footprint.", "speaker", "Weekend essential"],
  ["camera", "Everyday instant camera", "electronics", 8900, 12, "Make your moments tangible.", "camera", "New arrival"],
  ["coffee", "Morning ritual coffee maker", "appliances", 10000, 16, "A better start to every day.", "coffee", "Staff pick"],
  ["kettle", "Precision electric kettle", "appliances", 5900, 20, "The perfect pour, every time.", "kettle", "Thoughtfully made"],
  ["vacuum", "Cordless home vacuum", "appliances", 17900, 9, "Less effort. More living.", "vacuum", "Home upgrade"],
  ["phone", "Nova 5G smartphone", "mobiles", 39900, 14, "Everything you need. Nothing extra.", "phone", "New arrival"],
  ["charger", "Magnetic wireless charger", "mobiles", 2900, 30, "Power up, without the tangle.", "charger", "Everyday carry"],
  ["case", "Everyday protective phone case", "mobiles", 1900, 32, "A little protection. A lot of personality.", "case", "Under $25"],
];

export const categories = [
  { id: "electronics", name: "Electronics" },
  { id: "appliances", name: "Appliances" },
  { id: "mobiles", name: "Mobiles" },
];

export function createStore(filename = ":memory:") {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
      priceCents INTEGER NOT NULL CHECK(priceCents > 0),
      stock INTEGER NOT NULL CHECK(stock >= 0),
      description TEXT NOT NULL, art TEXT NOT NULL, badge TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS cart_items (
      cart_id TEXT NOT NULL REFERENCES carts(id), product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
      PRIMARY KEY(cart_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, cart_id TEXT NOT NULL REFERENCES carts(id),
      cart_version INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending', 'paid')),
      snapshot TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const seed = db.prepare("INSERT OR IGNORE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  for (const product of products) seed.run(...product);

  function transaction(action) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = action();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function productById(id) {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    if (!product) throw new StoreError("Product not found.", 404);
    return product;
  }

  function quantityValue(value) {
    if (!Number.isInteger(value) || value < 1 || value > 99) {
      throw new StoreError("Quantity must be an integer between 1 and 99.");
    }
  }

  function cart(id) {
    const items = db.prepare(`
      SELECT p.*, ci.quantity FROM cart_items ci
      JOIN products p ON p.id = ci.product_id WHERE ci.cart_id = ? ORDER BY p.id
    `).all(id);
    const subtotalCents = items.reduce((total, item) => total + item.priceCents * item.quantity, 0);
    return {
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      totals: calculateOrder({
        subtotalCents,
        shippingCents: items.length ? 1000 : 0,
        discountPercent: items.length ? 10 : 0,
        taxPercent: 0,
      }),
    };
  }

  function orderForCart(cartId, orderId) {
    const row = db.prepare("SELECT * FROM orders WHERE id = ? AND cart_id = ?").get(orderId, cartId);
    if (!row) throw new StoreError("Order not found.", 404);
    return { id: row.id, status: row.status, createdAt: row.created_at, ...JSON.parse(row.snapshot) };
  }

  return {
    close: () => db.close(),
    ensureCart(id) {
      if (id && db.prepare("SELECT id FROM carts WHERE id = ?").get(id)) return id;
      const nextId = randomUUID();
      db.prepare("INSERT INTO carts(id) VALUES (?)").run(nextId);
      return nextId;
    },
    products(category = "", search = "") {
      if (category && !categories.some((item) => item.id === category)) {
        throw new StoreError("Unknown category.");
      }
      if (search.length > 100) throw new StoreError("Search is limited to 100 characters.");
      return db.prepare(`
        SELECT * FROM products
        WHERE (? = '' OR name = ?)
          AND instr(lower(name || ' ' || description), lower(?)) > 0
        ORDER BY id
      `).all(category, category, search);
    },
    cart,
    add(cartId, productId, quantity) {
      quantityValue(quantity);
      return transaction(() => {
        const product = productById(productId);
        const current = db.prepare("SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?").get(cartId, productId);
        const requested = (current?.quantity ?? 0) + quantity;
        if (requested > 99 || requested > product.stock) throw new StoreError("Requested quantity exceeds available stock.", 409);
        db.prepare(`
          INSERT INTO cart_items VALUES (?, ?, ?)
          ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = excluded.quantity
        `).run(cartId, productId, quantity);
        db.prepare("UPDATE carts SET version = version + 1 WHERE id = ?").run(cartId);
        return cart(cartId);
      });
    },
    update(cartId, productId, quantity) {
      quantityValue(quantity);
      return transaction(() => {
        const product = productById(productId);
        if (quantity > product.stock) throw new StoreError("Requested quantity exceeds available stock.", 409);
        const result = db.prepare("UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?").run(quantity, cartId, productId);
        if (!result.changes) throw new StoreError("Cart item not found.", 404);
        db.prepare("UPDATE carts SET version = version + 1 WHERE id = ?").run(cartId);
        return cart(cartId);
      });
    },
    remove(cartId, productId) {
      return transaction(() => {
        const result = db.prepare("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?").run(cartId, productId);
        if (!result.changes) throw new StoreError("Cart item not found.", 404);
        db.prepare("UPDATE carts SET version = version + 1 WHERE id = ?").run(cartId);
        return cart(cartId);
      });
    },
    checkout(cartId) {
      return transaction(() => {
        const snapshot = cart(cartId);
        if (!snapshot.items.length) throw new StoreError("Add an item before checkout.", 409);
        const { version } = db.prepare("SELECT version FROM carts WHERE id = ?").get(cartId);
        const existing = db.prepare("SELECT id FROM orders WHERE cart_id = ? AND cart_version = ? AND status = 'pending'").get(cartId, version);
        const id = existing?.id ?? randomUUID();
        if (!existing) {
          db.prepare("INSERT INTO orders(id, cart_id, cart_version, status, snapshot) VALUES (?, ?, ?, 'pending', ?)").run(id, cartId, version, JSON.stringify(snapshot));
        }
        return orderForCart(cartId, id);
      });
    },
    order: orderForCart,
    pay(cartId, orderId) {
      return transaction(() => {
        const order = orderForCart(cartId, orderId);
        if (order.status === "paid") return order;
        const { version } = db.prepare("SELECT version FROM carts WHERE id = ?").get(cartId);
        const row = db.prepare("SELECT cart_version FROM orders WHERE id = ?").get(orderId);
        if (row.cart_version !== version) throw new StoreError("Cart changed. Return to the cart and check out again.", 409);
        for (const item of order.items) {
          const result = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?").run(item.quantity, item.id, item.quantity);
          if (!result.changes) throw new StoreError(`${item.name} no longer has enough stock. Update your cart.`, 409);
        }
        db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(orderId);
        db.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(cartId);
        db.prepare("UPDATE carts SET version = version + 1 WHERE id = ?").run(cartId);
        return orderForCart(cartId, orderId);
      });
    },
  };
}
