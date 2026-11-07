import { STORE } from '../config';
import * as cart from '../lib/cart';
import { computeTotals, buildOrderMessage, codeDiscountRate } from '../lib/pricing';
import { formatPrice } from '../lib/format';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initCart(): void {
  const drawer = document.querySelector<HTMLElement>('[data-cart-drawer]');
  const overlay = document.querySelector<HTMLElement>('[data-drawer-overlay]');
  const itemsEl = document.querySelector<HTMLElement>('[data-cart-items]');
  const emptyEl = document.querySelector<HTMLElement>('[data-cart-empty]');
  const footerEl = document.querySelector<HTMLElement>('[data-cart-footer]');
  const countEls = document.querySelectorAll<HTMLElement>('[data-cart-count]');
  const subtotalEls = document.querySelectorAll<HTMLElement>('[data-cart-subtotal]');
  const totalEls = document.querySelectorAll<HTMLElement>('[data-cart-total]');
  const discountRow = document.querySelector<HTMLElement>('[data-cart-discount-row]');
  const discountEl = document.querySelector<HTMLElement>('[data-cart-discount]');
  const checkoutEl = document.querySelector<HTMLAnchorElement>('[data-cart-checkout]');
  const discountForm = document.querySelector<HTMLFormElement>('[data-discount-form]');
  const discountInput = document.querySelector<HTMLInputElement>('[data-discount-input]');
  const discountMsg = document.querySelector<HTMLElement>('[data-discount-msg]');

  function openDrawer(): void {
    if (!drawer) return;
    drawer.classList.remove('translate-x-full');
    if (overlay) {
      overlay.classList.remove('pointer-events-none', 'opacity-0');
      overlay.classList.add('opacity-100');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer(): void {
    if (!drawer) return;
    drawer.classList.add('translate-x-full');
    if (overlay) {
      overlay.classList.add('pointer-events-none', 'opacity-0');
      overlay.classList.remove('opacity-100');
    }
    document.body.style.overflow = '';
  }

  function render(items: cart.CartItem[]): void {
    const code = cart.getDiscountCode();
    const totals = computeTotals(items, code);
    const total = cart.count(items);

    countEls.forEach((el) => {
      el.textContent = String(total);
      el.classList.toggle('hidden', total === 0);
    });

    subtotalEls.forEach((el) => (el.textContent = formatPrice(totals.subtotal)));
    totalEls.forEach((el) => (el.textContent = formatPrice(totals.total)));
    if (discountRow) discountRow.hidden = totals.discount <= 0;
    if (discountEl) discountEl.textContent = `-${formatPrice(totals.discount)}`;
    if (discountMsg) {
      if (code && codeDiscountRate(code) > 0) {
        discountMsg.className = 'mt-2 text-xs font-semibold text-brand-secondary';
        discountMsg.innerHTML = `Código ${esc(code)} aplicado (-${Math.round(codeDiscountRate(code) * 100)}%). <button type="button" data-discount-remove class="font-semibold underline">Quitar</button>`;
      } else if (code) {
        discountMsg.className = 'mt-2 text-xs font-semibold text-danger';
        discountMsg.textContent = `El código ${code} no es válido.`;
      } else {
        discountMsg.className = 'mt-2 hidden text-xs font-semibold';
        discountMsg.textContent = '';
      }
    }
    if (discountInput) discountInput.value = code ?? '';

    if (checkoutEl) {
      const message = buildOrderMessage(items, totals);
      checkoutEl.href = `https://wa.me/${STORE.whatsappPhone}?text=${encodeURIComponent(message)}`;
    }

    if (!itemsEl) return;

    const hasItems = items.length > 0;
    emptyEl?.classList.toggle('hidden', hasItems);
    itemsEl.classList.toggle('hidden', !hasItems);
    footerEl?.classList.toggle('hidden', !hasItems);

    if (!hasItems) {
      itemsEl.innerHTML = '';
      return;
    }

    itemsEl.innerHTML = items
      .map(
        (item) => `
        <li class="flex gap-4 py-4">
          <img src="${esc(item.image)}" alt="${esc(item.name)}" width="80" height="80"
               class="h-20 w-20 shrink-0 rounded-[var(--radius)] border border-border bg-muted-bg object-cover" loading="lazy" />
          <div class="flex min-w-0 flex-1 flex-col">
            <div class="flex items-start justify-between gap-2">
              <p class="line-clamp-2 text-sm font-semibold text-foreground">${esc(item.name)}</p>
              <button type="button" data-cart-remove="${esc(item.id)}"
                      class="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-muted-bg hover:text-danger"
                      aria-label="Quitar ${esc(item.name)}">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            ${item.variantLabel ? `<p class="mt-0.5 text-xs text-muted">${esc(item.variantLabel)}</p>` : ''}
            <p class="mt-0.5 text-xs text-muted">${formatPrice(item.price)} c/u</p>
            <div class="mt-2 flex items-center justify-between">
              <div class="flex items-center rounded-full border border-border">
                <button type="button" data-cart-dec="${esc(item.id)}"
                        class="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-muted-bg"
                        aria-label="Restar uno">−</button>
                <span class="w-8 text-center text-sm font-semibold tabular-nums">${item.qty}</span>
                <button type="button" data-cart-inc="${esc(item.id)}"
                        class="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-muted-bg"
                        aria-label="Sumar uno">+</button>
              </div>
              <span class="text-sm font-bold tabular-nums">${formatPrice(item.price * item.qty)}</span>
            </div>
          </div>
        </li>`,
      )
      .join('');
  }

  function showToast(message: string): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.className =
      'fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white shadow-lg transition-opacity duration-300 lg:bottom-6';
    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = '1'));
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  document.querySelectorAll('[data-cart-open]').forEach((el) =>
    el.addEventListener('click', openDrawer),
  );
  document.querySelectorAll('[data-cart-close]').forEach((el) =>
    el.addEventListener('click', closeDrawer),
  );
  overlay?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  discountForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = discountInput?.value.trim() ?? '';
    cart.setDiscountCode(value || null);
  });

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    const add = target.closest<HTMLElement>('[data-add-to-cart]');
    if (add) {
      e.preventDefault();
      const { addId, addName, addPrice, addImage, addVariant } = add.dataset;
      if (!addId || !addName || addPrice == null) return;
      const qtyInput = add.dataset.addQtyTarget
        ? document.querySelector<HTMLInputElement>(add.dataset.addQtyTarget)
        : null;
      const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
      cart.add(
        {
          id: addId,
          name: addName,
          price: Number(addPrice),
          image: addImage ?? '',
          variantLabel: addVariant || undefined,
        },
        qty,
      );
      showToast(`Agregado: ${addName}`);
      openDrawer();
      return;
    }

    const remove = target.closest<HTMLElement>('[data-discount-remove]');
    if (remove) {
      cart.setDiscountCode(null);
      return;
    }

    const inc = target.closest<HTMLElement>('[data-cart-inc]');
    if (inc?.dataset.cartInc) {
      const item = cart.getItems().find((i) => i.id === inc.dataset.cartInc);
      if (item) cart.setQty(item.id, item.qty + 1);
      return;
    }

    const dec = target.closest<HTMLElement>('[data-cart-dec]');
    if (dec?.dataset.cartDec) {
      const item = cart.getItems().find((i) => i.id === dec.dataset.cartDec);
      if (item) cart.setQty(item.id, item.qty - 1);
      return;
    }

    const rm = target.closest<HTMLElement>('[data-cart-remove]');
    if (rm?.dataset.cartRemove) {
      cart.remove(rm.dataset.cartRemove);
      return;
    }

    const clear = target.closest<HTMLElement>('[data-cart-clear]');
    if (clear) {
      cart.clear();
    }
  });

  cart.onChange(render);
  cart.refresh();
}
