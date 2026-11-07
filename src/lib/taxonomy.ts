import { slugify } from './catalog';

/**
 * Taxonomía del catálogo: categorías y marcas.
 *
 * Antes estas listas estaban escritas a mano en src/lib/nav.ts, así que una
 * categoría o marca nueva cargada desde el panel (/admin) no aparecía en los
 * filtros ni en las páginas de marca hasta tocar el código.
 *
 * Ahora se derivan del propio catálogo: lo que el panel carga es lo que el
 * sitio muestra.
 */

/** Datos mínimos de un producto para poder agruparlo. */
export interface TaxableProduct {
  category: string;
  brand: string;
  grupo: string;
}

/** Una categoría o marca del catálogo, con su slug y cuántos productos tiene. */
export interface TaxonomyEntry {
  name: string;
  slug: string;
  count: number;
}

/** Adapta una entrada de la colección de productos a los datos que necesita la taxonomía. */
export function toTaxable(product: {
  data: { category: string; brand: string; grupo: string };
}): TaxableProduct {
  return {
    category: product.data.category,
    brand: product.data.brand,
    grupo: product.data.grupo,
  };
}

/**
 * Agrupa los productos por categoría o por marca.
 *
 * El slug es el canónico (minúsculas, sin acentos, con guiones), así que
 * "Alimentos Húmedos" y "alimentos humedos" caen en la misma entrada.
 * El nombre que se muestra es el que más se repite en el catálogo; a igual
 * cantidad gana la variante con mayúscula inicial, para que se vea prolijo.
 *
 * La lista viene ordenada alfabéticamente.
 */
export function buildTaxonomy(
  products: TaxableProduct[],
  key: 'category' | 'brand',
): TaxonomyEntry[] {
  const groups = new Map<string, Map<string, number>>();

  for (const product of products) {
    const name = (product[key] ?? '').trim();
    if (!name) continue;

    const slug = slugify(name);
    if (!slug) continue;

    const variants = groups.get(slug) ?? new Map<string, number>();
    variants.set(name, (variants.get(name) ?? 0) + 1);
    groups.set(slug, variants);
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
 * Categorías que tienen al menos un producto para la grupo indicada.
 * "ambos" cuenta como perro y como gato.
 */
export function categoriesForGroup(
  products: TaxableProduct[],
  grupo: 'velas' | 'jabones',
): TaxonomyEntry[] {
  return buildTaxonomy(
    products.filter((p) => p.grupo === grupo || p.grupo === 'ambos'),
    'category',
  );
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
