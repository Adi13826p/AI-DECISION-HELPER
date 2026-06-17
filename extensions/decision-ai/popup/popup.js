document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.feature-card');

  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      const href = card.getAttribute('href');
      if (!href) return;

      e.preventDefault();

      chrome.tabs.create({ url: chrome.runtime.getURL(href.replace('../', '')) });
    });
  });
});
