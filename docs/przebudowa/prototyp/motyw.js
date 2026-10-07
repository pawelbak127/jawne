// Prototyp: przełącznik „Wygląd” dla czytelnika (styl strony i jasność), „Jak myślisz, ile…?” (F10)
// i podświetlenie działu w spisie. Strona działa bez tego pliku: styl domyślny, jasność za systemem,
// „Jak myślisz” od razu pokazuje liczbę, a przełącznik jest ukryty.
//
// Dwa style (decyzja Pawła 07.10.2026): „jg” — Standardowy (J „Usługa publiczna”, od 1280 px dodatki
// z G „Pulpit”), domyślny; „a” — Wypis z rejestru. Pozostałe motywy: docs/przebudowa/archiwum/.
(function () {
  var STYLE = { jg: 'Standardowy', a: 'Wypis z rejestru' };
  var DOMYSLNY = 'jg';
  var czytaj = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var zapisz = function (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };

  // Jasność: zapisany wybór albo nic (= za systemem).
  var jasnosc = czytaj('motyw');
  if (jasnosc === 'jasny' || jasnosc === 'ciemny') document.documentElement.dataset.motyw = jasnosc;

  // Styl: ?k= w adresie (odnośniki porównania) wygrywa i zostaje zapamiętany; inaczej ostatni wybór.
  var zAdresu = new URLSearchParams(location.search).get('k');
  var styl = STYLE[zAdresu] ? zAdresu : (STYLE[czytaj('styl')] ? czytaj('styl') : DOMYSLNY);
  if (STYLE[zAdresu]) zapisz('styl', styl);
  document.documentElement.dataset.styl = styl;
  // document.write w <head>: arkusz wchodzi przed pierwszym malowaniem, bez mignięcia fundamentu.
  document.write('<link rel="stylesheet" id="skora" href="skora-' + styl + '.css">');

  addEventListener('DOMContentLoaded', function () {
    // ---- „Wygląd”: styl strony i jasność ----
    var w = document.querySelector('.wyglad');
    if (w) {
      w.hidden = false;
      var zaznacz = function () {
        var j = document.documentElement.dataset.motyw || 'system';
        w.querySelectorAll('input[name=styl]').forEach(function (i) { i.checked = i.value === document.documentElement.dataset.styl; });
        w.querySelectorAll('input[name=jasnosc]').forEach(function (i) { i.checked = i.value === j; });
      };
      zaznacz();
      w.addEventListener('change', function (e) {
        var i = e.target;
        if (i.name === 'styl' && STYLE[i.value]) {
          document.documentElement.dataset.styl = i.value;
          document.getElementById('skora').href = 'skora-' + i.value + '.css';
          zapisz('styl', i.value);
          // adres bez ?k=, żeby odświeżenie nie cofnęło wyboru
          if (zAdresu) history.replaceState(null, '', location.pathname + location.hash);
        }
        if (i.name === 'jasnosc') {
          if (i.value === 'system') { delete document.documentElement.dataset.motyw; zapisz('motyw', null); }
          else { document.documentElement.dataset.motyw = i.value; zapisz('motyw', i.value); }
        }
      });
      // zamknij po kliknięciu poza panelem albo klawiszem Escape
      document.addEventListener('click', function (e) { if (w.open && !w.contains(e.target)) w.open = false; });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && w.open) { w.open = false; w.querySelector('summary').focus(); } });
    }

    // ---- „Jak myślisz, ile…?” — pytanie zamiast liczby; „Pomiń” pokazuje ją od razu ----
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

    // ---- podświetlenie bieżącego działu w spisie ----
    var linki = document.querySelectorAll('.spis a[href^="#"]');
    if (!linki.length || !('IntersectionObserver' in window)) return;
    var mapa = {};
    linki.forEach(function (a) { mapa[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (x) {
        if (!x.isIntersecting) return;
        linki.forEach(function (a) { a.classList.remove('biezacy'); a.removeAttribute('aria-current'); });
        var a = mapa[x.target.id];
        if (a) { a.classList.add('biezacy'); a.setAttribute('aria-current', 'location'); a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(mapa).forEach(function (id) { var el = document.getElementById(id); if (el) obs.observe(el); });
  });
})();
