/* ═══════════════════════════════════════════════════════
   EducTrack — Login · JavaScript Principal
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Referencias al DOM ─────────────────────────────────
  const form = document.getElementById('loginForm');

  const usernameInput = document.getElementById('usernameInput');
  const grpUsername = document.getElementById('grpUsername');
  const usernameErr = document.getElementById('usernameErr');
  const usernameTick = document.getElementById('usernameTick');

  const passwordInput = document.getElementById('passwordInput');
  const grpPassword = document.getElementById('grpPassword');
  const passwordErr = document.getElementById('passwordErr');

  const eyeBtn = document.getElementById('eyeBtn');
  const eyeOpen = eyeBtn.querySelector('.eye-open');
  const eyeClosed = eyeBtn.querySelector('.eye-closed');

  const btnSubmit = document.getElementById('btnSubmit');

  const netToast = document.getElementById('netToast');
  const netIcon = document.getElementById('netIcon');
  const netMsg = document.getElementById('netMsg');

  // ── Mostrar / Ocultar Contraseña ───────────────────────
  eyeBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';

    passwordInput.type = isPassword ? 'text' : 'password';

    eyeOpen.style.display = isPassword ? 'none' : 'block';
    eyeClosed.style.display = isPassword ? 'block' : 'none';

    eyeBtn.setAttribute('aria-pressed', isPassword.toString());
    eyeBtn.setAttribute(
      'aria-label',
      isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
    );

    passwordInput.focus();
  });

  // ── Estado de Red (Online / Offline) ───────────────────
  let netTimeout;

  function showNetworkStatus(isOnline) {
    clearTimeout(netTimeout);

    if (isOnline) {
      netToast.classList.remove('offline');
      netToast.classList.add('online', 'show');
      netIcon.textContent = '🟢';
      netMsg.textContent = 'Conexión restablecida';

      netTimeout = setTimeout(() => {
        netToast.classList.remove('show');
      }, 3000);

      btnSubmit.disabled = false;
    } else {
      netToast.classList.remove('online');
      netToast.classList.add('offline', 'show');
      netIcon.textContent = '🔴';
      netMsg.textContent = 'Sin conexión a internet';
      btnSubmit.disabled = true;
    }
  }

  window.addEventListener('online', () => showNetworkStatus(true));
  window.addEventListener('offline', () => showNetworkStatus(false));

  // ── Validaciones ───────────────────────────────────────
  function setError(group, errorSpan, message) {
    group.classList.add('has-error');
    errorSpan.textContent = message;
    errorSpan.classList.add('visible');
  }

  function clearError(group, errorSpan) {
    group.classList.remove('has-error');
    errorSpan.textContent = '';
    errorSpan.classList.remove('visible');
  }

  // ── Validación de Username ──────────────────────────────
  function checkUsername() {
    const val = usernameInput.value.trim();

    if (!val) {
      setError(
        grpUsername,
        usernameErr,
        'El usuario no puede estar vacío.'
      );

      usernameTick.classList.remove('visible');
      return false;
    }

    if (val.length < 3) {
      setError(
        grpUsername,
        usernameErr,
        'El usuario debe tener al menos 3 caracteres.'
      );

      usernameTick.classList.remove('visible');
      return false;
    }

    clearError(grpUsername, usernameErr);
    usernameTick.classList.add('visible');

    return true;
  }

  // ── Validación de Password ──────────────────────────────
  function checkPassword() {
    const val = passwordInput.value;

    if (!val) {
      setError(
        grpPassword,
        passwordErr,
        'La contraseña no puede estar vacía.'
      );

      return false;
    }

    if (val.length < 6) {
      setError(
        grpPassword,
        passwordErr,
        'La contraseña debe tener al menos 6 caracteres.'
      );

      return false;
    }

    clearError(grpPassword, passwordErr);

    return true;
  }

  // ── Validación mientras escribe ─────────────────────────
  usernameInput.addEventListener('input', () => {
    if (grpUsername.classList.contains('has-error')) {
      checkUsername();
    } else {
      const val = usernameInput.value.trim();

      if (val.length >= 3) {
        usernameTick.classList.add('visible');
      } else {
        usernameTick.classList.remove('visible');
      }
    }
  });

  usernameInput.addEventListener('blur', checkUsername);

  passwordInput.addEventListener('input', () => {
    if (grpPassword.classList.contains('has-error')) {
      checkPassword();
    }
  });

  passwordInput.addEventListener('blur', checkPassword);

  // ── Submit del formulario ──────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isUserValid = checkUsername();
    const isPassValid = checkPassword();

    if (!isUserValid || !isPassValid) {
      return;
    }

    // Activar loader
    btnSubmit.classList.add('loading');
    btnSubmit.disabled = true;

    const username = usernameInput.value.trim();
    const contraseña = passwordInput.value;

    // Detectar portal activo (Docente vs Estudiante)
    const isEstudiantePortal = document.body.classList.contains('theme-estudiante') ||
      Boolean(document.getElementById('tabEstudiantes')?.classList.contains('active')) ||
      window.location.pathname.toLowerCase().includes('estudiante');

    const rolEsperado = isEstudiantePortal ? 'alumno' : 'profesor';

    try {
      const API_BASE = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';
      // Conectar con el backend
      const response = await fetch(
        `${API_BASE}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            usuario: username,
            contraseña: contraseña,
            rolEsperado: rolEsperado
          })
        }
      );

      const data = await response.json();

      // Error de autenticación o bloqueo de portal
      if (!response.ok) {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;

        setError(
          grpPassword,
          passwordErr,
          data.mensaje || 'Usuario o contraseña incorrectos'
        );

        return;
      }

      // Validación estricta de rol del lado del cliente
      if (data.usuario.rol === 'administrador') {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
        setError(
          grpPassword,
          passwordErr,
          'Usuario o contraseña incorrectos'
        );
        return;
      }

      if (isEstudiantePortal && data.usuario.rol === 'profesor') {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
        setError(
          grpPassword,
          passwordErr,
          'Esta cuenta pertenece a un docente. Debe ingresar desde el portal de Docentes.'
        );
        return;
      }

      if (!isEstudiantePortal && data.usuario.rol === 'alumno') {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
        setError(
          grpPassword,
          passwordErr,
          'Esta cuenta pertenece a un estudiante. Debe ingresar desde el portal de Estudiantes.'
        );
        return;
      }

      // Guardar sesión válida
      localStorage.setItem('token', data.token);
      localStorage.setItem(
        'usuario',
        JSON.stringify(data.usuario)
      );

      console.info(
        `[EducTrack] Inicio de sesión correcto: ${data.usuario.rol} (${data.usuario.nombre})`
      );

      // Animación de éxito
      btnSubmit.classList.remove('loading');

      btnSubmit.style.background =
        'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';

      btnSubmit.style.boxShadow =
        '0 4px 18px rgba(22,163,74,0.45)';

      const btnLabel = btnSubmit.querySelector('.btn-label');

      btnLabel.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"
          style="vertical-align:text-bottom; margin-right:4px">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        ¡Bienvenido!
      `;

      // ── Redirección segura según el rol (location.replace evita historial cíclico) ──
      setTimeout(() => {

        if (data.usuario.rol === 'profesor') {
          sessionStorage.removeItem('cursoActivo');
          sessionStorage.removeItem('materiaActiva');
          localStorage.removeItem('cursoActivo');
          localStorage.removeItem('materiaActiva');
          sessionStorage.setItem('abrirSelectorCurso', 'true');
          window.location.replace('../profe.html');

        } else if (data.usuario.rol === 'alumno') {
          window.location.replace('../alumno.html');
        }

      }, 800);

    } catch (error) {

      console.error(
        '[EduTrack] Error de conexión:',
        error
      );

      btnSubmit.classList.remove('loading');
      btnSubmit.disabled = false;

      setError(
        grpPassword,
        passwordErr,
        'No se pudo conectar con el servidor.'
      );
    }
  });

  // Prevenir volver atrás con el navegador a la sesión cerrada
  try {
    history.pushState(null, document.title, location.href);
    window.addEventListener('popstate', function () {
      history.pushState(null, document.title, location.href);
    });
  } catch (e) { }

})();