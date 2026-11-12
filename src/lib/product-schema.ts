import { z } from 'astro/zod';

/** Una variante de peso/presentación dentro de un producto. */
export const variantSchema = z.object({
  /** Ej: "1kg", "3kg", "7,5kg", "15kg", "x12". */
  label: z.string().min(1),
  /** Precio de esta variante. */
  price: z.number().positive(),
  /** Precio anterior tachado (opcional). */
  compareAtPrice: z.number().positive().optional(),
  /** Unidades disponibles. */
  stock: z.number().int().nonnegative(),
  /** Kilos de regalo de esta variante (opcional). */
  bonusKg: z.number().nonnegative().optional(),
  /** Foto específica de esta variante (opcional). */
  image: z.string().optional(),
});

/**
 * Esquema de un producto. Se comparte entre las content collections de Astro
 * y los tests, por eso vive en lib/ y no dentro de content.config.ts.
 */
export const productSchema = z
  .object({
    /** Nombre visible del producto. */
    name: z.string().min(1),
    /** Descripción corta (se muestra en la tarjeta). */
    description: z.string().min(1),
    /** Descripción larga (se muestra en el detalle). */
    longDescription: z.string().optional(),
    /** Precio base. Número sin símbolo ni separadores. */
    price: z.number().positive(),
    /** Precio anterior tachado (opcional, para mostrar descuento). */
    compareAtPrice: z.number().positive().optional(),
    /** Categoría principal (se usa para los filtros del catálogo). */
    category: z.string().default('General'),
    /** Marca del producto. */
    brand: z.string().min(1),
    /** (Deprecado) Grupo legado; el catálogo se organiza por categorías. */
    grupo: z.enum(['velas', 'jabones', 'ambos']).optional(),
    /** Tipo de alimento: seco, húmedo o null (accesorios, snacks, camas, etc.). */
    foodType: z.enum(['seco', 'humido']).nullable().default(null),
    /** Kilos de regalo del producto (opcional). */
    bonusKg: z.number().nonnegative().optional(),
    /** Variantes de peso/presentación. Si no está, el producto es simple. */
    variants: z.array(variantSchema).min(1).optional(),
    /** De 1 a 3 imágenes. Rutas dentro de /public. */
    images: z.array(z.string()).min(1).max(3),
    /** Destacar en la home. */
    featured: z.boolean().default(false),
    /** Si está disponible. Si es false se muestra como "Sin stock". */
    inStock: z.boolean().default(true),
    /** Stock explícito del producto simple (opcional). */
    stock: z.number().int().nonnegative().optional(),
    /** Etiqueta opcional sobre la imagen (ej: "Nuevo", "Oferta"). */
    badge: z.string().optional(),
    /** Tags para búsqueda, filtros y colecciones. */
    tags: z.array(z.string()).default([]),
  })
  .refine((p) => p.compareAtPrice == null || p.compareAtPrice > p.price, {
    message: 'compareAtPrice debe ser mayor que price',
    path: ['compareAtPrice'],
  })
  .refine(
    (p) => (p.variants ?? []).every((v) => v.compareAtPrice == null || v.compareAtPrice > v.price),
    { message: 'compareAtPrice de la variante debe ser mayor que su price', path: ['variants'] },
  );

export type ProductData = z.infer<typeof productSchema>;
export type ProductVariant = z.infer<typeof variantSchema>;
