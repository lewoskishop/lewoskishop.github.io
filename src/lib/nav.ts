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
 * Menú principal basado en categorías (sin grupos).
 */
export const NAV: NavItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'NAVIDAD', href: '/productos/?cat=navidad', icon: '🎄' },
  { label: 'VELAS', href: '/productos/?cat=velas' },
  { label: 'JABONES', href: '/productos/?cat=jabones' },
  { label: 'AROMAS', href: '/productos/?cat=aromas' },
  { label: 'ENVASES VARIOS', href: '/productos/?cat=envases-varios' },
  { label: 'JABÓN', href: '/productos/?cat=jabon' },
  { label: 'DECORACIÓN', href: '/productos/?cat=decoracion' },
  { label: 'COSMÉTICA', href: '/productos/?cat=cosmetica' },
  { label: 'FLORES', href: '/productos/?cat=flores' },
  { label: 'ANIMALES', href: '/productos/?cat=animales' },
  { label: 'MOLDES P YESO, RESINA, CONCRETO', href: '/productos/?cat=moldes-p-yeso-resina-concreto' },
  { label: 'MAS MOLDES', href: '/productos/?cat=mas-moldes' },
  { label: 'Categorías', href: '/categorias' },
];
