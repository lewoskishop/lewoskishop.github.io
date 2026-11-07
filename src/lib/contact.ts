/**
 * Datos de contacto de la tienda (los que se editan en el panel).
 *
 * En "Ajustes de la tienda" el usuario escribe el Instagram y el Facebook
 * como le queda cómodo: la URL completa, el usuario pelado ("maskotita") o
 * con arroba ("@maskotita"). Estas funciones lo normalizan a una URL que se
 * pueda abrir, y devuelven null cuando el campo está vacío (para que el
 * sitio no muestre un link roto).
 */

/** Redes sociales que muestra el pie de página. */
export type SocialNetwork = 'instagram' | 'facebook';

const SOCIAL_BASE: Record<SocialNetwork, string> = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
};

/**
 * Convierte el valor guardado en el panel en una URL.
 * Acepta la URL completa ("https://instagram.com/maskotita") o sólo el
 * usuario ("maskotita" o "@maskotita").
 */
export function socialUrl(network: SocialNetwork, value: string): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;

  const handle = raw.replace(/^@+/, '').trim();
  if (!handle) return null;

  return `${SOCIAL_BASE[network]}${handle}`;
}

/** mailto: del email de contacto. Null si el email está vacío. */
export function mailto(email: string): string | null {
  const raw = (email ?? '').trim();
  if (!raw) return null;
  if (/^mailto:/i.test(raw)) return raw;
  return `mailto:${raw}`;
}

/** Red social con su link, sólo si el panel cargó un valor. */
export interface SocialLink {
  network: SocialNetwork;
  label: string;
  href: string;
}

/** Links de redes sociales que están completos (los vacíos se omiten). */
export function socialLinks(store: {
  instagram: string;
  facebook: string;
}): SocialLink[] {
  const links: SocialLink[] = [];

  const instagram = socialUrl('instagram', store.instagram);
  if (instagram) links.push({ network: 'instagram', label: 'Instagram', href: instagram });

  const facebook = socialUrl('facebook', store.facebook);
  if (facebook) links.push({ network: 'facebook', label: 'Facebook', href: facebook });

  return links;
}
