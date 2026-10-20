export function calculateOrder({
  subtotalCents,
  shippingCents = 0,
  discountPercent = 0,
  taxPercent = 0,
}) {
  for (const [name, value] of Object.entries({ subtotalCents, shippingCents })) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative safe integer.`);
    }
  }

  for (const [name, value] of Object.entries({ discountPercent, taxPercent })) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new RangeError(`${name} must be a number between 0 and 100.`);
    }
  }

  const discountCents = Math.round(
    ((subtotalCents + shippingCents) * discountPercent) / 100,
  );
  const discountedSubtotalCents = subtotalCents - discountCents;
  const taxCents = Math.round((discountedSubtotalCents * taxPercent) / 100);
  const totalCents = discountedSubtotalCents + shippingCents + taxCents;

  if (
    ![discountCents, discountedSubtotalCents, taxCents, totalCents].every(
      Number.isSafeInteger,
    )
  ) {
    throw new RangeError("Calculated amounts exceed the supported integer range.");
  }

  return {
    subtotalCents,
    shippingCents,
    discountCents,
    taxCents,
    totalCents,
  };
}
