import { describe, it, expect } from 'vitest';
import { buildTaxonomy, toTaxable } from './taxonomy';

const products = [
  { category: 'Alimentos Secos', brand: 'Agility' },
  { category: 'Alimentos Secos', brand: 'Agility' },
  { category: 'Alimentos Húmedos', brand: 'Excellent' },
  { category: 'Camas', brand: 'Patitas' },
];

describe('buildTaxonomy', () => {
  it('agrupa por categoría con el slug canónico', () => {
    const categories = buildTaxonomy(products, 'category');

    expect(categories.map((c) => c.slug)).toEqual([
      'alimentos-humedos',
      'alimentos-secos',
      'camas',
    ]);
    expect(categories.find((c) => c.slug === 'alimentos-secos')?.count).toBe(2);
  });

  it('agrupa por marca y cuenta los productos', () => {
    const brands = buildTaxonomy(products, 'brand');

    expect(brands).toEqual([
      { name: 'Agility', slug: 'agility', count: 2 },
      { name: 'Excellent', slug: 'excellent', count: 1 },
      { name: 'Patitas', slug: 'patitas', count: 1 },
    ]);
  });

  it('une las variantes de escritura de una misma categoría', () => {
    const mezcladas = [
      { category: 'Alimentos Secos', brand: 'Agility' },
      { category: 'alimentos secos', brand: 'Agility' },
      { category: 'ALIMENTOS SECOS', brand: 'Agility' },
    ];

    const categories = buildTaxonomy(mezcladas, 'category');
    expect(categories).toHaveLength(1);
    expect(categories[0].slug).toBe('alimentos-secos');
    expect(categories[0].count).toBe(3);
  });

  it('muestra la forma más usada del nombre', () => {
    const mezcladas = [
      { category: 'alimentos secos', brand: 'Agility' },
      { category: 'Alimentos Secos', brand: 'Agility' },
    ];

    expect(buildTaxonomy(mezcladas, 'category')[0].name).toBe('Alimentos Secos');
  });

  it('ignora las categorías vacías', () => {
    const conVacias = [
      { category: '', brand: 'Agility' },
      { category: '   ', brand: 'Agility' },
    ];

    expect(buildTaxonomy(conVacias, 'category')).toEqual([]);
  });
});

describe('toTaxable', () => {
  it('extrae lo que la taxonomía necesita de una entrada del catálogo', () => {
    const entry = { data: { category: 'Camas', brand: 'Patitas', grupo: 'ambos' } };
    expect(toTaxable(entry)).toEqual({ category: 'Camas', brand: 'Patitas' });
  });
});
