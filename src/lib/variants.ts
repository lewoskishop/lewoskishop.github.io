import { discountPercent } from './pricing';

export interface ProductVariant {
  label: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  bonusKg?: number;
  /** Foto específica de esta presentación (opcional). */
  image?: string;
}

export interface VariantProduct {
  id: string;
  price: number;
  compareAtPrice?: number;
  inStock?: boolean;
  stock?: number;
  bonusKg?: number;
  variants?: ProductVariant[];
}

export interface ResolvedVariant {
  index: number;
  label: string | null;
  cartId: string;
  price: number;
  compareAtPrice: number | null;
  discount: number;
  stock: number;
  stockLabel: string;
  inStock: boolean;
  bonusKg: number;
  /** Foto específica de la variante (opcional). */
  image: string | null;
}

const DEFAULT_STOCK = 25;

/** ¿El producto tiene variantes de peso/presentación? */
export function hasVariants(product: VariantProduct): boolean {
  return Array.isArray(product.variants) && product.variants.length > 0;
}

/** Texto de urgencia de stock: "Sin stock" | "N unidades" | "+10 unidades". */
export function stockLabel(stock: number): string {
  if (stock <= 0) return 'Sin stock';
  if (stock <= 10) return `${stock} unidad${stock === 1 ? '' : 'es'}`;
  return '+10 unidades';
}

/** Id de carrito para una variante. Sin etiqueta devuelve el id del producto. */
export function variantCartId(productId: string, label?: string | null): string {
  if (!label) return productId;
  return `${productId}::${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/** Índice de la primera variante con stock (o 0). -1 si el producto es simple. */
export function defaultVariantIndex(product: VariantProduct): number {
  if (!hasVariants(product)) return -1;
  const idx = product.variants!.findIndex((v) => v.stock > 0);
  return idx === -1 ? 0 : idx;
}

/** Resuelve la variante activa de un producto a valores listos para renderizar. */
export function resolveVariant(product: VariantProduct, index?: number): ResolvedVariant {
  if (!hasVariants(product)) {
    const stock = product.stock ?? (product.inStock === false ? 0 : DEFAULT_STOCK);
    return {
      index: -1,
      label: null,
      cartId: product.id,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      discount: discountPercent(product.price, product.compareAtPrice),
      stock,
      stockLabel: stockLabel(stock),
      inStock: stock > 0,
      bonusKg: product.bonusKg ?? 0,
      image: null,
    };
  }

  const variants = product.variants!;
  const usable = index != null && index >= 0 && index < variants.length ? index : defaultVariantIndex(product);
  const variant = variants[usable];
  const compareAtPrice = variant.compareAtPrice ?? null;
  return {
    index: usable,
    label: variant.label,
    cartId: variantCartId(product.id, variant.label),
    price: variant.price,
    compareAtPrice,
    discount: discountPercent(variant.price, variant.compareAtPrice),
    stock: variant.stock,
    stockLabel: stockLabel(variant.stock),
    inStock: variant.stock > 0,
    bonusKg: variant.bonusKg ?? product.bonusKg ?? 0,
    image: variant.image ?? null,
  };
}
