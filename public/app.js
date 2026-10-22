import { api, element, money, renderTotals } from "./shared.js";

const $ = (selector) => document.querySelector(selector);
let category = "";
let catalogRequest = 0;
let noticeTimer;

function notify(message) {
  $("#notification").textContent = message;
  $("#notification").classList.add("visible");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $("#notification").classList.remove("visible"), 5000);
}

async function action(button, operation) {
  button.disabled = true;
  try {
    await operation();
  } catch (error) {
    notify(error.message);
  } finally {
    button.disabled = false;
  }
}

async function loadProducts() {
  const request = ++catalogRequest;
  $("#catalog-status").textContent = "Finding your everyday favorites...";
  try {
    const query = new URLSearchParams({ category, search: $("#search").value.trim() });
    const { products } = await api(`/api/products?${query}`);
    if (request !== catalogRequest) return;
    $("#product-count").textContent = `${products.length} considered essentials`;
    $("#catalog-status").textContent = products.length ? "" : "No products found. Try another category or search.";
    $("#products").replaceChildren(...products.map((product) => {
      const card = element("article", "product-card");
      const visual = element("div", `product-visual ${product.art}`);
      visual.setAttribute("aria-hidden", "true");
      visual.append(element("span", "product-badge", product.badge), element("div", "object"), element("span", "visual-caption", "EVERYDAY / ESSENTIALS"));
      const info = element("div", "product-info");
      info.append(element("p", "eyebrow", product.category), element("h3", "", product.name), element("p", "product-description", product.description));
      const bottom = element("div", "product-bottom");
      const add = element("button", "add-button", "+ Add");
      add.setAttribute("aria-label", `Add ${product.name} to cart`);
      add.disabled = product.stock === 0;
      if (!product.stock) add.textContent = "Sold out";
      add.addEventListener("click", () => action(add, async () => {
        renderCart(await api("/api/cart/items", { method: "POST", body: JSON.stringify({ productId: product.id, quantity: 1 }) }));
        notify(`${product.name} added to your bag.`);
      }));
      bottom.append(element("strong", "", money(product.priceCents)), add);
      info.append(bottom);
      card.append(visual, info);
      return card;
    }));
  } catch (error) {
    if (request === catalogRequest) {
      $("#catalog-status").textContent = `Could not load products: ${error.message} Refresh to retry.`;
    }
  }
}

function renderCart(cart) {
  $("#cart-count").textContent = cart.itemCount;
  $("#checkout").setAttribute("aria-disabled", String(!cart.items.length));
  $("#cart-items").replaceChildren(...cart.items.map((item) => {
    const row = element("div", "cart-item");
    const detail = element("div", "cart-detail");
    detail.append(element("h3", "", item.name), element("span", "muted", money(item.priceCents)));
    const controls = element("div", "quantity-controls");
    for (const [label, quantity, text] of [["Decrease", item.quantity - 1, "-"], ["Increase", item.quantity + 1, "+"]]) {
      const button = element("button", "", text);
      button.setAttribute("aria-label", `${label} ${item.name} quantity`);
      button.addEventListener("click", () => action(button, async () => {
        const options = quantity ? { method: "PATCH", body: JSON.stringify({ quantity }) } : { method: "DELETE" };
        renderCart(await api(`/api/cart/items/${item.id}`, options));
      }));
      controls.append(button);
      if (label === "Decrease") controls.append(element("span", "", String(item.quantity)));
    }
    const remove = element("button", "remove-button", "Remove");
    remove.setAttribute("aria-label", `Remove ${item.name}`);
    remove.addEventListener("click", () => action(remove, async () => renderCart(await api(`/api/cart/items/${item.id}`, { method: "DELETE" }))));
    detail.append(controls, remove);
    row.append(detail, element("strong", "", money(item.priceCents * item.quantity)));
    return row;
  }));
  if (!cart.items.length) {
    const empty = element("div", "empty-bag");
    empty.append(element("span", "empty-icon", "+"), element("h3", "", "Room for something good."), element("p", "", "Your next everyday favorite is just a click away."));
    $("#cart-items").append(empty);
  }
  renderTotals($("#cart-totals"), cart.totals);
}

$("#checkout").addEventListener("click", (event) => {
  if ($("#checkout").getAttribute("aria-disabled") === "true") {
    event.preventDefault();
    notify("Add an item before checkout.");
  }
});
let searchTimer;
$("#search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadProducts, 180);
});

async function start() {
  const [{ categories }, cart] = await Promise.all([api("/api/categories"), api("/api/cart")]);
  renderCart(cart);
  for (const item of [{ id: "", name: "All finds" }, ...categories]) {
    const button = element("button", "category", item.name);
    button.setAttribute("aria-pressed", String(item.id === category));
    button.addEventListener("click", () => {
      category = item.id;
      for (const sibling of $("#categories").children) sibling.setAttribute("aria-pressed", String(sibling === button));
      loadProducts();
    });
    $("#categories").append(button);
  }
  await loadProducts();
}

start().catch((error) => {
  $("#catalog-status").textContent = `Store unavailable: ${error.message} Refresh to retry.`;
  notify(error.message);
});
