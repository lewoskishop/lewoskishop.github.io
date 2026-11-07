import { describe, it, expect } from 'vitest';
import { buildTaxonomy, categoriesForGroup, toTaxable } from './taxonomy';

const products = [
  { category: 'Alimentos Secos', brand: 'Agility', grupo: 'velas' },
  { category: 'Alimentos Secos', brand: 'Agility', grupo: 'jabones' },
  { category: 'Alimentos Húmedos', brand: 'Excellent', grupo: 'jabones' },
  { category: 'Camas', brand: 'Patitas', grupo: 'ambos' },
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
      { category: 'Alimentos Secos', brand: 'Agility', grupo: 'velas' },
      { category: 'alimentos secos', brand: 'Agility', grupo: 'velas' },
      { category: 'ALIMENTOS SECOS', brand: 'Agility', grupo: 'velas' },
    ];

    const categories = buildTaxonomy(mezcladas, 'category');
    expect(categories).toHaveLength(1);
    expect(categories[0].slug).toBe('alimentos-secos');
    expect(categories[0].count).toBe(3);
  });

  it('muestra la forma más usada del nombre', () => {
    const mezcladas = [
      { category: 'alimentos secos', brand: 'Agility', grupo: 'velas' },
      { category: 'Alimentos Secos', brand: 'Agility', grupo: 'velas' },
    ];

    expect(buildTaxonomy(mezcladas, 'category')[0].name).toBe('Alimentos Secos');
  });

  it('ignora las categorías vacías', () => {
    const conVacias = [
      { category: '', brand: 'Agility', grupo: 'velas' },
      { category: '   ', brand: 'Agility', grupo: 'velas' },
    ];

    expect(buildTaxonomy(conVacias, 'category')).toEqual([]);
  });
});

describe('categoriesForGroup', () => {
  it('"ambos" cuenta como perro y como gato', () => {
    expect(categoriesForGroup(products, 'velas').map((c) => c.slug)).toEqual([
      'alimentos-secos',
      'camas',
    ]);
    expect(categoriesForGroup(products, 'jabones').map((c) => c.slug)).toEqual([
      'alimentos-humedos',
      'alimentos-secos',
      'camas',
    ]);
  });

  it('una categoría nueva del panel aparece sin tocar el código', () => {
    const conNueva = [
      ...products,
      { category: 'Higiene', brand: 'Clean', grupo: 'velas' },
    ];

    expect(categoriesForGroup(conNueva, 'velas').map((c) => c.slug)).toContain('higiene');
  });
});

describe('toTaxable', () => {
  it('extrae lo que la taxonomía necesita de una entrada del catálogo', () => {
    const entry = { data: { category: 'Camas', brand: 'Patitas', grupo: 'ambos' } };
    expect(toTaxable(entry)).toEqual({ category: 'Camas', brand: 'Patitas', grupo: 'ambos' });
  });
});
