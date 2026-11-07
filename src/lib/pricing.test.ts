import { describe, it, expect } from 'vitest';
import { discountPercent, codeDiscountRate, computeTotals, shippingProgress, buildOrderMessage } from './pricing';
import { formatPrice } from './format';

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
  it('reconoce MASCOTITA10 como 10%', () => {
    expect(codeDiscountRate('MASCOTITA10')).toBeCloseTo(0.1, 5);
  });

  it('ignora mayúsculas y espacios', () => {
    expect(codeDiscountRate('  mascotita10 ')).toBeCloseTo(0.1, 5);
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

  it('aplica 10% con MASCOTITA10', () => {
    const t = computeTotals(items, 'MASCOTITA10');
    expect(t.subtotal).toBe(25000);
    expect(t.discount).toBe(2500);
    expect(t.total).toBe(22500);
    expect(t.code).toBe('MASCOTITA10');
  });

  it('devuelve reintegro del 5% del subtotal', () => {
    expect(computeTotals(items).reintegro).toBe(1250);
    expect(computeTotals(items, 'MASCOTITA10').reintegro).toBe(1250);
  });

  it('carrito vacío da todo en cero', () => {
    const t = computeTotals([]);
    expect(t).toMatchObject({ subtotal: 0, discount: 0, total: 0, reintegro: 0 });
  });
});

describe('shippingProgress', () => {
  it('a 0 calcula el total restante', () => {
    const p = shippingProgress(0);
    expect(p.freeShipping.remaining).toBe(30000);
    expect(p.freeShipping.reached).toBe(false);
    expect(p.installments.remaining).toBe(150000);
  });

  it('a mitad de camino da 50%', () => {
    expect(shippingProgress(15000).freeShipping.percent).toBeCloseTo(50, 5);
  });

  it('al alcanzar el envío gratis marca reached y remaining 0', () => {
    const p = shippingProgress(30000);
    expect(p.freeShipping.reached).toBe(true);
    expect(p.freeShipping.remaining).toBe(0);
    expect(p.freeShipping.percent).toBe(100);
    expect(p.installments.reached).toBe(false);
  });

  it('no supera el 100% por encima del objetivo', () => {
    const p = shippingProgress(400000);
    expect(p.freeShipping.percent).toBe(100);
    expect(p.installments.percent).toBe(100);
    expect(p.installments.reached).toBe(true);
  });
});

describe('buildOrderMessage', () => {
  const items = [{ id: 'a', name: 'Alimento Royal Canin 3kg', price: 10000, image: '', qty: 2 }];

  it('incluye los items, cantidades y total', () => {
    const msg = buildOrderMessage(items, computeTotals(items, 'MASCOTITA10'));
    expect(msg).toContain('Alimento Royal Canin 3kg x2');
    expect(msg).toContain('Subtotal:');
    expect(msg).toContain('Descuento');
    expect(msg).toContain('MASCOTITA10');
    expect(msg).toContain('Total:');
  });

  it('menciona el reintegro', () => {
    const msg = buildOrderMessage(items, computeTotals(items));
    expect(msg.toLowerCase()).toContain('reintegro');
  });
});

describe('formatPrice', () => {
  it('formatea en pesos argentinos con separador de miles', () => {
    expect(formatPrice(90299).replace(/\u00a0/g, ' ')).toBe('$ 90.299');
  });
});
