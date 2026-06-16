/* ============================================================
   COSTITO — App (wiring del DOM)
   Conecta los datos (data.js) y las fórmulas (calc.js) con la UI.
   No hay lógica de cálculo acá: solo lectura del DOM, render y eventos.

   Nota de seguridad: el único texto que viene del usuario es el nombre
   del producto, que se sanitiza con escapeHtml() antes de inyectarse.
   El render usa setHTML() (insertAdjacentHTML) con markup confiable
   o ya escapado.
   ============================================================ */

(function () {
  const D = COSTITO_DATA;
  const Calc = CostitoCalc;
  const $ = (id) => document.getElementById(id);
  // Render de markup confiable / ya escapado (limpia y vuelve a insertar)
  const setHTML = (el, html) => { el.textContent = ''; el.insertAdjacentHTML('beforeend', html); };

  // Claves de localStorage
  const LS = { theme: 'costito_theme', cur: 'costito_cur', prods: 'costito_productos' };

  // Estado en memoria
  const state = {
    cur: localStorage.getItem(LS.cur) || 'ARS',
    iva: 21,
    productos: JSON.parse(localStorage.getItem(LS.prods) || '[]'),
  };

  // ---------- Helpers de formato ----------
  const fmt = (n) => Math.round(n).toLocaleString('es-AR');
  const symbol = () => (state.cur === 'ARS' ? '$' : 'US$');
  const conv = (ars) => (state.cur === 'ARS' ? ars : ars / D.cotizacionUSD);
  const money = (ars) => symbol() + fmt(conv(ars));

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ============================================================
  // TEMA (claro / oscuro)
  // ============================================================
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(LS.theme, t);
  }
  (function initTheme() {
    const saved = localStorage.getItem(LS.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  })();
  $('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  // ============================================================
  // NAVEGACIÓN ENTRE TABS
  // ============================================================
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('.tab');
    if (!b) return;
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('on'));
    b.classList.add('on');
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('on'));
    $(b.dataset.tab).classList.add('on');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ============================================================
  // MONEDA
  // ============================================================
  $('cur').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.cur = b.dataset.cur;
    localStorage.setItem(LS.cur, state.cur);
    document.querySelectorAll('#cur button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    $('pre1').textContent = symbol();
    $('pre2').textContent = symbol();
    $('finCur').textContent = symbol();
    calc(); medios(); renderProds();
  });

  // ============================================================
  // POBLAR SELECTORES DESDE LOS DATOS
  // ============================================================
  function buildControls() {
    setHTML($('ivaSeg'), D.ivaProveedor
      .map((o) => '<button data-iva="' + o.v + '"' + (o.v === 21 ? ' class="on"' : '') + '>' + o.label + '</button>')
      .join(''));

    setHTML($('canal'), D.canales
      .map((c) => {
        const label = c.id === 'custom' ? c.name : c.name + ' (' + String(c.com).replace('.', ',') + '%)';
        return '<option value="' + c.id + '"' + (c.id === 'ml-clasica' ? ' selected' : '') + '>' + label + '</option>';
      })
      .join(''));

    setHTML($('iibb'), D.iibb
      .map((o) => '<option value="' + o.v + '"' + (o.v === 3.5 ? ' selected' : '') + '>' + o.label + ' (' + o.prov + ')</option>')
      .join(''));

    $('comDate').textContent = 'Comisiones de ' + D.comisionesActualizadas;
  }

  // ============================================================
  // CALCULADORA PRINCIPAL
  // ============================================================
  function canalActual() {
    return D.canales.find((c) => c.id === $('canal').value) || D.canales[0];
  }
  function comNominal() {
    const c = canalActual();
    return c.id === 'custom' ? parseFloat($('comCustom').value) || 0 : c.com;
  }
  function leerInputs() {
    return {
      costo: $('costo').value,
      ivaProveedor: state.iva,
      margen: $('margen').value,
      comEfectiva: Calc.comisionEfectiva(comNominal(), $('ivaCom').checked),
      iibb: parseFloat($('iibb').value) || 0,
    };
  }

  function calc() {
    const r = Calc.precioPublicado(leerInputs());

    if (!r.ok) {
      $('finVal').textContent = '—';
      setHTML($('ganNote'), escapeHtml(r.motivo));
      ['bCosto', 'bCom', 'bIibb', 'bGan', 'bTotal'].forEach((id) => ($(id).textContent = '—'));
      $('addBtn').disabled = true;
      $('addBtn').style.opacity = .5;
      return;
    }
    $('addBtn').disabled = false;
    $('addBtn').style.opacity = 1;

    $('finVal').textContent = fmt(conv(r.precio));
    setHTML($('ganNote'), 'Con esto ganás <b>' + money(r.ganancia) + ' limpios</b> por unidad.');
    $('bCosto').textContent = money(r.costoConIva);
    $('bCom').textContent = '– ' + money(r.comAmt);
    $('bIibb').textContent = '– ' + money(r.iibbAmt);
    $('bGan').textContent = '+ ' + money(r.ganancia);
    $('bTotal').textContent = money(r.precio);
  }

  // Eventos de la calculadora
  $('ivaSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.iva = parseFloat(b.dataset.iva);
    document.querySelectorAll('#ivaSeg button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    calc();
  });
  $('canal').addEventListener('change', function () {
    const c = canalActual();
    $('customWrap').style.display = c.id === 'custom' ? 'block' : 'none';
    $('ivaComWrap').style.display = (c.com === 0 && c.id !== 'custom') ? 'none' : 'flex';
    $('ivaCom').checked = c.iva;
    calc();
  });
  $('comCustom').addEventListener('input', calc);
  $('ivaCom').addEventListener('change', calc);
  $('iibb').addEventListener('change', calc);
  ['costo', 'margen'].forEach((id) => $(id).addEventListener('input', calc));

  // Copiar precio
  $('copyBtn').addEventListener('click', () => {
    const precio = symbol() + $('finVal').textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(precio).then(
        () => toast('Precio copiado: ' + precio),
        () => toast('No se pudo copiar')
      );
    } else {
      toast('No se pudo copiar');
    }
  });

  // ============================================================
  // MEDIOS DE PAGO
  // ============================================================
  function medios() {
    const base = parseFloat($('base').value) || 0;
    setHTML($('mediosBody'), D.medios
      .map((m) => {
        const res = Calc.precioPorMedio(base, m.c);
        const pct = m.c > 0 ? String(m.c).replace('.', ',') + '%' : '—';
        const reca = res.recargo > 0 ? '<div class="reca">+' + res.recargo.toFixed(1).replace('.', ',') + '%</div>' : '';
        return '<tr class="' + (m.base ? 'base' : '') + '">' +
          '<td><div class="m"><span class="dot" style="background:' + m.col + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + m.ico + '</svg></span>' + m.n + '</div></td>' +
          '<td><span class="pct">' + pct + '</span></td>' +
          '<td><div class="price">' + money(res.precio) + '</div>' + reca + '</td></tr>';
      })
      .join(''));
  }
  $('base').addEventListener('input', medios);

  // ============================================================
  // MIS PRODUCTOS (localStorage)
  // ============================================================
  const TAG_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="var(--verde)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.4"/></svg>';
  const DEL_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';

  function persistProds() {
    localStorage.setItem(LS.prods, JSON.stringify(state.productos));
  }

  function renderProds() {
    const list = $('plist');
    if (!state.productos.length) {
      setHTML(list, '<div class="empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>' +
        '<div>Todavía no guardaste ningún producto.<br/>Calculá un precio y tocá <b>"Guardar en mis productos"</b>.</div></div>');
      return;
    }
    setHTML(list, state.productos.map((p) =>
      '<div class="prod" data-id="' + p.id + '">' +
        '<span class="pic">' + TAG_ICO + '</span>' +
        '<div class="info"><h4>' + escapeHtml(p.nombre) + '</h4><p>' + escapeHtml(p.sub) + '</p></div>' +
        '<div class="pr">' +
          '<div style="text-align:right"><div class="n">' + money(p.precioARS) + '</div><div class="s">a publicar</div></div>' +
          '<button class="del" data-del="' + p.id + '" aria-label="Borrar">' + DEL_ICO + '</button>' +
        '</div></div>'
    ).join(''));
  }

  // Guardar el cálculo actual
  $('addBtn').addEventListener('click', () => {
    const r = Calc.precioPublicado(leerInputs());
    if (!r.ok) return;
    const nombre = (prompt('¿Cómo se llama este producto?', '') || '').trim() || 'Producto sin nombre';
    state.productos.unshift({
      id: Date.now(),
      nombre,
      sub: canalActual().name + ' · margen ' + $('margen').value + '% · ' + new Date().toLocaleDateString('es-AR'),
      precioARS: r.precio,
    });
    persistProds();
    renderProds();
    toast('Guardado en mis productos');
  });

  // Borrar producto (delegación)
  $('plist').addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    state.productos = state.productos.filter((p) => String(p.id) !== b.dataset.del);
    persistProds();
    renderProds();
    toast('Producto borrado');
  });

  // ============================================================
  // EXPORTAR
  // ============================================================
  $('expCsv').addEventListener('click', () => {
    if (!state.productos.length) return toast('No hay productos para exportar');
    const rows = [['Producto', 'Detalle', 'Precio (ARS)']].concat(
      state.productos.map((p) => [p.nombre, p.sub, Math.round(p.precioARS)])
    );
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'costito-productos.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('Excel (CSV) descargado');
  });

  $('expPdf').addEventListener('click', () => {
    if (!state.productos.length) return toast('No hay productos para exportar');
    window.print(); // el navegador permite "Guardar como PDF"
  });

  // ============================================================
  // PREMIUM: WhatsApp + gates
  // ============================================================
  const waUrl = 'https://wa.me/' + D.premium.whatsapp + '?text=' + encodeURIComponent(D.premium.mensaje);
  $('waBtn').href = waUrl;

  const gates = {
    'gate-import': {
      titulo: 'Calculá tu costo de importación',
      desc: 'Sumá FOB, flete, aranceles, tasa estadística, IVA aduana y despachante para saber el costo real puesto en tu depósito.',
      feats: ['FOB + flete internacional', 'Aranceles y tasa estadística', 'IVA aduana y despachante', 'Costo unitario final'],
    },
    'gate-mixta': {
      titulo: 'Compra en blanco y negro',
      desc: 'Calculá el costo promedio real cuando una parte de la compra va con factura y otra no.',
      feats: ['Mezcla blanco / negro', 'Costo promedio ponderado', 'Margen real sobre la mezcla'],
    },
    'gate-servicios': {
      titulo: 'Poné precio a tu trabajo',
      desc: 'Si cobrás por hora o por proyecto, calculá tu tarifa contemplando monotributo y horas reales.',
      feats: ['Precio por hora', 'Contempla monotributo', 'Horas facturables reales'],
    },
  };
  function renderGates() {
    const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    const lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    const wa = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.3A10 10 0 1 0 12 2z"/></svg>';
    Object.keys(gates).forEach((id) => {
      const g = gates[id];
      setHTML($(id), '<div class="gate">' +
        '<div class="lock-ico">' + lock + '</div>' +
        '<h3>' + g.titulo + '</h3>' +
        '<p>' + g.desc + '</p>' +
        '<div class="feat">' + g.feats.map((f) => '<div class="f">' + check + f + '</div>').join('') + '</div>' +
        '<a class="wa" href="' + waUrl + '" target="_blank" rel="noopener" style="background:var(--naranja)">' + wa + ' Activar Premium por WhatsApp</a>' +
        '</div>');
    });
  }

  // ============================================================
  // TOAST
  // ============================================================
  const toastEl = $('toast');
  let toastTimer;
  function toast(msg) {
    $('toastMsg').textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }
  window.costitoToast = toast;

  // ============================================================
  // INIT
  // ============================================================
  buildControls();
  if (state.cur === 'USD') {
    document.querySelectorAll('#cur button').forEach((x) => x.classList.toggle('on', x.dataset.cur === 'USD'));
    $('pre1').textContent = $('pre2').textContent = $('finCur').textContent = symbol();
  }
  calc();
  medios();
  renderProds();
  renderGates();
})();
