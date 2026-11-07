export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  variantLabel?: string;
}

const STORAGE_KEY = 'patitas.cart.v1';
const DISCOUNT_KEY = 'patitas.discount.v1';
const EVENT = 'cart:change';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function read(): CartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        i && typeof i.id === 'string' && typeof i.price === 'number' && typeof i.qty === 'number',
    );
  } catch {
    return [];
  }
}

function write(items: CartItem[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* almacenamiento lleno o bloqueado: ignoramos */
  }
  emit(items);
}

function emit(items: CartItem[]): void {
  if (!isBrowser()) return;
  document.dispatchEvent(new CustomEvent<CartItem[]>(EVENT, { detail: items }));
}

export function getItems(): CartItem[] {
  return read();
}

export function add(
  product: { id: string; name: string; price: number; image: string; variantLabel?: string },
  qty = 1,
): void {
  const items = read();
  const existing = items.find((i) => i.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({ ...product, qty });
  }
  write(items);
}

export function setQty(id: string, qty: number): void {
  let items = read();
  if (qty <= 0) {
    items = items.filter((i) => i.id !== id);
  } else {
    const item = items.find((i) => i.id === id);
    if (item) item.qty = qty;
  }
  write(items);
}

export function remove(id: string): void {
  write(read().filter((i) => i.id !== id));
}

export function clear(): void {
  write([]);
}

export function count(items: CartItem[] = read()): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function subtotal(items: CartItem[] = read()): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

/** Código de descuento guardado (o null). */
export function getDiscountCode(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(DISCOUNT_KEY);
  } catch {
    return null;
  }
}

/** Guarda (o limpia con null) el código de descuento y notifica el cambio. */
export function setDiscountCode(code: string | null): void {
  if (!isBrowser()) return;
  try {
    if (code) localStorage.setItem(DISCOUNT_KEY, code.trim().toUpperCase());
    else localStorage.removeItem(DISCOUNT_KEY);
  } catch {
    /* ignoramos */
  }
  refresh();
}

/** Suscribe un callback a los cambios del carrito. Devuelve una función para desuscribir. */
export function onChange(cb: (items: CartItem[]) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<CartItem[]>).detail);
  document.addEventListener(EVENT, handler);
  return () => document.removeEventListener(EVENT, handler);
}

/** Re-lee y notifica (útil al cargar la página o al cambiar el descuento). */
export function refresh(): void {
  emit(read());
}

// Sincroniza entre pestañas abiertas.
if (isBrowser()) {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === DISCOUNT_KEY) emit(read());
  });
}
