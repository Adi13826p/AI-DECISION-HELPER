/**
 * DecisionAI — Content Script
 *
 * Runs on every page. Responsible for:
 *  - Extracting structured product data from the DOM
 *  - Listening for messages from the extension popup/views
 *  - Injecting optional in-page UI overlays (future)
 *
 * This script is the data layer — it knows about the page DOM.
 * The AI analysis layer lives in lib/api.js (background/popup side).
 */

(function () {
  'use strict';

  // Prevent double-injection
  if (window.__decisionAiInjected) return;
  window.__decisionAiInjected = true;

  // ── Signal ready ──────────────────────────────────────────────────────────

  chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).catch(() => {});

  // ── Product data extraction ───────────────────────────────────────────────

  /**
   * Extracts structured product data from the current page.
   * Supports: Amazon, generic e-commerce, Schema.org microdata.
   */
  function extractProductData() {
    const data = {
      url:         window.location.href,
      domain:      window.location.hostname.replace('www.', ''),
      title:       document.title,
      price:       null,
      currency:    null,
      rating:      null,
      reviewCount: null,
      description: null,
      brand:       null,
      category:    null,
      inStock:     null,
      images:      [],
      breadcrumbs: []
    };

    // ── Schema.org microdata ──
    trySchemaOrg(data);

    // ── Open Graph ──
    if (!data.title || data.title === document.title) {
      data.ogTitle = getMeta('og:title');
    }
    data.ogImage = getMeta('og:image');

    // ── Price ──
    if (!data.price) {
      data.price =
        getContent('[itemprop="price"]') ||
        getText('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice') ||
        getText('.price, .product-price, [data-price], .offer-price, .sale-price, .js-price') ||
        null;
    }

    // ── Rating ──
    if (!data.rating) {
      data.rating =
        getContent('[itemprop="ratingValue"]') ||
        getAttr('[data-rating]', 'data-rating') ||
        getText('.a-icon-alt')?.match(/[\d.]+/)?.[0] ||
        null;
    }

    // ── Review count ──
    if (!data.reviewCount) {
      data.reviewCount =
        getContent('[itemprop="reviewCount"]') ||
        getText('[data-hook="total-review-count"], #acrCustomerReviewText')?.replace(/[^0-9,]/g, '') ||
        null;
    }

    // ── Description ──
    if (!data.description) {
      data.description =
        getMeta('description') ||
        getContent('[itemprop="description"]') ||
        getText('.product-description, #productDescription, .overview')?.substring(0, 600) ||
        null;
    }

    // ── Brand ──
    if (!data.brand) {
      data.brand =
        getContent('[itemprop="brand"] [itemprop="name"], [itemprop="brand"]') ||
        getText('.brand, .product-brand, [data-brand]') ||
        null;
    }

    // ── Images ──
    const imgs = document.querySelectorAll('[itemprop="image"], .product-image img, #imgBlkFront, #landingImage');
    imgs.forEach(img => {
      const src = img.src || img.getAttribute('data-src');
      if (src && !data.images.includes(src)) data.images.push(src);
    });

    // ── Breadcrumbs (category inference) ──
    const bc = document.querySelectorAll('[aria-label="breadcrumb"] a, .breadcrumb a, nav[class*="breadcrumb"] a');
    bc.forEach(el => data.breadcrumbs.push(el.textContent.trim()));

    // ── In stock ──
    const stockEl = document.querySelector('[itemprop="availability"]');
    if (stockEl) {
      data.inStock = (stockEl.content || stockEl.textContent || '').toLowerCase().includes('instock');
    }

    // ── Page text (for AI context) ──
    data.bodyText = document.body.innerText?.substring(0, 3000) || '';

    return data;
  }

  // ── Schema.org microdata parser ───────────────────────────────────────────

  function trySchemaOrg(data) {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const json = JSON.parse(script.textContent);
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          const type = item['@type'];
          if (type === 'Product' || type === 'https://schema.org/Product') {
            data.title       = item.name       || data.title;
            data.description = item.description || data.description;
            data.brand       = item.brand?.name || data.brand;

            const offer = item.offers || item.Offers;
            if (offer) {
              const first = Array.isArray(offer) ? offer[0] : offer;
              data.price    = first.price ? `${first.priceCurrency || ''}${first.price}` : data.price;
              data.currency = first.priceCurrency || null;
              data.inStock  = (first.availability || '').toLowerCase().includes('instock');
            }

            const agg = item.aggregateRating;
            if (agg) {
              data.rating      = agg.ratingValue || data.rating;
              data.reviewCount = agg.reviewCount || agg.ratingCount || data.reviewCount;
            }
            return;
          }
        }
      }
    } catch {
      // Schema.org parsing failed; fall back to DOM selectors
    }
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────

  function getText(selector) {
    return document.querySelector(selector)?.textContent?.trim() || null;
  }

  function getContent(selector) {
    const el = document.querySelector(selector);
    return el?.content?.trim() || el?.getAttribute('content')?.trim() || null;
  }

  function getAttr(selector, attr) {
    return document.querySelector(selector)?.getAttribute(attr)?.trim() || null;
  }

  function getMeta(name) {
    return document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
      ?.getAttribute('content')?.trim() || null;
  }

  // ── Message listener ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {

      case 'EXTRACT_PRODUCT_DATA':
        sendResponse({ success: true, data: extractProductData() });
        return false;

      case 'GET_PAGE_META':
        sendResponse({
          success: true,
          url:     window.location.href,
          title:   document.title,
          favicon: document.querySelector('link[rel~="icon"]')?.href || null
        });
        return false;

      default:
        return false;
    }
  });

})();
