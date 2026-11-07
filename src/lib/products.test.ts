import { describe, it, expect } from 'vitest';
import { toCatalogProduct, filterEntries, collectionEntries, type ProductEntry } from './products';

const entry = (id: string, data: object): ProductEntry =>
  ({ id, collection: 'products', data }) as unknown as ProductEntry;

const dog = entry('dog-seco', {
  name: 'Agility Adulto',
  brand: 'Agility',
  grupo: 'velas',
  category: 'Alimentos Secos',
  foodType: 'seco',
  price: 10000,
  compareAtPrice: 11000,
  tags: ['top-ventas'],
  featured: false,
});

const cat = entry('cat-seco', {
  name: 'Excellent Gato',
  brand: 'Excellent',
  grupo: 'jabones',
  category: 'Alimentos Secos',
  foodType: 'seco',
  price: 20000,
  tags: ['novedad'],
  featured: true,
});

const ambos = entry('ambos-snack', {
  name: 'Snack Dental',
  brand: 'Patitas',
  grupo: 'ambos',
  category: 'Snacks',
  foodType: null,
  price: 5000,
  compareAtPrice: 6500,
  tags: [],
  featured: false,
});

const entries = [dog, cat, ambos];

describe('toCatalogProduct', () => {
  it('incluye el id de la entrada y mapea los campos', () => {
    expect(toCatalogProduct(dog)).toEqual({
      id: 'dog-seco',
      name: 'Agility Adulto',
      brand: 'Agility',
      grupo: 'velas',
      category: 'Alimentos Secos',
      foodType: 'seco',
      price: 10000,
      compareAtPrice: 11000,
      bonusKg: undefined,
      tags: ['top-ventas'],
      featured: false,
    });
  });
});

describe('filterEntries', () => {
  it('filtra por grupo incluyendo ambos', () => {
    expect(filterEntries(entries, { grupo: 'velas' }).map((e) => e.id)).toEqual([
      'dog-seco',
      'ambos-snack',
    ]);
  });

  it('combina grupo y categoría', () => {
    expect(
      filterEntries(entries, { grupo: 'jabones', category: 'alimentos-secos' }).map((e) => e.id),
    ).toEqual(['cat-seco']);
  });

  it('sin filtros devuelve todo', () => {
    expect(filterEntries(entries)).toHaveLength(3);
  });
});

describe('collectionEntries', () => {
  it('novedades por tag', () => {
    expect(collectionEntries(entries, 'novedades').map((e) => e.id)).toEqual(['cat-seco']);
  });

  it('más vendidos por tag', () => {
    expect(collectionEntries(entries, 'mas-vendidos').map((e) => e.id)).toEqual(['dog-seco']);
  });

  it('liquidación por descuento', () => {
    expect(collectionEntries(entries, 'liquidacion').map((e) => e.id)).toEqual(['ambos-snack']);
  });
});
