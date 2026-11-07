import { describe, it, expect } from 'vitest';
import {
  hasVariants,
  stockLabel,
  variantCartId,
  defaultVariantIndex,
  resolveVariant,
} from './variants';

const simple = {
  id: 'snack-simple',
  price: 4500,
  compareAtPrice: 6000,
  stock: 4,
  bonusKg: 0,
};

const conVariantes = {
  id: 'royal-canin-medium',
  price: 99990,
  inStock: true,
  bonusKg: 1,
  variants: [
    { label: '1kg', price: 12000, compareAtPrice: 15000, stock: 0 },
    { label: '3kg', price: 28000, compareAtPrice: 35000, stock: 3 },
    { label: '7,5kg', price: 62000, compareAtPrice: 75000, stock: 40, bonusKg: 2 },
  ],
};

describe('hasVariants', () => {
  it('detecta variantes presentes', () => {
    expect(hasVariants(conVariantes)).toBe(true);
    expect(hasVariants(simple)).toBe(false);
    expect(hasVariants({ id: 'x', price: 1, variants: [] })).toBe(false);
  });
});

describe('stockLabel', () => {
  it('sin stock', () => {
    expect(stockLabel(0)).toBe('Sin stock');
  });
  it('singular', () => {
    expect(stockLabel(1)).toBe('1 unidad');
  });
  it('pocas unidades', () => {
    expect(stockLabel(7)).toBe('7 unidades');
  });
  it('más de 10', () => {
    expect(stockLabel(11)).toBe('+10 unidades');
    expect(stockLabel(250)).toBe('+10 unidades');
  });
});

describe('variantCartId', () => {
  it('sin etiqueta devuelve el id del producto', () => {
    expect(variantCartId('prod', null)).toBe('prod');
  });
  it('con etiqueta genera un id distinto y estable', () => {
    const a = variantCartId('prod', '1kg');
    const b = variantCartId('prod', '3kg');
    expect(a).not.toBe(b);
    expect(a).toContain('prod');
    expect(variantCartId('prod', '1kg')).toBe(a);
  });
});

describe('defaultVariantIndex', () => {
  it('elige la primera variante con stock', () => {
    expect(defaultVariantIndex(conVariantes)).toBe(1);
  });
  it('cae en 0 si ninguna tiene stock', () => {
    expect(
      defaultVariantIndex({ id: 'x', price: 1, variants: [{ label: 'a', price: 1, stock: 0 }] }),
    ).toBe(0);
  });
  it('devuelve -1 sin variantes', () => {
    expect(defaultVariantIndex(simple)).toBe(-1);
  });
});

describe('resolveVariant (producto simple)', () => {
  const r = resolveVariant(simple);

  it('usa precio, stock y descuento propios', () => {
    expect(r.price).toBe(4500);
    expect(r.compareAtPrice).toBe(6000);
    expect(r.discount).toBe(25);
    expect(r.stock).toBe(4);
    expect(r.stockLabel).toBe('4 unidades');
    expect(r.inStock).toBe(true);
    expect(r.cartId).toBe('snack-simple');
    expect(r.label).toBeNull();
  });

  it('deriva stock 0 cuando inStock es false y no hay stock explícito', () => {
    const r2 = resolveVariant({ id: 'x', price: 100, inStock: false });
    expect(r2.stock).toBe(0);
    expect(r2.inStock).toBe(false);
    expect(r2.stockLabel).toBe('Sin stock');
  });
});

describe('resolveVariant (con variantes)', () => {
  it('resuelve por índice', () => {
    const r = resolveVariant(conVariantes, 2);
    expect(r.price).toBe(62000);
    expect(r.compareAtPrice).toBe(75000);
    expect(r.discount).toBe(17);
    expect(r.stock).toBe(40);
    expect(r.stockLabel).toBe('+10 unidades');
    expect(r.bonusKg).toBe(2);
    expect(r.label).toBe('7,5kg');
    expect(r.cartId).toContain('royal-canin-medium');
  });

  it('sin índice usa la primera variante con stock', () => {
    const r = resolveVariant(conVariantes);
    expect(r.label).toBe('3kg');
  });

  it('índice fuera de rango cae en la primera con stock', () => {
    expect(resolveVariant(conVariantes, 99).label).toBe('3kg');
  });

  it('la variante sin bonusKg hereda el bonusKg del producto', () => {
    expect(resolveVariant(conVariantes, 1).bonusKg).toBe(1);
  });

  it('marca sin stock pero mantiene precio', () => {
    const r = resolveVariant(conVariantes, 0);
    expect(r.inStock).toBe(false);
    expect(r.stockLabel).toBe('Sin stock');
    expect(r.price).toBe(12000);
  });
});
