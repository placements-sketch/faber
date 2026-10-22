(function () {
  'use strict';

  // ---- Footer year ----
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // ---- Mobile menu ----
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    var icon = toggle.querySelector('[data-menu-icon]');
    var setOpen = function (open) {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (icon) icon.textContent = open ? 'close' : 'menu';
    };
    toggle.addEventListener('click', function () { setOpen(menu.hidden); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); } });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (e) { if (e.matches) setOpen(false); });
  }

  // ---- Projects page: sector filters ----
  var filterBtns = document.querySelectorAll('.filter-btn');
  if (filterBtns.length) {
    var ACTIVE = ['bg-[#183D32]', 'text-[#F6F3EC]', 'border-[#183D32]', 'shadow-sm'];
    var INACTIVE = ['bg-[#E6E2D6]', 'text-on-surface', 'border-transparent'];
    var cards = document.querySelectorAll('.project-card');
    var rows = document.querySelectorAll('.matrix-row');
    var emptyState = document.getElementById('empty-state');
    var emptyRow = document.getElementById('matrix-empty-row');
    var sumEl = document.getElementById('matrix-summary-sum');
    var sumLabel = document.getElementById('matrix-summary-label');
    var fmt = function (n) { return 'KES ' + n.toLocaleString('en-KE') + '/='; };

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-filter');

        filterBtns.forEach(function (b) {
          var on = b === btn;
          b.setAttribute('aria-pressed', String(on));
          ACTIVE.forEach(function (c) { b.classList.toggle(c, on); });
          INACTIVE.forEach(function (c) { b.classList.toggle(c, !on); });
        });

        var visible = 0;
        cards.forEach(function (card) {
          var show = filter === 'all' || card.getAttribute('data-sector') === filter;
          if (show) {
            visible++;
            card.style.display = '';
            requestAnimationFrame(function () { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; });
          } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(8px)';
            setTimeout(function () { if (card.style.opacity === '0') card.style.display = 'none'; }, 250);
          }
        });
        if (emptyState) {
          emptyState.classList.toggle('hidden', visible > 0);
          emptyState.classList.toggle('flex', visible === 0);
        }

        // Table rows + running total (computed from the rows, so it never goes stale)
        var total = 0, shownRows = 0;
        rows.forEach(function (row) {
          var show = filter === 'all' || row.getAttribute('data-sector') === filter;
          row.style.display = show ? '' : 'none';
          if (show) { shownRows++; total += Number(row.getAttribute('data-value') || 0); }
        });
        if (emptyRow) emptyRow.classList.toggle('hidden', shownRows > 0);
        if (sumEl) sumEl.textContent = shownRows ? fmt(total) : 'KES 0 / Pending Tenders';
        if (sumLabel) sumLabel.textContent = filter === 'all' ? 'Audited Project Volume' : 'Filtered Sector Volume';
      });
    });
  }

  // ---- Forms (Web3Forms): submit in the background, show inline confirmation ----
  // Without JavaScript the form still posts normally and Web3Forms redirects to thank-you.html.
  document.querySelectorAll('form[data-ajax-form]').forEach(function (form) {
    var btn = form.querySelector('button[type="submit"]');
    var ok = form.querySelector('[data-form-success]');
    var err = form.querySelector('[data-form-error]');
    var original = btn ? btn.innerHTML : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (ok) ok.classList.add('hidden');
      if (err) err.classList.add('hidden');
      if (btn) { btn.disabled = true; btn.classList.add('opacity-75'); btn.textContent = 'Sending…'; }

      var data = new FormData(form);
      data.delete('redirect'); // redirect is only for the no-JavaScript fallback
      fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (!json.success) throw new Error(json.message || 'Submission failed');
          form.reset();
          if (ok) { ok.classList.remove('hidden'); ok.focus(); }
        })
        .catch(function () {
          if (err) { err.classList.remove('hidden'); err.focus(); }
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.classList.remove('opacity-75'); btn.innerHTML = original; }
        });
    });
  });
})();
