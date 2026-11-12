import { slugify } from './catalog';

/**
 * Taxonomía del catálogo: categorías y marcas.
 * Se derivan del propio catálogo (lo que se carga es lo que se muestra).
 */

/** Datos mínimos de un producto para poder agruparlo. */
export interface TaxableProduct {
  category?: string;
  categories?: string[];
  brand: string;
}

/** Una categoría o marca del catálogo, con su slug y cuántos productos tiene. */
export interface TaxonomyEntry {
  name: string;
  slug: string;
  count: number;
}

function productCategories(product: TaxableProduct): string[] {
  if (Array.isArray(product.categories) && product.categories.length) return product.categories;
  if (product.category) return [product.category];
  return [];
}

/** Adapta una entrada de la colección de productos a los datos que necesita la taxonomía. */
export function toTaxable(product: {
  data: { category?: string; categories?: string[]; brand: string };
}): TaxableProduct {
  return {
    category: product.data.category,
    categories: product.data.categories,
    brand: product.data.brand,
  };
}

/**
 * Agrupa los productos por categoría o por marca.
 */
export function buildTaxonomy(
  products: TaxableProduct[],
  key: 'category' | 'brand',
): TaxonomyEntry[] {
  const groups = new Map<string, Map<string, number>>();

  for (const product of products) {
    const names = key === 'category' ? productCategories(product) : [product.brand ?? ''];
    for (const raw of names) {
      const name = (raw ?? '').trim();
      if (!name) continue;

      const slug = slugify(name);
      if (!slug) continue;

      const variants = groups.get(slug) ?? new Map<string, number>();
      variants.set(name, (variants.get(name) ?? 0) + 1);
      groups.set(slug, variants);
    }
  }

  return [...groups.entries()]
    .map(([slug, variants]) => ({
      slug,
      name: pickMostUsed(variants),
      count: [...variants.values()].reduce((total, n) => total + n, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/**
 * Marca más usada: a igual cantidad, la primera que se vio; y si empatan
 * con distinta capitalización, la que empieza en mayúscula ("Alimentos Secos"
 * en vez de "alimentos secos").
 */
function pickMostUsed(variants: Map<string, number>): string {
  let best = '';
  let bestCount = -1;

  for (const [name, count] of variants) {
    const capitalized = startsUppercase(name);
    const bestCapitalized = startsUppercase(best);
    const better =
      count > bestCount ||
      (count === bestCount && capitalized && !bestCapitalized);

    if (better) {
      best = name;
      bestCount = count;
    }
  }

  return best;
}

function startsUppercase(value: string): boolean {
  const first = value.trim().charAt(0);
  return first !== '' && first === first.toUpperCase() && first !== first.toLowerCase();
}
