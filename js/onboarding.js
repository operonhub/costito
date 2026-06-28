/* ============================================================
   COSTITO — Onboarding (primer visita)
   Muestra un modal de 4 pasos al primer usuario.
   ============================================================ */
(function () {
  const LS_KEY = 'costito_onboarded_v1';
  if (localStorage.getItem(LS_KEY)) return;

  const STEPS = [
    {
      ico: '🧮',
      titulo: 'Calculá el precio justo',
      cuerpo: 'Ingresá el costo de tu producto, elegí dónde lo vendés y nosotros le sumamos las comisiones, el IVA y los ingresos brutos. Tu precio en segundos, sin calculadora.',
    },
    {
      ico: '💳',
      titulo: 'Cada medio de pago, su precio',
      cuerpo: 'Sabé exactamente cuánto cobrar en efectivo, débito, Mercado Pago o QR para que siempre te quede lo mismo en el bolsillo.',
    },
    {
      ico: '🍞',
      titulo: 'Producción: el costo real de lo que hacés',
      cuerpo: 'Cargá las materias primas, el rendimiento de cada paquete y los gastos fijos. Costito te calcula el costo por unidad al instante.',
    },
    {
      ico: '📦',
      titulo: 'Guardá tu lista de precios',
      cuerpo: 'Creá una cuenta gratuita para guardar todos tus productos en la nube. Accedé desde el celular o la compu, siempre actualizada.',
    },
  ];

  let step = 0;

  const overlay = document.createElement('div');
  overlay.className = 'onb-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
  document.body.appendChild(overlay);

  function render() {
    const s = STEPS[step];
    const isLast = step === STEPS.length - 1;
    const dots = STEPS.map((_, i) =>
      '<span class="onb-dot' + (i === step ? ' on' : '') + '"></span>'
    ).join('');

    overlay.innerHTML =
      '<div class="onb-card">' +
        '<div class="onb-ico">' + s.ico + '</div>' +
        '<div class="onb-body">' +
          '<h2 class="onb-title">' + s.titulo + '</h2>' +
          '<p>' + s.cuerpo + '</p>' +
        '</div>' +
        '<div class="onb-footer">' +
          '<div class="onb-dots">' + dots + '</div>' +
          '<div class="onb-btns">' +
            '<button class="onb-skip">Saltar</button>' +
            '<button class="onb-next">' + (isLast ? '¡Empezar!' : 'Siguiente') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    overlay.querySelector('.onb-next').addEventListener('click', next);
    overlay.querySelector('.onb-skip').addEventListener('click', dismiss);
    overlay.querySelector('.onb-next').focus();
  }

  function next() {
    if (step < STEPS.length - 1) { step++; render(); }
    else dismiss();
  }

  function dismiss() {
    localStorage.setItem(LS_KEY, '1');
    overlay.classList.remove('on');
    setTimeout(() => { try { overlay.remove(); } catch (e) {} }, 350);
  }

  render();
  // Tiny delay so the page paints first
  setTimeout(() => overlay.classList.add('on'), 180);
})();
