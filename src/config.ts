/**
 * Configuración global de la tienda.
 *
 * Los datos se editan desde el panel de administración: /admin → "Ajustes de la tienda".
 * El archivo con los valores es src/content/settings/store.json.
 *
 * OJO: este módulo lo importan también los scripts del navegador (el carrito),
 * así que no puede traer Zod (sumaba 85 KB al JS del sitio). Por eso:
 *   - la validación con Zod la hace src/content.config.ts, que Astro carga
 *     siempre al compilar → el build frena si un dato quedó mal;
 *   - acá sólo se leen los valores y se completan los opcionales que el panel
 *     deja fuera cuando están vacíos (email, redes, códigos de descuento).
 */
import storeData from './content/settings/store.json';
import type { StoreSettings, StoreSettingsInput } from './lib/store-schema';

const raw: StoreSettingsInput = storeData;

const { discountCodes = [], ...rest } = raw;

/** Ajustes de la tienda, ya validados en el build. */
export const STORE = {
  ...rest,
  email: rest.email ?? '',
  instagram: rest.instagram ?? '',
  facebook: rest.facebook ?? '',
} satisfies Omit<StoreSettings, 'discountCodes'>;

/** Códigos de descuento válidos (código en mayúsculas → tasa, ej: 0.1 = 10%). */
export const DISCOUNT_CODES: Record<string, number> = Object.fromEntries(
  discountCodes.map(({ code, rate }) => [code.trim().toUpperCase(), rate]),
);

export type Store = typeof STORE;
