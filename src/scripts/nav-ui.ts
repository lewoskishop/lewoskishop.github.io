import { searchProducts, type CatalogProduct } from '../lib/catalog';
import { formatPrice } from '../lib/format';

interface SearchEntry extends CatalogProduct {
  image: string;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initSearch(): void {
  const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-search]'));
  const indexEl = document.querySelector<HTMLScriptElement>('[data-search-index]');
  if (roots.length === 0 || !indexEl) return;

  let index: SearchEntry[] = [];
  try {
    index = JSON.parse(indexEl.textContent ?? '[]') as SearchEntry[];
  } catch {
    index = [];
  }

  roots.forEach((root) => {
    const input = root.querySelector<HTMLInputElement>('[data-search-input]');
    const panel = root.querySelector<HTMLElement>('[data-search-results]');
    if (!input || !panel) return;

    let active = -1;

    function itemHTML(p: SearchEntry): string {
      const cat = (Array.isArray(p.categories) && p.categories[0]) || p.category || '';
      return `<a href="/productos/${esc(p.id)}" class="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted-bg" data-search-item>
      <img src="${esc(p.image)}" alt="" width="40" height="40" class="h-10 w-10 shrink-0 rounded-lg border border-border object-cover" loading="lazy" />
      <span class="min-w-0 flex-1">
        <span class="block text-[0.7rem] font-semibold uppercase tracking-wide text-muted">${esc(cat)}</span>
        <span class="block truncate text-sm font-semibold">${esc(p.name)}</span>
      </span>
      <span class="shrink-0 text-sm font-bold tabular-nums">${formatPrice(p.price)}</span>
    </a>`;
    }

    function close(): void {
      panel.classList.add('hidden');
      active = -1;
    }

    function render(): void {
      const q = input.value.trim();
      if (!q) {
        close();
        return;
      }
      const results = searchProducts(index, q, 6);
      panel.innerHTML =
        results.length > 0
          ? results.map(itemHTML).join('')
          : `<p class="px-3 py-6 text-center text-sm text-muted">No encontramos productos para "${esc(q)}".</p>`;
      panel.classList.remove('hidden');
      active = -1;
    }

    function items(): HTMLElement[] {
      return Array.from(panel.querySelectorAll<HTMLElement>('[data-search-item]'));
    }

    let timer: number | undefined;
    input.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(render, 120);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) render();
    });

    input.addEventListener('keydown', (e) => {
      const list = items();
      if (e.key === 'Escape') {
        input.value = '';
        close();
        input.blur();
        return;
      }
      if (e.key === 'ArrowDown' && list.length > 0) {
        e.preventDefault();
        active = (active + 1) % list.length;
      } else if (e.key === 'ArrowUp' && list.length > 0) {
        e.preventDefault();
        active = (active - 1 + list.length) % list.length;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = list[active] ?? list[0];
        if (target) (target as HTMLAnchorElement).click();
        return;
      } else {
        return;
      }
      list.forEach((el, i) => el.classList.toggle('bg-muted-bg', i === active));
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target as Node)) close();
    });
  });
}

export function initMobileMenu(): void {
  const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
  const overlay = document.querySelector<HTMLElement>('[data-menu-overlay]');
  if (!menu) return;

  function open(): void {
    menu!.classList.remove('-translate-x-full');
    if (overlay) {
      overlay.classList.remove('pointer-events-none', 'opacity-0');
      overlay.classList.add('opacity-100');
    }
    document.body.style.overflow = 'hidden';
  }

  function close(): void {
    menu!.classList.add('-translate-x-full');
    if (overlay) {
      overlay.classList.add('pointer-events-none', 'opacity-0');
      overlay.classList.remove('opacity-100');
    }
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-menu-open]').forEach((el) => el.addEventListener('click', open));
  document.querySelectorAll('[data-menu-close]').forEach((el) => el.addEventListener('click', close));
  overlay?.addEventListener('click', close);
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}
