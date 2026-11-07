import { describe, it, expect } from 'vitest';
import { storeSchema, assertStoreSettings } from './store-schema';
import store from '../content/settings/store.json';

describe('ajustes de la tienda', () => {
  it('src/content/settings/store.json es válido', () => {
    const result = storeSchema.safeParse(store);
    if (!result.success) {
      // Muestra el detalle del error para que sea fácil de corregir.
      throw new Error(`Ajustes inválidos: ${JSON.stringify(result.error.issues, null, 2)}`);
    }
    expect(result.success).toBe(true);
  });

  it('el teléfono de WhatsApp no tiene símbolos', () => {
    expect(store.whatsappPhone).toMatch(/^\d+$/);
  });

  it('rechaza un teléfono con "+" o espacios', () => {
    expect(storeSchema.safeParse({ ...store, whatsappPhone: '+54 9 261' }).success).toBe(false);
  });

  it('los campos que el panel deja vacíos pueden no estar en el JSON', () => {
    // El panel guarda con "omit_empty_optional_fields": si el email está vacío
    // la clave directamente no se escribe. Eso no puede romper el build.
    const sinOpcionales = {
      ...store,
      email: undefined,
      instagram: undefined,
      facebook: undefined,
      discountCodes: undefined,
    };

    const result = storeSchema.safeParse(sinOpcionales);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('');
      expect(result.data.instagram).toBe('');
      expect(result.data.facebook).toBe('');
      expect(result.data.discountCodes).toEqual([]);
    }
  });
});

describe('assertStoreSettings', () => {
  it('no tira con los ajustes buenos', () => {
    expect(() => assertStoreSettings(store)).not.toThrow();
  });

  it('frena la compilación y explica qué corregir', () => {
    expect(() => assertStoreSettings({ ...store, whatsappPhone: '549 261' })).toThrow(
      /whatsappPhone/,
    );
    expect(() => assertStoreSettings({ ...store, currency: 'AR' })).toThrow(/currency/);
  });

  it('el error menciona el panel', () => {
    expect(() => assertStoreSettings({ ...store, city: '' })).not.toThrow();
    expect(() => assertStoreSettings({ ...store, name: '' })).toThrow(/\/admin/);
  });
});
