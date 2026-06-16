/* ============================================================
   COSTITO — Calculadoras Premium
   Importación (landed cost), Compra mixta y Servicios.

   Cada panel muestra:
     - un GATE (candado + upsell a WhatsApp) si el usuario no es Premium
     - la calculadora real si lo es
   El estado Premium hoy es un flag en localStorage (costito_premium).
   Más adelante lo va a setear el backend (Supabase + Mercado Pago).

   Para probar en desarrollo:  Costito.setPremium(true)   en la consola.
   ============================================================ */

(function () {
  const C = window.Costito;
  const D = C.D, Calc = C.Calc;
  const $ = (id) => document.getElementById(id);
  const esc = C.escapeHtml;
  const money = C.money;

  // ---------- GATE (compartido) ----------
  const ICO = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.3A10 10 0 1 0 12 2z"/></svg>',
  };
  function gateHTML(g) {
    return '<div class="card"><div class="gate">' +
      '<div class="lock-ico">' + ICO.lock + '</div>' +
      '<h3>' + g.titulo + '</h3><p>' + g.desc + '</p>' +
      '<div class="feat">' + g.feats.map((f) => '<div class="f">' + ICO.check + f + '</div>').join('') + '</div>' +
      '<a class="wa" href="' + C.waUrl() + '" target="_blank" rel="noopener">' + ICO.wa + ' Activar Premium por WhatsApp</a>' +
      // Desbloqueo de demo (temporal, pre-launch). Se reemplaza por el gating real con el backend.
      '<button class="gate-demo" type="button">Ver cómo funciona (demo)</button>' +
      '</div></div>';
  }

  // Cinta que aclara que se está viendo el demo, con botón para volver a bloquear.
  function demoRibbon() {
    return '<div class="demo-ribbon"><span><b>Modo demo Premium.</b> Así lo verían tus clientes con la suscripción activa.</span>' +
      '<button class="demo-lock" type="button">Bloquear</button></div>';
  }

  // Encabezado de card reutilizable
  function cardHead(titulo, sub) {
    return '<div class="card-h"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h12"/></svg></span>' +
      '<div><h3>' + titulo + '</h3><p>' + sub + '</p></div></div>';
  }

  // ============================================================
  // 1) IMPORTACIÓN (landed cost)
  // ============================================================
  let impItems = D.importItemsDefault.map((it) => ({ ...it }));

  function buildImport() {
    if (!C.isPremium()) {
      C.setHTML($('body-import'), gateHTML({
        titulo: 'Calculá tu costo de importación',
        desc: 'Sumá FOB, flete, aranceles, tasa estadística, IVA aduana y despachante para saber el costo real puesto en tu depósito.',
        feats: ['FOB + flete internacional', 'Aranceles y tasa estadística', 'IVA aduana y despachante', 'Costo unitario final'],
      }));
      return;
    }
    C.setHTML($('body-import'),
      demoRibbon() +
      '<div class="card">' + cardHead('Lo que pagás en origen', 'FOB y cantidad') +
        '<div class="row2">' +
          '<div class="field"><label>FOB por unidad</label><div class="in"><span class="pre">' + C.symbol() + '</span><input type="number" id="imp-fob" value="10000" min="0" inputmode="decimal" /></div></div>' +
          '<div class="field"><label>Cantidad</label><div class="in"><input type="number" id="imp-qty" value="100" min="1" inputmode="numeric" /><span class="suf">u.</span></div></div>' +
        '</div></div>' +
      '<div class="card">' + cardHead('Costos del proceso', 'Editá, sumá o borrá lo que quieras') +
        '<div id="imp-items"></div>' +
        '<button class="btn-add" id="imp-add" style="background:transparent;color:var(--verde);border:1.5px dashed var(--linea);box-shadow:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Agregar costo</button>' +
      '</div>' +
      '<div class="card"><div class="break">' +
        '<div class="li"><span class="k">FOB total</span><span class="v" id="imp-fobtotal">—</span></div>' +
        '<div class="li minus"><span class="k">Cargos (flete, aduana, etc.)</span><span class="v" id="imp-cargos">—</span></div>' +
        '<div class="li tot"><span class="k">Costo total puesto en depósito</span><span class="v" id="imp-total">—</span></div>' +
      '</div></div>' +
      '<div class="tag-wrap"><div class="tag">' +
        '<div class="lbl">' + ICO.check + ' Costo por unidad</div>' +
        '<div class="big"><span class="c">' + C.symbol() + '</span><span id="imp-unit">—</span></div>' +
        '<div class="note">Ya con todos los cargos de importación adentro.</div>' +
      '</div></div>' +
      '<button class="btn-add" id="imp-usar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg> Usar este costo en la calculadora</button>'
    );
    renderImpItems();
    recalcImport();
  }

  function renderImpItems() {
    C.setHTML($('imp-items'), impItems.map((it, i) =>
      '<div class="imp-row">' +
        '<input class="in-bare imp-label" data-i="' + i + '" value="' + esc(it.label) + '" />' +
        '<select class="in-bare imp-tipo" data-i="' + i + '">' +
          '<option value="pct"' + (it.tipo === 'pct' ? ' selected' : '') + '>% FOB</option>' +
          '<option value="fijo"' + (it.tipo === 'fijo' ? ' selected' : '') + '>$ fijo</option>' +
        '</select>' +
        '<input class="in-bare imp-valor" type="number" data-i="' + i + '" value="' + (Number(it.valor) || 0) + '" min="0" inputmode="decimal" />' +
        '<button class="imp-del" data-i="' + i + '" aria-label="Borrar">×</button>' +
      '</div>'
    ).join(''));
  }

  function recalcImport() {
    const r = Calc.landedCost({ fob: $('imp-fob').value, qty: $('imp-qty').value, items: impItems });
    $('imp-fobtotal').textContent = money(r.fobTotal);
    $('imp-cargos').textContent = '+ ' + money(r.cargos);
    $('imp-total').textContent = money(r.total);
    $('imp-unit').textContent = C.fmt(C.conv(r.unitario));
    $('body-import')._unit = r.unitario; // guardamos para "usar en calc"
  }

  // Delegación de eventos (se ata una sola vez; sobrevive a los rebuilds)
  $('body-import').addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'imp-fob' || t.id === 'imp-qty') return recalcImport();
    if (t.classList.contains('imp-valor')) { impItems[+t.dataset.i].valor = t.value; recalcImport(); }
    if (t.classList.contains('imp-label')) { impItems[+t.dataset.i].label = t.value; }
  });
  $('body-import').addEventListener('change', (e) => {
    if (e.target.classList.contains('imp-tipo')) { impItems[+e.target.dataset.i].tipo = e.target.value; recalcImport(); }
  });
  $('body-import').addEventListener('click', (e) => {
    if (e.target.id === 'imp-add' || e.target.closest('#imp-add')) {
      impItems.push({ label: 'Nuevo costo', tipo: 'pct', valor: 0 });
      renderImpItems(); recalcImport();
    }
    if (e.target.classList.contains('imp-del')) {
      impItems.splice(+e.target.dataset.i, 1);
      renderImpItems(); recalcImport();
    }
    if (e.target.id === 'imp-usar' || e.target.closest('#imp-usar')) {
      C.usarComoCosto($('body-import')._unit || 0);
    }
  });

  // ============================================================
  // 2) COMPRA MIXTA (blanco / negro)
  // ============================================================
  function buildMixta() {
    if (!C.isPremium()) {
      C.setHTML($('body-mixta'), gateHTML({
        titulo: 'Compra en blanco y negro',
        desc: 'Calculá el costo promedio real cuando una parte de la compra va con factura y otra no.',
        feats: ['Mezcla blanco / negro', 'Costo promedio ponderado', 'Margen real sobre la mezcla'],
      }));
      return;
    }
    C.setHTML($('body-mixta'),
      demoRibbon() +
      '<div class="card">' + cardHead('La parte en blanco', 'Con factura') +
        '<div class="row2">' +
          '<div class="field"><label>Precio por unidad</label><div class="in"><span class="pre">' + C.symbol() + '</span><input type="number" id="mx-pb" value="8000" min="0" inputmode="decimal" /></div></div>' +
          '<div class="field"><label>Unidades</label><div class="in"><input type="number" id="mx-ub" value="60" min="0" inputmode="numeric" /><span class="suf">u.</span></div></div>' +
        '</div>' +
        '<label class="check"><input type="checkbox" id="mx-iva" checked /><span class="t"><b>Le sumo IVA (21%)</b><span>Si la factura te discrimina IVA y no lo recuperás, dejalo tildado.</span></span></label>' +
      '</div>' +
      '<div class="card">' + cardHead('La parte en negro', 'Sin factura') +
        '<div class="row2">' +
          '<div class="field"><label>Precio por unidad</label><div class="in"><span class="pre">' + C.symbol() + '</span><input type="number" id="mx-pn" value="6500" min="0" inputmode="decimal" /></div></div>' +
          '<div class="field"><label>Unidades</label><div class="in"><input type="number" id="mx-un" value="40" min="0" inputmode="numeric" /><span class="suf">u.</span></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card"><div class="break">' +
        '<div class="li"><span class="k">Total de la compra</span><span class="v" id="mx-total">—</span></div>' +
        '<div class="li"><span class="k">Reparto</span><span class="v" id="mx-reparto">—</span></div>' +
      '</div></div>' +
      '<div class="tag-wrap"><div class="tag">' +
        '<div class="lbl">' + ICO.check + ' Costo promedio por unidad</div>' +
        '<div class="big"><span class="c">' + C.symbol() + '</span><span id="mx-prom">—</span></div>' +
        '<div class="note" id="mx-note">El costo real de cada unidad mezclando las dos compras.</div>' +
      '</div></div>' +
      '<button class="btn-add" id="mx-usar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg> Usar este costo en la calculadora</button>'
    );
    recalcMixta();
  }

  function recalcMixta() {
    const r = Calc.compraMixta({
      precioBlanco: $('mx-pb').value, udsBlanco: $('mx-ub').value,
      ivaBlanco: $('mx-iva').checked ? 21 : 0,
      precioNegro: $('mx-pn').value, udsNegro: $('mx-un').value,
    });
    if (!r.ok) {
      $('mx-prom').textContent = '—';
      $('mx-note').textContent = r.motivo;
      $('mx-total').textContent = $('mx-reparto').textContent = '—';
      $('body-mixta')._costo = 0;
      return;
    }
    $('mx-prom').textContent = C.fmt(C.conv(r.costoPromedio));
    $('mx-note').textContent = 'El costo real de cada unidad mezclando las dos compras.';
    $('mx-total').textContent = money(r.costoTotal);
    $('mx-reparto').textContent = Math.round(r.pctBlanco) + '% blanco · ' + Math.round(r.pctNegro) + '% negro';
    $('body-mixta')._costo = r.costoPromedio;
  }

  $('body-mixta').addEventListener('input', (e) => {
    if (['mx-pb', 'mx-ub', 'mx-pn', 'mx-un'].includes(e.target.id)) recalcMixta();
  });
  $('body-mixta').addEventListener('change', (e) => {
    if (e.target.id === 'mx-iva') recalcMixta();
  });
  $('body-mixta').addEventListener('click', (e) => {
    if (e.target.id === 'mx-usar' || e.target.closest('#mx-usar')) C.usarComoCosto($('body-mixta')._costo || 0);
  });

  // ============================================================
  // 3) SERVICIOS (precio por hora)
  // ============================================================
  function buildServicios() {
    if (!C.isPremium()) {
      C.setHTML($('body-servicios'), gateHTML({
        titulo: 'Poné precio a tu trabajo',
        desc: 'Si cobrás por hora o por proyecto, calculá tu tarifa contemplando monotributo y horas reales.',
        feats: ['Precio por hora', 'Contempla monotributo', 'Horas facturables reales'],
      }));
      return;
    }
    C.setHTML($('body-servicios'),
      demoRibbon() +
      '<div class="card">' + cardHead('Cuánto querés ganar', 'Por mes, limpio') +
        '<div class="field"><label>Ingreso neto que querés al mes</label><div class="in"><span class="pre">' + C.symbol() + '</span><input type="number" id="s-ingreso" value="800000" min="0" inputmode="decimal" /></div></div>' +
        '<div class="field"><label>Monotributo (costo fijo mensual) <span class="help"><span class="q">?</span><span class="tip">Lo que pagás de monotributo por mes. Se reparte entre tus horas para que no te lo comas vos.</span></span></label><div class="in"><span class="pre">' + C.symbol() + '</span><input type="number" id="s-mono" value="35000" min="0" inputmode="decimal" /></div></div>' +
      '</div>' +
      '<div class="card">' + cardHead('Tus horas', 'Las que realmente facturás') +
        '<div class="row2">' +
          '<div class="field"><label>Horas facturables al mes</label><div class="in"><input type="number" id="s-horas" value="80" min="1" inputmode="numeric" /><span class="suf">hs</span></div></div>' +
          '<div class="field"><label>Horas de un proyecto <span class="help"><span class="q">?</span><span class="tip">Opcional. Si querés cotizar un proyecto puntual, poné cuántas horas te lleva.</span></span></label><div class="in"><input type="number" id="s-hproy" value="0" min="0" inputmode="numeric" /><span class="suf">hs</span></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="tag-wrap"><div class="tag">' +
        '<div class="lbl">' + ICO.check + ' Precio por hora</div>' +
        '<div class="big"><span class="c">' + C.symbol() + '</span><span id="s-hora">—</span></div>' +
        '<div class="note" id="s-note">Lo que tenés que cobrar la hora para llegar a tu objetivo.</div>' +
      '</div></div>'
    );
    recalcServicios();
  }

  function recalcServicios() {
    const r = Calc.precioServicio({
      ingresoDeseado: $('s-ingreso').value, horasMes: $('s-horas').value,
      monotributo: $('s-mono').value, horasProyecto: $('s-hproy').value,
    });
    if (!r.ok) {
      $('s-hora').textContent = '—';
      $('s-note').textContent = r.motivo;
      return;
    }
    $('s-hora').textContent = C.fmt(C.conv(r.precioHora));
    $('s-note').textContent = r.precioProyecto != null
      ? 'Ese proyecto te sale ' + money(r.precioProyecto) + ' (' + $('s-hproy').value + ' hs).'
      : 'Lo que tenés que cobrar la hora para llegar a tu objetivo.';
  }

  $('body-servicios').addEventListener('input', (e) => {
    if (['s-ingreso', 's-mono', 's-horas', 's-hproy'].includes(e.target.id)) recalcServicios();
  });

  // ============================================================
  // ORQUESTACIÓN
  // ============================================================
  function buildAll() { buildImport(); buildMixta(); buildServicios(); }
  function recalcAll() {
    if (C.isPremium()) { recalcImport(); recalcMixta(); recalcServicios(); }
  }

  // Botones de demo (pre-launch): desbloquear desde el gate, bloquear desde la cinta.
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('gate-demo')) C.setPremium(true);
    if (e.target.classList.contains('demo-lock')) C.setPremium(false);
  });

  // Al cambiar el estado Premium → reconstruir (gate ↔ calculadora)
  document.addEventListener('costito:premiumchange', buildAll);
  // Al cambiar la moneda → reconstruir para refrescar prefijos y montos
  document.addEventListener('costito:rerender', () => { if (C.isPremium()) buildAll(); });

  buildAll();
})();
