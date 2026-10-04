// Prototyp: przełącznik motywu i podświetlenie bieżącego działu w spisie.
// Strona działa bez tego pliku — spis to zwykłe kotwice, motyw idzie za systemem.
(function () {
  try { var m = localStorage.getItem('motyw'); if (m) document.documentElement.dataset.motyw = m; } catch (e) {}
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-przelacz-motyw]');
    if (!b) return;
    var teraz = document.documentElement.dataset.motyw
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'ciemny' : 'jasny');
    var nowy = teraz === 'ciemny' ? 'jasny' : 'ciemny';
    document.documentElement.dataset.motyw = nowy;
    try { localStorage.setItem('motyw', nowy); } catch (e) {}
  });
  addEventListener('DOMContentLoaded', function () {
    var linki = document.querySelectorAll('.spis a[href^="#"]');
    if (!linki.length || !('IntersectionObserver' in window)) return;
    var mapa = {};
    linki.forEach(function (a) { mapa[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        if (!w.isIntersecting) return;
        linki.forEach(function (a) { a.classList.remove('biezacy'); a.removeAttribute('aria-current'); });
        var a = mapa[w.target.id];
        if (a) { a.classList.add('biezacy'); a.setAttribute('aria-current', 'location'); a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(mapa).forEach(function (id) { var el = document.getElementById(id); if (el) obs.observe(el); });
  });
})();
