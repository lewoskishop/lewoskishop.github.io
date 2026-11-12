import { discountPercent } from './pricing';

export type Group = 'velas' | 'jabones' | 'ambos';
export type FoodType = 'seco' | 'humido';
export type CollectionSlug = 'novedades' | 'mas-vendidos' | 'liquidacion';

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  grupo?: Group;
  category: string;
  foodType: FoodType | null;
  price: number;
  compareAtPrice?: number;
  bonusKg?: number;
  tags: string[];
  featured?: boolean;
}

export interface CatalogFilters {
  grupo?: 'velas' | 'jabones';
  category?: string;
  brand?: string;
  foodType?: FoodType;
  promoKg?: boolean;
  collection?: CollectionSlug;
  q?: string;
}

/** "Alimentos Húmedos" → "alimentos-humidos". */
export function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug canónico de categoría: minúsculas, sin acentos, con guiones. Idempotente. */
export function slugifyCategory(value: string): string {
  return slugify(value);
}

/** Compara una categoría (slug o etiqueta) contra un filtro, normalizando ambos lados. */
export function matchesCategory(value: string, filter: string): boolean {
  if (!filter) return true;
  return slugifyCategory(value) === slugifyCategory(filter);
}

/** Minúsculas y sin acentos, para comparar y buscar. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** (Legado) Coincidencia por grupo. */
export function matchesGroup(product: CatalogProduct, grupo: 'velas' | 'jabones'): boolean {
  return product.grupo === grupo || product.grupo === 'ambos';
}

function haystack(product: CatalogProduct): string {
  return normalize([product.name, product.brand, product.category, ...product.tags].join(' '));
}

function matchesText(product: CatalogProduct, q: string): boolean {
  return haystack(product).includes(normalize(q));
}

export function matchesFilters(product: CatalogProduct, filters: CatalogFilters): boolean {
  if (filters.grupo && !matchesGroup(product, filters.grupo)) return false;
  if (filters.category && slugify(product.category) !== filters.category) return false;
  if (filters.brand && slugify(product.brand) !== filters.brand) return false;
  if (filters.foodType && product.foodType !== filters.foodType) return false;
  if (filters.promoKg && !(product.bonusKg && product.bonusKg > 0)) return false;
  if (filters.collection && !inCollection(product, filters.collection)) return false;
  if (filters.q && !matchesText(product, filters.q)) return false;
  return true;
}

export function filterProducts<T extends CatalogProduct>(
  products: T[],
  filters: CatalogFilters = {},
): T[] {
  return products.filter((p) => matchesFilters(p, filters));
}

/** Búsqueda predictiva sobre nombre, marca, categoría y tags. */
export function searchProducts<T extends CatalogProduct>(products: T[], q: string, limit = 6): T[] {
  const query = normalize(q);
  if (!query) return [];
  return products.filter((p) => haystack(p).includes(query)).slice(0, limit);
}

/** Pertenencia a una colección (novedades / más vendidos / liquidación). */
export function inCollection(
  product: Pick<CatalogProduct, 'tags' | 'price' | 'compareAtPrice'>,
  slug: CollectionSlug,
): boolean {
  switch (slug) {
    case 'novedades':
      return product.tags.includes('novedad');
    case 'mas-vendidos':
      return product.tags.includes('top-ventas');
    case 'liquidacion':
      return discountPercent(product.price, product.compareAtPrice) >= 15;
  }
}
