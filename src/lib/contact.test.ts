import { describe, it, expect } from 'vitest';
import { mailto, socialUrl, socialLinks } from './contact';

describe('mailto', () => {
  it('arma el mailto con el email', () => {
    expect(mailto('hola@lewoskishop.com.ar')).toBe('mailto:hola@lewoskishop.com.ar');
  });

  it('no duplica el prefijo mailto:', () => {
    expect(mailto('mailto:hola@lewoskishop.com.ar')).toBe('mailto:hola@lewoskishop.com.ar');
  });

  it('devuelve null si el email está vacío', () => {
    expect(mailto('')).toBeNull();
    expect(mailto('   ')).toBeNull();
  });
});

describe('socialUrl', () => {
  it('arma la URL con el usuario pelado', () => {
    expect(socialUrl('instagram', 'lewoskishop')).toBe('https://www.instagram.com/lewoskishop');
    expect(socialUrl('facebook', 'lewoskishop')).toBe('https://www.facebook.com/lewoskishop');
  });

  it('acepta el usuario con arroba', () => {
    expect(socialUrl('instagram', '@lewoskishop')).toBe('https://www.instagram.com/lewoskishop');
  });

  it('respeta la URL completa si ya es una URL', () => {
    expect(socialUrl('instagram', 'https://instagram.com/lewoskishop')).toBe(
      'https://instagram.com/lewoskishop',
    );
    expect(socialUrl('facebook', 'http://fb.com/lewoskishop')).toBe('http://fb.com/lewoskishop');
  });

  it('devuelve null si el campo está vacío', () => {
    expect(socialUrl('instagram', '')).toBeNull();
    expect(socialUrl('facebook', '   ')).toBeNull();
    expect(socialUrl('instagram', '@')).toBeNull();
  });
});

describe('socialLinks', () => {
  it('devuelve sólo las redes que están cargadas', () => {
    expect(socialLinks({ instagram: 'lewoskishop', facebook: '' })).toEqual([
      {
        network: 'instagram',
        label: 'Instagram',
        href: 'https://www.instagram.com/lewoskishop',
      },
    ]);
  });

  it('sin redes cargadas no hay links', () => {
    expect(socialLinks({ instagram: '', facebook: '' })).toEqual([]);
  });
});
