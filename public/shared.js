export const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status}).`);
  return body;
}

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderTotals(container, totals) {
  container.replaceChildren();
  for (const [label, amount, className] of [
    ["Subtotal", totals.subtotalCents, ""],
    ["Everyday discount (10%)", -totals.discountCents, "savings"],
    ["Shipping", totals.shippingCents, ""],
    ["Tax (0% demo)", totals.taxCents, ""],
    ["Total", totals.totalCents, "total"],
  ]) {
    const row = element("div", `total-row ${className}`);
    row.append(element("span", "", label), element("strong", "", money(amount)));
    container.append(row);
  }
}
