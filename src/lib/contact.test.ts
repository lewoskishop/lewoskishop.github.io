import { describe, it, expect } from 'vitest';
import { mailto, socialUrl, socialLinks } from './contact';

describe('mailto', () => {
  it('arma el mailto con el email', () => {
    expect(mailto('hola@maskotita.com.ar')).toBe('mailto:hola@maskotita.com.ar');
  });

  it('no duplica el prefijo mailto:', () => {
    expect(mailto('mailto:hola@maskotita.com.ar')).toBe('mailto:hola@maskotita.com.ar');
  });

  it('devuelve null si el email está vacío', () => {
    expect(mailto('')).toBeNull();
    expect(mailto('   ')).toBeNull();
  });
});

describe('socialUrl', () => {
  it('arma la URL con el usuario pelado', () => {
    expect(socialUrl('instagram', 'maskotita')).toBe('https://www.instagram.com/maskotita');
    expect(socialUrl('facebook', 'maskotita')).toBe('https://www.facebook.com/maskotita');
  });

  it('acepta el usuario con arroba', () => {
    expect(socialUrl('instagram', '@maskotita')).toBe('https://www.instagram.com/maskotita');
  });

  it('respeta la URL completa si ya es una URL', () => {
    expect(socialUrl('instagram', 'https://instagram.com/maskotita')).toBe(
      'https://instagram.com/maskotita',
    );
    expect(socialUrl('facebook', 'http://fb.com/maskotita')).toBe('http://fb.com/maskotita');
  });

  it('devuelve null si el campo está vacío', () => {
    expect(socialUrl('instagram', '')).toBeNull();
    expect(socialUrl('facebook', '   ')).toBeNull();
    expect(socialUrl('instagram', '@')).toBeNull();
  });
});

describe('socialLinks', () => {
  it('devuelve sólo las redes que están cargadas', () => {
    expect(socialLinks({ instagram: 'maskotita', facebook: '' })).toEqual([
      {
        network: 'instagram',
        label: 'Instagram',
        href: 'https://www.instagram.com/maskotita',
      },
    ]);
  });

  it('sin redes cargadas no hay links', () => {
    expect(socialLinks({ instagram: '', facebook: '' })).toEqual([]);
  });
});
