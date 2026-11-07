import { STORE, DISCOUNT_CODES } from '../config';

/** Ítem mínimo para calcular totales (compatible con CartItem). */
export interface PricedItem {
  name?: string;
  price: number;
  qty: number;
}

export interface Totals {
  subtotal: number;
  discount: number;
  code: string | null;
  total: number;
}

/** Porcentaje entero de descuento (-24) a partir del precio anterior. */
export function discountPercent(price: number, compareAtPrice?: number | null): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Tasa de descuento (0..1) de un código. 0 si no existe. */
export function codeDiscountRate(code?: string | null): number {
  if (!code) return 0;
  return DISCOUNT_CODES[code.trim().toUpperCase()] ?? 0;
}

/** Totales del carrito: subtotal, descuento y total. */
export function computeTotals(items: PricedItem[], code?: string | null): Totals {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const rate = codeDiscountRate(code);
  const discount = Math.round(subtotal * rate);
  return {
    subtotal,
    discount,
    code: rate > 0 ? (code ?? '').trim().toUpperCase() : null,
    total: subtotal - discount,
  };
}

/** Arma el mensaje de WhatsApp con el pedido completo. */
export function buildOrderMessage(items: PricedItem[], totals: Totals): string {
  const lines = items.map(
    (item, i) => `${i + 1}. ${item.name ?? 'Producto'} x${item.qty} — ${format(item.price * item.qty)}`,
  );
  const model = [
    STORE.whatsappGreeting.replace('{store}', STORE.name),
    '',
    ...lines,
    '',
    `Subtotal: ${format(totals.subtotal)}`,
    totals.code ? `Descuento (${totals.code}): -${format(totals.discount)}` : '',
    `Total: ${format(totals.total)}`,
  ];
  return model.filter((line) => line !== '').join('\n');
}

function format(value: number): string {
  return new Intl.NumberFormat(STORE.locale, {
    style: 'currency',
    currency: STORE.currency,
    maximumFractionDigits: 0,
  }).format(value);
}
