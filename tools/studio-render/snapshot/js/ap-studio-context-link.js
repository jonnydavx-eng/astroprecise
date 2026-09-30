(() => {
  'use strict'

  const mounts = [...document.querySelectorAll('[data-ap-studio-context]')]
  if (mounts.length === 0) return

  const safeSkus = new Set([
    'natal-sky-print-pack',
    'personal-sky-keepsake',
    'whole-sky-edition',
  ])

  const hideAll = () => {
    for (const mount of mounts) {
      mount.hidden = true
      mount.setAttribute('aria-hidden', 'true')
    }
  }

  const safeCheckout = (value) => {
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && /(^|\.)gumroad\.com$/i.test(url.hostname)
    } catch {
      return false
    }
  }

  hideAll()

  fetch('data/products-v901.json', {
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
  })
    .then((response) => {
      if (!response.ok || (response.url && new URL(response.url).origin !== location.origin)) {
        throw new Error('catalogue unavailable')
      }
      return response.json()
    })
    .then((catalogue) => {
      if (
        catalogue?.schema !== 'astroprecise-studio-catalogue-v901' ||
        catalogue?.state !== 'published' ||
        catalogue?.launchMode !== 'self-only' ||
        catalogue?.platform?.checkoutVerified !== true ||
        !Array.isArray(catalogue.products)
      ) return

      const products = new Map(catalogue.products.map((product) => [product?.sku, product]))
      for (const mount of mounts) {
        const sku = mount.getAttribute('data-product-sku')
        const product = safeSkus.has(sku) ? products.get(sku) : null
        if (
          !product ||
          product.status !== 'live' ||
          !Array.isArray(product.purchaseModes) ||
          product.purchaseModes.length !== 1 ||
          product.purchaseModes[0] !== 'self' ||
          !safeCheckout(product.checkoutUrl)
        ) continue

        const link = mount.querySelector('a[data-ap-studio-context-link]')
        if (!link) continue
        link.href = `shop.html#${encodeURIComponent(sku)}`
        mount.hidden = false
        mount.removeAttribute('aria-hidden')
      }
    })
    .catch(hideAll)
})()
