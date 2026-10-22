import { api, element, money, renderTotals } from "./shared.js";

const status = document.querySelector("#payment-status");
const button = document.querySelector("#pay");
let order;

function render(next) {
  order = next;
  document.querySelector("#order-items").replaceChildren(...order.items.map((item) => {
    const row = element("div", "cart-item");
    row.append(element("span", "", `${item.name} x ${item.quantity}`), element("strong", "", money(item.priceCents * item.quantity)));
    return row;
  }));
  renderTotals(document.querySelector("#order-totals"), order.totals);
  status.textContent = order.status === "paid" ? `Payment simulated successfully. Order ${order.id}. No charge was made.` : "Review your order. Payment is simulated.";
  button.disabled = order.status === "paid";
  button.textContent = order.status === "paid" ? "Order confirmed" : `Simulate payment - ${money(order.totals.totalCents)}`;
}

button.addEventListener("click", async () => {
  button.disabled = true;
  try {
    render(await api(`/api/orders/${order.id}/pay`, { method: "POST" }));
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});

async function start() {
  const id = new URLSearchParams(location.search).get("order");
  const next = id ? await api(`/api/orders/${encodeURIComponent(id)}`) : await api("/api/checkout", { method: "POST" });
  history.replaceState(null, "", `/payment?order=${encodeURIComponent(next.id)}`);
  render(next);
}

start().catch((error) => {
  status.textContent = `${error.message} Return to your bag to try again.`;
});
