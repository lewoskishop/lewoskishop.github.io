import { describe, it, expect } from 'vitest';
import { COLLECTIONS, NAV } from './nav';
import { slugify } from './catalog';
import { buildNav, type ProductEntry } from './products';

const entry = (id: string, data: object): ProductEntry =>
  ({ id, collection: 'products', data }) as unknown as ProductEntry;

describe('COLLECTIONS', () => {
  it('expone las tres colecciones esperadas con href coherente', () => {
    expect(COLLECTIONS.map((c) => c.slug)).toEqual(['novedades', 'mas-vendidos', 'liquidacion']);
    for (const collection of COLLECTIONS) {
      expect(collection.href).toBe(`/collections/${collection.slug}`);
    }
  });
});

describe('NAV', () => {
  it('define el menú base', () => {
    expect(NAV.map((item) => item.label)).toEqual(['Inicio', 'Categorías']);
  });
});

describe('buildNav', () => {
  it('arma el menú con las categorías reales del catálogo (como el desplegable)', () => {
    const entries = [
      entry('m1', { name: 'Molde', brand: 'X', category: 'Moldes', price: 1, tags: [] }),
      entry('n1', { name: 'Adorno', brand: 'X', category: 'Navidad', price: 1, tags: [] }),
      entry('c1', { name: 'Cera', brand: 'X', category: 'Ceras', price: 1, tags: [] }),
    ];
    const nav = buildNav(entries);
    expect(nav[0]).toMatchObject({ label: 'Inicio', href: '/' });
    expect(nav[nav.length - 1]).toMatchObject({ label: 'Categorías', href: '/categorias' });
    const labels = nav.map((i) => i.label);
    expect(labels).toContain('Moldes');
    expect(labels).toContain('Navidad');
    expect(labels).toContain('Ceras');
    expect(nav.find((i) => i.label === 'Navidad')).toMatchObject({ href: '/productos/?cat=navidad', icon: '🎄' });
    expect(nav.find((i) => i.label === 'Moldes')).toMatchObject({ href: '/productos/?cat=moldes' });
  });

  it('sin productos muestra solo Inicio y Categorías', () => {
    expect(buildNav([] as ProductEntry[]).map((i) => i.label)).toEqual(['Inicio', 'Categorías']);
  });
});

describe('slugify', () => {
  it('deja los slugs en minúsculas y sin acentos', () => {
    expect(slugify('Jabones y Cosmética')).toBe('jabones-y-cosmetica');
    expect(slugify('LewoskiShop')).toBe('lewoskishop');
  });
});
