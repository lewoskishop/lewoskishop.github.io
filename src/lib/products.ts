import type { CollectionEntry } from 'astro:content';
import {
  inCollection,
  matchesFilters,
  type CatalogFilters,
  type CatalogProduct,
  type CollectionSlug,
} from './catalog';
import { COLLECTIONS, NAV, type CollectionDef, type NavItem } from './nav';
import { buildTaxonomy, toTaxable } from './taxonomy';
import { slugify } from './catalog';

export type ProductEntry = CollectionEntry<'products'>;

/** Adaptador: entrada de la colección → datos de catálogo (con id incluido). */
export function toCatalogProduct(entry: ProductEntry): CatalogProduct {
  const data = entry.data;
  return {
    id: entry.id,
    name: data.name,
    brand: data.brand,
    grupo: data.grupo,
    category: data.category,
    categories: data.categories,
    foodType: data.foodType,
    price: data.price,
    compareAtPrice: data.compareAtPrice,
    bonusKg: data.bonusKg,
    tags: data.tags,
    featured: data.featured,
  };
}

/** Filtra entradas de la colección con los mismos filtros del catálogo. */
export function filterEntries(
  entries: ProductEntry[],
  filters: CatalogFilters = {},
): ProductEntry[] {
  return entries.filter((entry) => matchesFilters(toCatalogProduct(entry), filters));
}

/** Entradas que pertenecen a una colección. */
export function collectionEntries(
  entries: ProductEntry[],
  slug: CollectionSlug,
): ProductEntry[] {
  return entries.filter((entry) => inCollection(toCatalogProduct(entry), slug));
}

/**
 * Colecciones que tienen al menos un producto.
 * Sirve para no linkear a colecciones vacías (p. ej. "Liquidación" hasta que
 * haya productos con precio anterior tachado).
 */
export function collectionsWithProducts(entries: ProductEntry[]): CollectionDef[] {
  return COLLECTIONS.filter((c) => collectionEntries(entries, c.slug).length > 0);
}

/**
 * Navegación sin enlaces a colecciones vacías.
 * Sólo se filtran los items que apuntan a /collections/…
 */
export function navWithCollections(entries: ProductEntry[], nav: NavItem[]): NavItem[] {
  const hrefs = new Set(collectionsWithProducts(entries).map((c) => c.href));
  return nav.filter((item) => !item.href.startsWith('/collections/') || hrefs.has(item.href));
}

/**
 * Menú final del sitio: Inicio + categorías (orden preferido) ajustadas a las encontradas.
 */
const EXCLUDED_NAV_CATEGORIES = new Set([
  'ceras',
  'cera',
  'colorantes',
  'colorante',
  'pabilos',
  'pabilo',
  'general',
  'materias-primas',
  'materia-prima',
  'moldes',
  'mas-moldes',
  'jabones',
  'jabon',
  'cosmetica',
  'cosmetic',
  'cosmetica-y-jabones',
  'jabones-y-cosmetica',
  'cosmética-y-jabones',
]);

export function buildNav(entries: ProductEntry[]): NavItem[] {
  const cats = buildTaxonomy(entries.map(toTaxable), 'category').filter(
    (c) => !EXCLUDED_NAV_CATEGORIES.has(c.slug) && !EXCLUDED_NAV_CATEGORIES.has(slugify(c.name)),
  );
  const bySlug = new Map(cats.map((c) => [c.slug, c]));

  const preferred: Array<{ slugs: string[]; label: string; icon?: string }> = [
    { slugs: ['navidad'], label: 'Navidad', icon: '🎄' },
    { slugs: ['moldes-animales', 'moldes-anim', 'animales'], label: 'Moldes Anim.' },
    { slugs: ['moldes-flores', 'moldes-flor', 'flores'], label: 'Moldes Flor' },
    { slugs: ['molde-yeso', 'moldes-yeso', 'yeso', 'yesos', 'moldes-p-yeso-resina-concreto'], label: 'Molde Yeso' },
    { slugs: ['envases', 'envases-varios'], label: 'Envases' },
    { slugs: ['herramientas'], label: 'Herramientas' },
    { slugs: ['decoracion', 'deco'], label: 'Deco' },
  ];

  const used = new Set<string>();
  const categoryItems: NavItem[] = [];

  for (const p of preferred) {
    const match = p.slugs.map((s) => bySlug.get(s)).find(Boolean);
    if (!match) continue;
    used.add(match.slug);
    categoryItems.push({
      label: p.label,
      href: `/productos/?cat=${match.slug}`,
      ...(p.icon ? { icon: p.icon } : {}),
    });
  }
  for (const c of cats) {
    if (used.has(c.slug)) continue;
    categoryItems.push({ label: c.name, href: `/productos/?cat=${c.slug}` });
  }

  const nav: NavItem[] = [
    { label: 'Inicio', href: '/' },
    ...categoryItems,
    { label: 'Categorías', href: '/categorias' },
  ];
  return navWithCollections(entries, nav);
}
