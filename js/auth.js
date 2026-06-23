/* ============================================================
   COSTITO — Splash + Auth (login dentro de la app)
   ------------------------------------------------------------
   La app entra DIRECTO a la calculadora; el login es opcional y
   vive adentro (botón de cuenta en el header). No hay "auth gate".

   CostitoAuth es una capa desacoplada: la UI llama a una interfaz
   estable y la implementación es hoy un STUB local (localStorage).
   Cuando se conecte Supabase / Google se reemplaza SOLO el cuerpo
   de signInWithEmail / signInWithGoogle / signOut — la UI no cambia.
   ============================================================ */

/* ---------- 1) SPLASH DE ENTRADA ---------- */
(function splash() {
  const el = document.getElementById('splash');
  if (!el) return;

  // Se muestra una vez por sesión de pestaña (no en cada reload).
  // Para mostrarlo SIEMPRE, borrar este bloque de sessionStorage.
  if (sessionStorage.getItem('costito_splash')) { el.remove(); return; }
  sessionStorage.setItem('costito_splash', '1');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hold = reduce ? 350 : 1250; // tiempo en pantalla antes de desvanecer

  setTimeout(() => {
    el.classList.add('gone');
    setTimeout(() => el.remove(), 550); // coincide con la transición CSS
  }, hold);
})();

/* ---------- 2) CAPA AUTH (interfaz estable, impl. reemplazable) ---------- */
window.CostitoAuth = (function () {
  const LS = 'costito_session';
  let listeners = [];

  function getUser() {
    try { return JSON.parse(localStorage.getItem(LS)) || null; } catch (e) { return null; }
  }
  function emit(u) { listeners.forEach((f) => { try { f(u); } catch (e) {} }); }
  function setUser(u) {
    if (u) localStorage.setItem(LS, JSON.stringify(u));
    else localStorage.removeItem(LS);
    emit(u);
  }
  function onChange(cb) { listeners.push(cb); return () => { listeners = listeners.filter((f) => f !== cb); }; }

  function makeUser(email) {
    const name = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || email[0].toUpperCase();
    return { email, name, initials };
  }

  // ===== STUB — reemplazar por Supabase =====
  // signUp -> supabase.auth.signUp({email, password})
  // login  -> supabase.auth.signInWithPassword({email, password})
  function signInWithEmail(email, pass /*, mode */) {
    return new Promise((resolve, reject) => {
      email = (email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reject(new Error('Ingresá un email válido.'));
      if (!pass || pass.length < 6) return reject(new Error('La contraseña necesita al menos 6 caracteres.'));
      // PLACEHOLDER: todavía no verifica contra ningún backend.
      setTimeout(() => { const u = makeUser(email); setUser(u); resolve(u); }, 450); // simula latencia
    });
  }

  // ===== STUB — se implementa en el próximo paso =====
  // -> supabase.auth.signInWithOAuth({ provider: 'google' })
  function signInWithGoogle() {
    return Promise.reject(new Error('GOOGLE_PENDIENTE'));
  }

  function signOut() { setUser(null); }

  return { getUser, onChange, signInWithEmail, signInWithGoogle, signOut };
})();

/* ---------- 3) WIRING DE LA UI ---------- */
(function authUI() {
  const Auth = window.CostitoAuth;
  const $ = (id) => document.getElementById(id);
  const toast = (m) => (window.Costito && window.Costito.toast ? window.Costito.toast(m) : null);

  const btn = $('acctBtn');
  const menu = $('acctMenu');
  const overlay = $('authOverlay');
  if (!btn || !overlay) return;

  let mode = 'login'; // 'login' | 'signup'

  // -- Estado del header según haya sesión --
  function renderAccount(u) {
    if (u) {
      btn.classList.add('logged');
      $('acctAvatar').textContent = u.initials;
      btn.setAttribute('aria-label', 'Cuenta de ' + u.name);
      $('acctMenuAvatar').textContent = u.initials;
      $('acctMenuName').textContent = u.name;
      $('acctMenuEmail').textContent = u.email;
    } else {
      btn.classList.remove('logged');
      btn.setAttribute('aria-label', 'Entrar a tu cuenta');
      closeMenu();
    }
  }

  // -- Modal --
  function openModal() {
    setMode('login');
    $('authError').textContent = '';
    $('authForm').reset();
    overlay.classList.add('on');
    setTimeout(() => $('authEmail').focus(), 60);
  }
  function closeModal() { overlay.classList.remove('on'); }

  function setMode(m) {
    mode = m;
    const login = m === 'login';
    $('authTitle').textContent = login ? 'Entrá a tu cuenta' : 'Creá tu cuenta';
    $('authHint').textContent = login
      ? 'Guardá tus productos y accedé desde cualquier dispositivo.'
      : 'Es gratis. Empezá a guardar tus precios en un toque.';
    $('authSubmit').textContent = login ? 'Entrar' : 'Crear cuenta';
    $('authSwitchTxt').textContent = login ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?';
    $('authSwitch').textContent = login ? 'Creá una gratis' : 'Entrá';
    $('authError').textContent = '';
  }

  // -- Menú de cuenta logueada --
  function toggleMenu() { menu.classList.toggle('on'); }
  function closeMenu() { menu.classList.remove('on'); }

  // -- Eventos --
  btn.addEventListener('click', () => {
    if (Auth.getUser()) toggleMenu();
    else openModal();
  });

  $('authClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeMenu(); } });

  // Cerrar el menú al clickear afuera
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('on') && !e.target.closest('.acct-wrap')) closeMenu();
  });

  $('authSwitch').addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));

  $('authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('authEmail').value;
    const pass = $('authPass').value;
    const submit = $('authSubmit');
    $('authError').textContent = '';
    submit.disabled = true;
    const labelPrev = submit.textContent;
    submit.textContent = 'Un segundo…';

    Auth.signInWithEmail(email, pass, mode)
      .then((u) => {
        closeModal();
        toast(mode === 'signup' ? '¡Cuenta creada! Bienvenido 🟢' : '¡Hola de nuevo, ' + u.name + '!');
      })
      .catch((err) => { $('authError').textContent = err.message; })
      .finally(() => { submit.disabled = false; submit.textContent = labelPrev; });
  });

  $('authGoogle').addEventListener('click', () => {
    Auth.signInWithGoogle().catch((err) => {
      if (err.message === 'GOOGLE_PENDIENTE') toast('El acceso con Google lo activamos en el próximo paso 🙌');
      else $('authError').textContent = err.message;
    });
  });

  $('acctLogout').addEventListener('click', () => {
    Auth.signOut();
    closeMenu();
    toast('Cerraste sesión. Tus productos siguen guardados en este dispositivo.');
  });

  // Init + reaccionar a cambios de sesión
  Auth.onChange(renderAccount);
  renderAccount(Auth.getUser());
})();
