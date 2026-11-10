import type { CollectionSlug } from './catalog';

export interface NavLink {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string;
  /** Icono/emoji opcional para destacar el ítem en la barra de navegación. */
  icon?: string;
  /**
   * Grupo del item. Si está definido, sus sub-links se arman con las
   * categorías que el catálogo tiene para ese grupo (ver navWithCatalog).
   */
  grupo?: 'velas' | 'jabones';
  children?: NavLink[];
}

export interface CollectionDef {
  slug: CollectionSlug;
  title: string;
  text: string;
  teaser: string;
  href: string;
  image: string;
}

export const COLLECTIONS: CollectionDef[] = [
  {
    slug: 'novedades',
    title: 'Novedades',
    text: 'Lo último que llegó al depósito de LewoskiShop.',
    teaser: 'Lo último que llegó',
    href: '/collections/novedades',
    image: '/images/hero/hero-esencias.webp',
  },
  {
    slug: 'mas-vendidos',
    title: 'Más vendidos',
    text: 'Los productos que más eligen nuestros clientes.',
    teaser: 'Los que todos nos piden',
    href: '/collections/mas-vendidos',
    image: '/images/hero/hero-moldes.webp',
  },
  {
    slug: 'liquidacion',
    title: 'Liquidación',
    text: 'Ofertas con descuento que no vuelven. Hasta agotar stock.',
    teaser: 'Ofertas que no vuelven',
    href: '/collections/liquidacion',
    image: '/images/hero/hero-velas.webp',
  },
];

/**
 * Menú principal.
 *
 * Los items de grupo ("Velas", "Jabones") no traen sub-links escritos: se
 * arman en runtime con las categorías que hay en el catálogo, así una
 * categoría nueva cargada desde el panel aparece sola en el menú.
 */
export const NAV: NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Especial Navidad', href: '/productos/', icon: '🎄' },
  {
    label: 'Velas',
    href: '/velas',
    grupo: 'velas',
  },
  {
    label: 'Jabones',
    href: '/jabones',
    grupo: 'jabones',
  },
  { label: 'Categorías', href: '/categorias' },
];
