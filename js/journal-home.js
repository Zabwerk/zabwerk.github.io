document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    let count = 0;
    document.querySelectorAll('[data-filter]').forEach(item => {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    document.querySelectorAll('#articles .article').forEach(article => {
      article.hidden = Boolean(filter) && !JSON.parse(article.dataset.categories).includes(filter);
      if (!article.hidden) count++;
    });
    document.getElementById('filter-empty').hidden = count !== 0;
  });
});
