import { describe, it, expect } from 'vitest';
import { COLLECTIONS, NAV } from './nav';
import { slugify, slugifyCategory } from './catalog';
import { navWithCatalog, buildNav, type ProductEntry } from './products';

const entry = (id: string, data: object): ProductEntry =>
  ({ id, collection: 'products', data }) as unknown as ProductEntry;

const entries = [
  entry('vela-soja', {
    name: 'Cera de soja',
    brand: 'LewoskiShop',
    grupo: 'velas',
    category: 'Ceras',
    price: 10000,
    tags: [],
  }),
  entry('jabon-gli', {
    name: 'Glicerina',
    brand: 'LewoskiShop',
    grupo: 'jabones',
    category: 'Jabones y Cosmética',
    price: 5000,
    tags: [],
  }),
  entry('ambos-molde', {
    name: 'Molde silicona',
    brand: 'LewoskiShop',
    grupo: 'ambos',
    category: 'Moldes',
    price: 8000,
    tags: [],
  }),
];

describe('COLLECTIONS', () => {
  it('expone las tres colecciones esperadas con href coherente', () => {
    expect(COLLECTIONS.map((c) => c.slug)).toEqual(['novedades', 'mas-vendidos', 'liquidacion']);
    for (const collection of COLLECTIONS) {
      expect(collection.href).toBe(`/collections/${collection.slug}`);
    }
  });
});

describe('NAV', () => {
  it('marca los items de grupo para poder completarlos con el catálogo', () => {
    const velas = NAV.find((item) => item.href === '/velas');
    const jabones = NAV.find((item) => item.href === '/jabones');
    expect(velas?.grupo).toBe('velas');
    expect(jabones?.grupo).toBe('jabones');
  });

  it('no lleva categorías escritas a mano (se arman con el catálogo)', () => {
    for (const item of NAV) {
      expect(item.children).toBeUndefined();
    }
  });
});

describe('navWithCatalog', () => {
  const nav = navWithCatalog(entries, NAV);

  it('los sub-links de cada grupo usan las categorías de ese grupo', () => {
    const velas = nav.find((item) => item.grupo === 'velas');
    const jabones = nav.find((item) => item.grupo === 'jabones');

    expect(velas?.children).toEqual([
      { label: 'Ceras', href: '/productos/?grupo=velas&cat=ceras' },
      { label: 'Moldes', href: '/productos/?grupo=velas&cat=moldes' },
    ]);
    expect(jabones?.children).toEqual([
      { label: 'Jabones y Cosmética', href: '/productos/?grupo=jabones&cat=jabones-y-cosmetica' },
      { label: 'Moldes', href: '/productos/?grupo=jabones&cat=moldes' },
    ]);
  });

  it('el slug de cada sub-link es el canónico de la categoría', () => {
    for (const item of nav) {
      for (const child of item.children ?? []) {
        const params = new URLSearchParams(child.href.split('?')[1]);
        const cat = params.get('cat');
        expect(cat).toBeTruthy();
        expect(slugifyCategory(cat as string)).toBe(cat);
      }
    }
  });

  it('una categoría nueva del panel aparece sola en el menú', () => {
    const conEnvases = [
      ...entries,
      entry('vela-envase', {
        name: 'Frasco',
        brand: 'LewoskiShop',
        grupo: 'velas',
        category: 'Envases',
        price: 3000,
        tags: [],
      }),
    ];

    const velas = navWithCatalog(conEnvases, NAV).find((item) => item.grupo === 'velas');
    expect(velas?.children?.map((c) => c.label)).toContain('Envases');
  });

  it('si un grupo no tiene categorías, el item queda sin desplegable', () => {
    const soloJabones = [
      entry('jabon-gli', {
        name: 'Glicerina',
        brand: 'LewoskiShop',
        grupo: 'jabones',
        category: 'Jabones y Cosmética',
        price: 5000,
        tags: [],
      }),
    ];

    const velas = navWithCatalog(soloJabones, NAV).find((item) => item.grupo === 'velas');
    expect(velas?.children).toBeUndefined();
  });
});

describe('buildNav', () => {
  it('arma el menú con las categorías reales del catálogo', () => {
    const nav = buildNav(entries);
    expect(nav.map((item) => item.label)).toEqual(['Inicio', 'Navidad', 'Velas', 'Jabones', 'Categorías']);
    expect(nav.find((i) => i.grupo === 'velas')?.children?.length).toBeGreaterThan(0);
  });
});

describe('slugify', () => {
  it('deja los slugs en minúsculas y sin acentos', () => {
    expect(slugify('Jabones y Cosmética')).toBe('jabones-y-cosmetica');
    expect(slugify('LewoskiShop')).toBe('lewoskishop');
  });
});
