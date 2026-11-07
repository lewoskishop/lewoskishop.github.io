import { describe, it, expect, vi } from 'vitest';
import { formatPrice } from './format';

vi.mock('../config', () => ({
  STORE: {
    name: 'LewoskiShop',
    whatsappGreeting: '¡Hola {store}! Quiero hacer el siguiente pedido:',
    currency: 'ARS',
    locale: 'es-AR',
  },
  DISCOUNT_CODES: { LEWOSKI10: 0.1 },
}));

import { discountPercent, codeDiscountRate, computeTotals, buildOrderMessage } from './pricing';

describe('discountPercent', () => {
  it('calcula el porcentaje de descuento redondeado', () => {
    expect(discountPercent(75900, 99900)).toBe(24);
  });

  it('devuelve 0 sin precio de comparación', () => {
    expect(discountPercent(75900)).toBe(0);
  });

  it('devuelve 0 si el precio de comparación no es mayor', () => {
    expect(discountPercent(10000, 10000)).toBe(0);
    expect(discountPercent(10000, 9000)).toBe(0);
  });
});

describe('codeDiscountRate', () => {
  it('reconoce un código configurado', () => {
    expect(codeDiscountRate('LEWOSKI10')).toBeCloseTo(0.1, 5);
  });

  it('ignora mayúsculas y espacios', () => {
    expect(codeDiscountRate('  lewoski10 ')).toBeCloseTo(0.1, 5);
  });

  it('devuelve 0 para códigos desconocidos', () => {
    expect(codeDiscountRate('NADA')).toBe(0);
    expect(codeDiscountRate(null)).toBe(0);
    expect(codeDiscountRate(undefined)).toBe(0);
  });
});

describe('computeTotals', () => {
  const items = [
    { price: 10000, qty: 2 },
    { price: 5000, qty: 1 },
  ];

  it('calcula subtotal sin código', () => {
    const t = computeTotals(items);
    expect(t.subtotal).toBe(25000);
    expect(t.discount).toBe(0);
    expect(t.code).toBeNull();
    expect(t.total).toBe(25000);
  });

  it('aplica descuento con un código válido', () => {
    const t = computeTotals(items, 'LEWOSKI10');
    expect(t.subtotal).toBe(25000);
    expect(t.discount).toBe(2500);
    expect(t.total).toBe(22500);
    expect(t.code).toBe('LEWOSKI10');
  });

  it('carrito vacío da todo en cero', () => {
    const t = computeTotals([]);
    expect(t).toMatchObject({ subtotal: 0, discount: 0, total: 0 });
    expect(t.code).toBeNull();
  });
});

describe('buildOrderMessage', () => {
  const items = [{ name: 'Molde de silicona', price: 10000, qty: 2 }];

  it('incluye los items, cantidades y total', () => {
    const msg = buildOrderMessage(items, computeTotals(items, 'LEWOSKI10'));
    expect(msg).toContain('Molde de silicona x2');
    expect(msg).toContain('Subtotal:');
    expect(msg).toContain('Descuento');
    expect(msg).toContain('LEWOSKI10');
    expect(msg).toContain('Total:');
  });

  it('personaliza el saludo con el nombre de la tienda', () => {
    const msg = buildOrderMessage(items, computeTotals(items));
    expect(msg).toContain('LewoskiShop');
  });
});

describe('formatPrice', () => {
  it('formatea en pesos argentinos con separador de miles', () => {
    expect(formatPrice(90299).replace(/\u00a0/g, ' ')).toBe('$ 90.299');
  });
});
