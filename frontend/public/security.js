/**
 * EducTrack — Módulo de Seguridad, Control de Historial y Anti-BFCache
 * Protege rutas privadas, bloquea el retroceso del navegador (botón atrás)
 * y previene que el navegador muestre datos en caché al cerrar sesión.
 */
(function () {
    'use strict';

    // 1. Detección normalizada de rutas (soporta con o sin .html y rutas amigables de Express)
    const rawPath = window.location.pathname.toLowerCase();
    const cleanPath = rawPath.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');

    const esAdmin = cleanPath === 'admin' || rawPath.endsWith('/admin.html');
    const esAlumno = cleanPath === 'alumno' || cleanPath === 'estudiante' || cleanPath === 'estudiantes' ||
                     cleanPath === 'portal_estudiante_redimensionado' || rawPath.includes('estudiante');
    const esLogin = cleanPath === 'admin-login' || rawPath.includes('admin-login') ||
                    cleanPath.includes('login') || rawPath.includes('/login/') ||
                    cleanPath === '' || cleanPath === 'index';
    const esDocente = !esAdmin && !esAlumno && !esLogin && (
        cleanPath === 'profe' || cleanPath === 'docente' ||
        cleanPath === 'asistencia' || cleanPath === 'tareas' || cleanPath === 'tarea' ||
        cleanPath === 'recordatorios' || cleanPath === 'pendientes' || cleanPath === 'notas' ||
        rawPath.includes('profe') || rawPath.includes('asistencia') || rawPath.includes('recordatorios') ||
        rawPath.includes('notas') || rawPath.includes('tareas')
    );

    // 2. Comprobación síncrona de sesión
    function tienePermisoValido() {
        try {
            if (esAdmin) {
                const adminSession = localStorage.getItem('eductrack_admin_session');
                if (!adminSession) return false;
                const parsed = JSON.parse(adminSession);
                return Boolean(parsed && parsed.autenticado === true);
            }

            if (esDocente) {
                const token = localStorage.getItem('token');
                const userRaw = localStorage.getItem('usuario');
                if (!token || !userRaw) return false;
                const user = JSON.parse(userRaw);
                return user && user.rol === 'profesor';
            }

            if (esAlumno) {
                const token = localStorage.getItem('token');
                const userRaw = localStorage.getItem('usuario');
                if (!token || !userRaw) return false;
                const user = JSON.parse(userRaw);
                return user && user.rol === 'alumno';
            }
        } catch (e) {
            return false;
        }

        return true;
    }

    // 3. Bloqueo visual instantáneo antes de pintar el DOM (Anti-Flash de datos privados)
    function verificarSesionActiva() {
        if (esLogin) {
            // En páginas de login: fijar trampa de historial para que "Atrás" no vuelva al panel
            history.pushState(null, document.title, location.href);
            return true;
        }

        if (esAdmin || esDocente || esAlumno) {
            if (!tienePermisoValido()) {
                // Ocultar TODO inmediatamente para que nunca se filtre ninguna pantalla previa
                if (document.documentElement) {
                    document.documentElement.style.visibility = 'hidden';
                    document.documentElement.style.pointerEvents = 'none';
                }

                // Determinar ruta de redirección según el rol esperado
                let dest = 'login/docente.html';
                if (esAdmin) {
                    dest = 'admin-login.html';
                } else if (esAlumno) {
                    dest = rawPath.includes('/login/') ? 'estudiantes.html' : 'login/estudiantes.html';
                } else if (esDocente) {
                    dest = rawPath.includes('/login/') ? 'docente.html' : 'login/docente.html';
                }

                window.location.replace(dest);
                return false;
            } else {
                // Sesión válida: asegurar visibilidad
                if (document.documentElement) {
                    document.documentElement.style.visibility = 'visible';
                    document.documentElement.style.pointerEvents = 'auto';
                }
                return true;
            }
        }

        return true;
    }

    // Ejecución inmediata previa a carga de recursos
    verificarSesionActiva();

    // 4. Control de retroceso mediante bfcache (Back-Forward Cache de navegadores móviles y desktop)
    window.addEventListener('pageshow', function (event) {
        const esNavegacionAtras = event.persisted ||
            (window.performance && window.performance.navigation && window.performance.navigation.type === 2) ||
            (window.performance && window.performance.getEntriesByType &&
             window.performance.getEntriesByType("navigation")[0]?.type === "back_forward");

        if (esNavegacionAtras || esAdmin || esDocente || esAlumno) {
            if (!verificarSesionActiva()) {
                window.location.reload();
            }
        }
    });

    // 5. Trampa de historial en páginas de login (impide volver atrás con el botón del navegador)
    if (esLogin) {
        window.addEventListener('popstate', function () {
            history.pushState(null, document.title, location.href);
        });
    }

    // 6. Cierre de sesión seguro y purga de caché
    window.cerrarSesionSegura = function (urlDestino) {
        let url = urlDestino;
        if (!url) {
            url = esAdmin ? 'admin-login.html' : esAlumno ? 'login/estudiantes.html' : 'login/docente.html';
        }

        // Limpieza exhaustiva de almacenamiento de sesión y credenciales
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('cursoActivo');
        localStorage.removeItem('materiaActiva');
        localStorage.removeItem('eductrack_admin_session');
        localStorage.removeItem('adminCredentials');
        sessionStorage.clear();

        // Notificar al backend para depurar cookies o caché de sesión si aplica
        try {
            fetch('/api/auth/logout', { method: 'POST', keepalive: true }).catch(function () {});
        } catch (e) {}

        // Ocultar vista actual para evitar congelamiento de fotograma en bfcache
        if (document.documentElement) {
            document.documentElement.style.visibility = 'hidden';
        }

        // Reemplazar la entrada de historial para no poder volver con "Atrás"
        window.location.replace(url);
    };

})();
