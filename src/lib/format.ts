import { STORE } from '../config';

const formatter = new Intl.NumberFormat(STORE.locale, {
  style: 'currency',
  currency: STORE.currency,
  maximumFractionDigits: 0,
});

/** Formatea un número como precio según la configuración de la tienda. */
export function formatPrice(value: number): string {
  return formatter.format(value);
}
