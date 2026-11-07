import { z } from 'astro/zod';

/**
 * Esquema de los "Ajustes de la tienda" (src/content/settings/store.json).
 *
 * Este archivo lo edita el panel de administración (/admin → Ajustes de la
 * tienda). El esquema se valida en el build (src/config.ts), así un dato
 * mal cargado rompe la compilación con un mensaje claro en vez de publicar
 * un sitio roto; los tests lo usan para el mismo chequeo.
 *
 * Ojo: el panel guarda con "omit_empty_optional_fields", así que los campos
 * opcionales que quedan vacíos desaparecen del JSON. Por eso los de
 * contacto (email, instagram, facebook) y la lista de códigos de descuento
 * tienen valor por defecto: que no estén es lo mismo que estar vacíos.
 */
export const storeSchema = z.object({
  /** Nombre que aparece en el header, footer y mensajes de WhatsApp. */
  name: z.string().min(1),
  /** Frase corta que aparece bajo el nombre / en el hero. */
  tagline: z.string(),
  /** Descripción usada en metadatos SEO. */
  description: z.string(),
  /** Ciudad que se muestra en el pill del header. */
  city: z.string(),
  /** Dirección del depósito (retiro en persona). */
  address: z.string(),
  /** WhatsApp: código de país + área + número, sin "+", espacios ni guiones. */
  whatsappPhone: z.string().regex(/^\d{8,15}$/, 'whatsappPhone debe contener solo números (8 a 15 dígitos)'),
  /** Encabezado del mensaje de WhatsApp. {store} se reemplaza por el nombre. */
  whatsappGreeting: z.string(),
  /** Moneda por defecto (código ISO 4217). */
  currency: z.string().length(3),
  /** Locale para formatear precios y fechas. */
  locale: z.string().min(2),
  /** Email de contacto. Vacío = se oculta. */
  email: z.string().default(''),
  /** Redes sociales. Vacío = se ocultan. */
  instagram: z.string().default(''),
  facebook: z.string().default(''),
  /** Nota de envío que aparece en el carrito. */
  shippingNote: z.string(),
  /** Códigos de descuento válidos. */
  discountCodes: z
    .array(
      z.object({
        code: z.string().min(1),
        rate: z.number().nonnegative(),
      }),
    )
    .default([]),
});

export type StoreSettings = z.infer<typeof storeSchema>;

/** Los mismos campos, pero con los opcionales permitidos (así están en el JSON). */
export type StoreSettingsInput = z.input<typeof storeSchema>;

/**
 * Valida los ajustes de la tienda y frena la compilación si algo está mal.
 *
 * Se llama desde src/content.config.ts, que Astro carga siempre al compilar:
 * si el panel dejó un dato inválido (un WhatsApp con "+", una moneda de dos
 * letras, un teléfono muy corto), el build se frena con el detalle de qué
 * corregir en vez de publicar un sitio roto.
 */
export function assertStoreSettings(data: unknown): void {
  const result = storeSchema.safeParse(data);
  if (result.success) return;

  const details = result.error.issues
    .map((issue) => `  · ${issue.path.join('.') || '(archivo)'}: ${issue.message}`)
    .join('\n');

  throw new Error(
    [
      'src/content/settings/store.json tiene datos inválidos:',
      details,
      '',
      'Corrigilos en el panel: /admin → Ajustes de la tienda.',
    ].join('\n'),
  );
}
