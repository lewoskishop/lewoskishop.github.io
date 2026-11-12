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
  it('define el menú principal por categorías', () => {
    expect(NAV.map((item) => item.label)).toEqual([
      'Inicio',
      'NAVIDAD',
      'VELAS',
      'JABONES',
      'AROMAS',
      'ENVASES VARIOS',
      'JABÓN',
      'DECORACIÓN',
      'COSMÉTICA',
      'FLORES',
      'ANIMALES',
      'MOLDES P YESO, RESINA, CONCRETO',
      'MAS MOLDES',
      'Categorías',
    ]);
  });

  it('apunta a categorías o secciones sin depender de grupos', () => {
    for (const item of NAV) {
      expect(item).not.toHaveProperty('grupo');
      expect(item.children).toBeUndefined();
    }
  });
});

describe('buildNav', () => {
  it('mantiene el menú principal', () => {
    const nav = buildNav([] as ProductEntry[]);
    expect(nav[0]?.label).toBe('Inicio');
    expect(nav.some((i) => i.label === 'NAVIDAD')).toBe(true);
    expect(nav.some((i) => i.label === 'Categorías')).toBe(true);
  });
});

describe('slugify', () => {
  it('deja los slugs en minúsculas y sin acentos', () => {
    expect(slugify('Jabones y Cosmética')).toBe('jabones-y-cosmetica');
    expect(slugify('LewoskiShop')).toBe('lewoskishop');
  });
});
