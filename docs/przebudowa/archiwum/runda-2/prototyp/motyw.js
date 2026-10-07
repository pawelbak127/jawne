// Prototyp: wybór motywu (?k=…), jasny/ciemny, podświetlenie działu w spisie
// i „Jak myślisz, ile…?” (F10). Strona działa bez tego pliku: fundament bez motywu,
// jasny albo za systemem, a „Jak myślisz” od razu pokazuje liczbę.
(function () {
  var MOTYWY = [
    ['a', 'A „Wypis z rejestru”'],
    ['b', 'B „Monitor”'],
    ['c', 'C „Tablica”'],
    ['d', 'D „Kartoteka”'],
    ['e', 'E „Rocznik”'],
    ['f', 'F „Reportaż”'],
    ['g', 'G „Pulpit”'],
    ['h', 'H „Atlas”'],
    ['i', 'I „Plakat”'],
    ['j', 'J „Usługa publiczna”'],
  ];
  var czytaj = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var zapisz = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  var m = czytaj('motyw');
  if (m) document.documentElement.dataset.motyw = m;

  // ?k=b w adresie wygrywa i zostaje zapamiętany; inaczej ostatni wybór; domyślnie A.
  var zAdresu = new URLSearchParams(location.search).get('k');
  var k = zAdresu || czytaj('kierunek') || 'a';
  var wpis = MOTYWY.filter(function (x) { return x[0] === k; })[0] || MOTYWY[0];
  k = wpis[0];
  if (zAdresu) zapisz('kierunek', k);
  // document.write w <head>: arkusz wchodzi przed pierwszym malowaniem, bez mignięcia fundamentu.
  document.write('<link rel="stylesheet" href="skora-' + k + '.css">');

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
    var naglowek = document.querySelector('.naglowek');
    if (naglowek) {
      var pasek = document.createElement('div');
      pasek.className = 'kierunki-pasek';
      var plik = location.pathname.split('/').pop() || 'index.html';
      pasek.innerHTML = '<div class="obszar"><b>Motyw:</b> ' + MOTYWY.map(function (x) {
        return '<a href="' + plik + '?k=' + x[0] + location.hash + '"' + (x[0] === k ? ' aria-current="page"' : '') + '>' + x[1] + '</a>';
      }).join(' · ') + ' · <a href="kierunki.html">porównanie</a></div>';
      naglowek.parentNode.insertBefore(pasek, naglowek);
    }

    // „Jak myślisz, ile…?” — pytanie zamiast liczby; „Pomiń” pokazuje ją od razu.
    document.querySelectorAll('.zgadnij').forEach(function (z) {
      var pytanie = z.querySelector('.pytanie'), odp = z.querySelector('[data-prawda]');
      var suwak = z.querySelector('input[type=range]'), wyj = z.querySelector('output');
      var prawda = parseFloat(z.dataset.prawdaWartosc), jedn = z.dataset.jednostka || '';
      var fmt = function (v) { return String(v).replace('.', ',') + jedn; };
      pytanie.hidden = false; odp.hidden = true;
      suwak.addEventListener('input', function () { wyj.textContent = fmt(suwak.value); });
      var pokaz = function (zgadl) {
        pytanie.hidden = true; odp.hidden = false;
        if (zgadl) {
          var r = Math.round((parseFloat(suwak.value) - prawda) * 10) / 10;
          var ile = String(Math.abs(r)).replace('.', ',') + (jedn === '%' ? ' pkt proc.' : '');
          odp.querySelector('.roznica').textContent = 'Twoja odpowiedź: ' + fmt(suwak.value) +
            (r === 0 ? ' — dokładnie.' : r > 0 ? ' — o ' + ile + ' za dużo.' : ' — o ' + ile + ' za mało.');
        }
      };
      z.querySelector('[data-sprawdz]').addEventListener('click', function () { pokaz(true); });
      z.querySelector('[data-pomin]').addEventListener('click', function () { pokaz(false); });
    });

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
