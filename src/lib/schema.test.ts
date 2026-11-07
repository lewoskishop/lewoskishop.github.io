import { describe, it, expect } from 'vitest';
import { productSchema, variantSchema } from './product-schema';

const valido = {
  name: 'Royal Canin Medium Adult',
  description: 'Alimento balanceado para perros adultos de talla mediana.',
  price: 75900,
  compareAtPrice: 99900,
  category: 'Alimentos Secos',
  brand: 'Royal Canin',
  grupo: 'velas',
  foodType: 'seco',
  images: ['/images/products/royal-canin-1.svg'],
  tags: ['novedad'],
};

describe('productSchema (casos válidos)', () => {
  it('acepta un producto mínimo completo', () => {
    const r = productSchema.safeParse(valido);
    expect(r.success).toBe(true);
  });

  it('aplica defaults', () => {
    const r = productSchema.parse(valido);
    expect(r.featured).toBe(false);
    expect(r.inStock).toBe(true);
    expect(r.tags).toEqual(['novedad']);
    expect(r.foodType).toBe('seco');
  });

  it('acepta foodType null y bonusKg', () => {
    const r = productSchema.safeParse({ ...valido, foodType: null, bonusKg: 2 });
    expect(r.success).toBe(true);
  });

  it('acepta variantes y grupo ambos', () => {
    const r = productSchema.safeParse({
      ...valido,
      grupo: 'ambos',
      compareAtPrice: undefined,
      variants: [
        { label: '1kg', price: 12000, compareAtPrice: 15000, stock: 0 },
        { label: '3kg', price: 28000, stock: 3, bonusKg: 1 },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe('productSchema (rechaza fixtures inválidos)', () => {
  it('precio negativo', () => {
    expect(productSchema.safeParse({ ...valido, price: -1 }).success).toBe(false);
  });

  it('grupo inválida', () => {
    expect(productSchema.safeParse({ ...valido, grupo: 'dinosaurio' }).success).toBe(false);
  });

  it('foodType inválido', () => {
    expect(productSchema.safeParse({ ...valido, foodType: 'crudo' }).success).toBe(false);
  });

  it('bonusKg negativo', () => {
    expect(productSchema.safeParse({ ...valido, bonusKg: -1 }).success).toBe(false);
  });

  it('sin marca', () => {
    const { brand, ...sinMarca } = valido;
    expect(productSchema.safeParse(sinMarca).success).toBe(false);
  });

  it('sin imágenes', () => {
    expect(productSchema.safeParse({ ...valido, images: [] }).success).toBe(false);
  });

  it('más de 3 imágenes', () => {
    expect(
      productSchema.safeParse({ ...valido, images: ['a', 'b', 'c', 'd'] }).success,
    ).toBe(false);
  });

  it('compareAtPrice menor o igual al precio', () => {
    expect(productSchema.safeParse({ ...valido, compareAtPrice: 50000 }).success).toBe(false);
    expect(productSchema.safeParse({ ...valido, compareAtPrice: 75900 }).success).toBe(false);
  });

  it('variante sin label', () => {
    expect(
      variantSchema.safeParse({ price: 1000, stock: 1 }).success,
    ).toBe(false);
  });

  it('variante con stock negativo', () => {
    expect(
      variantSchema.safeParse({ label: '1kg', price: 1000, stock: -3 }).success,
    ).toBe(false);
  });

  it('variante con precio cero', () => {
    expect(
      variantSchema.safeParse({ label: '1kg', price: 0, stock: 1 }).success,
    ).toBe(false);
  });

  it('lista de variantes vacía', () => {
    expect(productSchema.safeParse({ ...valido, variants: [] }).success).toBe(false);
  });
});
