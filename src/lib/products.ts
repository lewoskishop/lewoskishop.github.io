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
 * Menú final del sitio: solo Inicio, Navidad y Categorías.
 */
export function buildNav(entries: ProductEntry[]): NavItem[] {
  const cats = buildTaxonomy(entries.map(toTaxable), 'category');
  const navidad = cats.find((c) => c.slug === 'navidad');

  const nav: NavItem[] = [
    { label: 'Inicio', href: '/' },
    ...(navidad ? [{ label: 'Navidad', href: '/productos/?cat=navidad', icon: '🎄' }] : []),
    { label: 'Categorías', href: '/categorias' },
  ];
  return navWithCollections(entries, nav);
}
