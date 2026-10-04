// Prototyp: motyw jasny/ciemny, wybór kierunku stylu i podświetlenie działu w spisie.
// Strona działa bez tego pliku — wtedy pokazuje kierunek A, motyw idzie za systemem.
(function () {
  var KIERUNKI = [
    ['a', 'A „Wypis z rejestru”', null],
    ['b', 'B „Monitor”', 'skora-b.css'],
    ['c', 'C „Tablica”', 'skora-c.css'],
    ['ab', 'A+B „Wypis z marginesem”', 'skora-ab.css'],
    ['d', 'D „Kartoteka”', 'skora-d.css'],
    ['e', 'E „Rocznik”', 'skora-e.css'],
    ['f', 'F „Reportaż”', 'skora-f.css'],
  ];
  var czytaj = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var zapisz = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  var m = czytaj('motyw');
  if (m) document.documentElement.dataset.motyw = m;

  // Kierunek: ?k=b w adresie wygrywa i zostaje zapamiętany; inaczej ostatni wybór.
  var zAdresu = new URLSearchParams(location.search).get('k');
  var k = zAdresu || czytaj('kierunek') || 'a';
  var wpis = KIERUNKI.filter(function (x) { return x[0] === k; })[0] || KIERUNKI[0];
  k = wpis[0];
  if (zAdresu) zapisz('kierunek', k);
  // document.write w <head>: arkusz wchodzi przed pierwszym malowaniem, bez mignięcia stylu A.
  if (wpis[2]) document.write('<link rel="stylesheet" href="' + wpis[2] + '">');

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-przelacz-motyw]');
    if (!b) return;
    var teraz = document.documentElement.dataset.motyw
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'ciemny' : 'jasny');
    var nowy = teraz === 'ciemny' ? 'jasny' : 'ciemny';
    document.documentElement.dataset.motyw = nowy;
    zapisz('motyw', nowy);
  });

  addEventListener('DOMContentLoaded', function () {
    // Pasek wyboru kierunku nad nagłówkiem — na każdej stronie prototypu.
    var naglowek = document.querySelector('.naglowek');
    if (naglowek) {
      var pasek = document.createElement('div');
      pasek.className = 'kierunki-pasek';
      var plik = location.pathname.split('/').pop() || 'index.html';
      pasek.innerHTML = '<div class="obszar"><b>Kierunek:</b> ' + KIERUNKI.map(function (x) {
        return '<a href="' + plik + '?k=' + x[0] + location.hash + '"' + (x[0] === k ? ' aria-current="page"' : '') + '>' + x[1] + '</a>';
      }).join(' · ') + ' · <a href="kierunki.html">porównanie</a></div>';
      naglowek.parentNode.insertBefore(pasek, naglowek);
    }
    // A+B: „Jak to liczymy” otwarte na marginesie, ale tylko na szerokim ekranie.
    if (k === 'ab' && matchMedia('(min-width: 1200px)').matches) {
      document.querySelectorAll('details.metoda').forEach(function (d) { d.open = true; });
    }

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
