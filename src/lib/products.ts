import type { CollectionEntry } from 'astro:content';
import {
  inCollection,
  matchesFilters,
  type CatalogFilters,
  type CatalogProduct,
  type CollectionSlug,
} from './catalog';
import { COLLECTIONS, NAV, type CollectionDef, type NavItem } from './nav';
import { categoriesForGroup, toTaxable } from './taxonomy';

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
 * Le pone a cada item de grupo los sub-links con las categorías que hay
 * para esa grupo en el catálogo. Si una grupo no tiene categorías, el
 * item queda como link simple (sin desplegable vacío).
 */
export function navWithCatalog(entries: ProductEntry[], nav: NavItem[]): NavItem[] {
  const taxonomy = entries.map(toTaxable);

  return nav.map((item) => {
    if (!item.grupo) return item;

    const children = categoriesForGroup(taxonomy, item.grupo).map((category) => ({
      label: category.name,
      href: `/productos/?grupo=${item.grupo}&cat=${category.slug}`,
    }));

    return { ...item, children: children.length ? children : undefined };
  });
}

/**
 * Menú final del sitio: con las categorías reales del catálogo y sin
 * colecciones vacías.
 */
export function buildNav(entries: ProductEntry[]): NavItem[] {
  return navWithCollections(entries, navWithCatalog(entries, NAV));
}
