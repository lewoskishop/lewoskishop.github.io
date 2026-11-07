import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const store = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

let cart: typeof import('./cart');

beforeAll(async () => {
  vi.stubGlobal('window', { addEventListener: () => {} });
  vi.stubGlobal('localStorage', fakeLocalStorage);
  vi.stubGlobal('document', {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  cart = await import('./cart');
});

beforeEach(() => {
  store.clear();
  cart.clear();
});

const producto = { id: 'royal-canin-medium-3kg', name: 'Royal Canin Medium 3kg', price: 10000, image: '/x.svg', variantLabel: '3kg' };

describe('cart storage', () => {
  it('agrega un producto nuevo', () => {
    cart.add(producto);
    expect(cart.count()).toBe(1);
    expect(cart.getItems()[0]?.id).toBe(producto.id);
  });

  it('suma cantidad si el id ya existe', () => {
    cart.add(producto);
    cart.add(producto, 2);
    expect(cart.count()).toBe(3);
    expect(cart.getItems()).toHaveLength(1);
  });

  it('trata variantes distintas como items distintos', () => {
    cart.add({ ...producto, id: 'royal-canin-medium::1kg', variantLabel: '1kg' });
    cart.add({ ...producto, id: 'royal-canin-medium::3kg', variantLabel: '3kg' });
    expect(cart.getItems()).toHaveLength(2);
    expect(cart.count()).toBe(2);
  });

  it('setQty actualiza la cantidad', () => {
    cart.add(producto);
    cart.setQty(producto.id, 5);
    expect(cart.getItems()[0]?.qty).toBe(5);
  });

  it('setQty 0 elimina el item', () => {
    cart.add(producto);
    cart.setQty(producto.id, 0);
    expect(cart.getItems()).toHaveLength(0);
  });

  it('remove elimina solo el id indicado', () => {
    cart.add(producto);
    cart.add({ ...producto, id: 'otro' });
    cart.remove(producto.id);
    expect(cart.getItems()).toHaveLength(1);
    expect(cart.getItems()[0]?.id).toBe('otro');
  });

  it('clear vacía el carrito', () => {
    cart.add(producto, 4);
    cart.clear();
    expect(cart.getItems()).toHaveLength(0);
    expect(cart.count()).toBe(0);
  });

  it('subtotal y count son puros sobre una lista', () => {
    const items = [
      { id: 'a', name: 'A', price: 1000, image: '', qty: 2 },
      { id: 'b', name: 'B', price: 500, image: '', qty: 3 },
    ];
    expect(cart.subtotal(items)).toBe(3500);
    expect(cart.count(items)).toBe(5);
  });
});

describe('discount code persistence', () => {
  it('arranca sin código', () => {
    expect(cart.getDiscountCode()).toBeNull();
  });

  it('guarda y lee el código', () => {
    cart.setDiscountCode('MASCOTITA10');
    expect(cart.getDiscountCode()).toBe('MASCOTITA10');
  });

  it('limpia el código con null', () => {
    cart.setDiscountCode('MASCOTITA10');
    cart.setDiscountCode(null);
    expect(cart.getDiscountCode()).toBeNull();
  });
});
