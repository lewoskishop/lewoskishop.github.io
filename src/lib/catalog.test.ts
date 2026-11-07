import { describe, it, expect } from 'vitest';
import {
  slugify,
  slugifyCategory,
  matchesCategory,
  normalize,
  matchesGroup,
  filterProducts,
  searchProducts,
  inCollection,
} from './catalog';

const mk = (over: Partial<import('./catalog').CatalogProduct>): import('./catalog').CatalogProduct => ({
  id: 'p',
  name: 'Producto',
  brand: 'Royal Canin',
  grupo: 'velas',
  category: 'Alimentos Secos',
  foodType: 'seco',
  price: 10000,
  tags: [],
  ...over,
});

const catalogo = [
  mk({ id: 'dog-seco', name: 'Royal Canin Medium', brand: 'Royal Canin', grupo: 'velas', category: 'Alimentos Secos', foodType: 'seco' }),
  mk({ id: 'cat-seco', name: 'Excellent Gato', brand: 'Excellent', grupo: 'jabones', category: 'Alimentos Secos', foodType: 'seco', tags: ['novedad'] }),
  mk({ id: 'dog-humedo', name: 'Ken L Lata', brand: 'Ken L', grupo: 'velas', category: 'Alimentos Húmedos', foodType: 'humido', price: 3200, compareAtPrice: 4000, tags: ['top-ventas'] }),
  mk({ id: 'ambos-snack', name: 'Snack Dental', brand: 'Agility', grupo: 'ambos', category: 'Snacks', foodType: null, price: 2500, bonusKg: 0 }),
  mk({ id: 'dog-cama', name: 'Cama Nube', brand: 'Patitas', grupo: 'velas', category: 'Camas', foodType: null, price: 45000, compareAtPrice: 60000, tags: ['liquidacion'] }),
  mk({ id: 'cat-piedras', name: 'Piedras Aglomerantes', brand: 'Sieger', grupo: 'jabones', category: 'Piedras Sanitarias', foodType: null, price: 8000, bonusKg: 1 }),
];

describe('slugify', () => {
  it('normaliza espacios y mayúsculas', () => {
    expect(slugify('Alimentos Secos')).toBe('alimentos-secos');
    expect(slugify('Ken L')).toBe('ken-l');
  });
  it('quita acentos y símbolos', () => {
    expect(slugify('Alimentos Húmedos')).toBe('alimentos-humedos');
    expect(slugify('  Piedras Sanitarias!  ')).toBe('piedras-sanitarias');
  });
});

describe('slugifyCategory', () => {
  it('minúsculas, sin acentos, con guiones', () => {
    expect(slugifyCategory('Alimentos Húmedos')).toBe('alimentos-humedos');
    expect(slugifyCategory('  Piedras Sanitarias  ')).toBe('piedras-sanitarias');
    expect(slugifyCategory('Camas')).toBe('camas');
  });
  it('es idempotente sobre slugs ya formados', () => {
    expect(slugifyCategory('alimentos-secos')).toBe('alimentos-secos');
    expect(slugifyCategory('piedras-sanitarias')).toBe('piedras-sanitarias');
  });
});

describe('matchesCategory', () => {
  it('acepta slug o etiqueta con espacios, mayúsculas y acentos', () => {
    expect(matchesCategory('alimentos humedos', 'alimentos-humedos')).toBe(true);
    expect(matchesCategory('Alimentos Húmedos', 'alimentos-humedos')).toBe(true);
    expect(matchesCategory('alimentos-humedos', 'Alimentos Húmedos')).toBe(true);
  });
  it('filtro vacío muestra todo', () => {
    expect(matchesCategory('camas', '')).toBe(true);
  });
  it('no coincide con una categoría distinta', () => {
    expect(matchesCategory('camas', 'alimentos-secos')).toBe(false);
  });
});

describe('normalize', () => {
  it('minúsculas sin acentos', () => {
    expect(normalize('Húmedos')).toBe('humedos');
  });
});

describe('matchesGroup', () => {
  it('ambos aplica a perros y gatos', () => {
    const p = mk({ grupo: 'ambos' });
    expect(matchesGroup(p, 'velas')).toBe(true);
    expect(matchesGroup(p, 'jabones')).toBe(true);
  });
  it('específica solo a su grupo', () => {
    expect(matchesGroup(mk({ grupo: 'jabones' }), 'velas')).toBe(false);
  });
});

describe('filterProducts', () => {
  it('sin filtros devuelve todo', () => {
    expect(filterProducts(catalogo, {})).toHaveLength(catalogo.length);
  });

  it('filtra por grupo incluyendo ambos', () => {
    const perros = filterProducts(catalogo, { grupo: 'velas' }).map((p) => p.id);
    expect(perros).toContain('dog-seco');
    expect(perros).toContain('ambos-snack');
    expect(perros).not.toContain('cat-seco');
  });

  it('filtra por categoría por slug', () => {
    expect(filterProducts(catalogo, { category: 'alimentos-humedos' }).map((p) => p.id)).toEqual([
      'dog-humedo',
    ]);
  });

  it('filtra por marca por slug', () => {
    expect(filterProducts(catalogo, { brand: 'royal-canin' }).map((p) => p.id)).toEqual(['dog-seco']);
  });

  it('filtra por tipo de alimento', () => {
    expect(filterProducts(catalogo, { foodType: 'seco' }).map((p) => p.id)).toEqual([
      'dog-seco',
      'cat-seco',
    ]);
  });

  it('filtra promo kg de regalo', () => {
    expect(filterProducts(catalogo, { promoKg: true }).map((p) => p.id)).toEqual(['cat-piedras']);
  });

  it('combina filtros con AND', () => {
    expect(
      filterProducts(catalogo, { grupo: 'velas', category: 'alimentos-secos' }).map((p) => p.id),
    ).toEqual(['dog-seco']);
  });

  it('combina búsqueda de texto', () => {
    expect(filterProducts(catalogo, { q: 'excellent' }).map((p) => p.id)).toEqual(['cat-seco']);
  });

  it('devuelve vacío si nada coincide', () => {
    expect(filterProducts(catalogo, { brand: 'no-existe' })).toHaveLength(0);
  });
});

describe('searchProducts', () => {
  it('busca sin acentos ni mayúsculas', () => {
    expect(searchProducts(catalogo, 'HUMEDO').map((p) => p.id)).toEqual(['dog-humedo']);
  });
  it('busca por marca y por categoría', () => {
    expect(searchProducts(catalogo, 'sieger').map((p) => p.id)).toEqual(['cat-piedras']);
    expect(searchProducts(catalogo, 'camas').map((p) => p.id)).toEqual(['dog-cama']);
  });
  it('query vacía devuelve vacío (no todo)', () => {
    expect(searchProducts(catalogo, '   ')).toHaveLength(0);
  });
  it('respeta el límite', () => {
    expect(searchProducts(catalogo, 'a', 2)).toHaveLength(2);
  });
});

describe('inCollection', () => {
  it('novedades por tag', () => {
    expect(inCollection(mk({ tags: ['novedad'] }), 'novedades')).toBe(true);
    expect(inCollection(mk({ tags: [] }), 'novedades')).toBe(false);
  });
  it('más vendidos por tag', () => {
    expect(inCollection(mk({ tags: ['top-ventas'] }), 'mas-vendidos')).toBe(true);
  });
  it('liquidación por descuento >= 15%', () => {
    expect(inCollection(mk({ price: 8000, compareAtPrice: 10000 }), 'liquidacion')).toBe(true);
    expect(inCollection(mk({ price: 9500, compareAtPrice: 10000 }), 'liquidacion')).toBe(false);
  });
});
