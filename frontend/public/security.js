/**
 * EducTrack — Módulo de Seguridad y Control de Historial
 * Previene el acceso no autorizado y bloquea volver atrás con el navegador
 * tras el cierre de sesión mediante manipulación de bfcache e History API.
 */
(function() {
    'use strict';

    // Determinar qué tipo de página protegida es
    const pathname = window.location.pathname.toLowerCase();
    const esAdmin = pathname.includes('admin.html') && !pathname.includes('admin-login');
    const esAlumno = pathname.includes('alumno.html') || pathname.includes('estudiante');
    const esLogin = pathname.includes('login') || pathname.includes('admin-login');
    const esDocente = !esAdmin && !esAlumno && !esLogin && (
        pathname.includes('profe') ||
        pathname.includes('asistencia') ||
        pathname.includes('tareas') ||
        pathname.includes('recordatorios') ||
        pathname.includes('notas') ||
        pathname.includes('pendientes')
    );

    // Verificación de sesión según el rol
    function verificarSesionActiva() {
        if (esLogin) {
            // En páginas de login: bloquear el botón atrás para no volver al panel cerrado
            history.pushState(null, document.title, location.href);
            return true;
        }

        if (esAdmin) {
            const adminSession = localStorage.getItem('eductrack_admin_session');
            if (!adminSession) {
                window.location.replace('admin-login.html');
                return false;
            }
            try {
                const parsed = JSON.parse(adminSession);
                if (!parsed || !parsed.autenticado) {
                    window.location.replace('admin-login.html');
                    return false;
                }
            } catch(e) {
                window.location.replace('admin-login.html');
                return false;
            }
            return true;
        }

        if (esDocente) {
            const token = localStorage.getItem('token');
            const userRaw = localStorage.getItem('usuario');
            if (!token || !userRaw) {
                window.location.replace('login/docente.html');
                return false;
            }
            try {
                const user = JSON.parse(userRaw);
                if (user.rol !== 'profesor') {
                    window.location.replace('login/docente.html');
                    return false;
                }
            } catch(e) {
                window.location.replace('login/docente.html');
                return false;
            }
            return true;
        }

        if (esAlumno) {
            const token = localStorage.getItem('token');
            const userRaw = localStorage.getItem('usuario');
            if (!token || !userRaw) {
                window.location.replace('login/estudiantes.html');
                return false;
            }
            try {
                const user = JSON.parse(userRaw);
                if (user.rol !== 'alumno') {
                    window.location.replace('login/estudiantes.html');
                    return false;
                }
            } catch(e) {
                window.location.replace('login/estudiantes.html');
                return false;
            }
            return true;
        }

        return true;
    }

    // 1. Verificación inmediata síncrona
    verificarSesionActiva();

    // 2. Control de retroceso mediante bfcache (Back-Forward Cache)
    window.addEventListener('pageshow', function(event) {
        // Si la página se recupera de la caché del navegador al presionar "Atrás"
        if (event.persisted || (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType("navigation")[0]?.type === "back_forward")) {
            verificarSesionActiva();
        }
    });

    // 3. Manejo de retroceso en páginas de login (trampa de historial contra volver al panel)
    if (esLogin) {
        window.addEventListener('popstate', function() {
            history.pushState(null, document.title, location.href);
        });
    }

    // 4. Función global de cierre de sesión seguro
    window.cerrarSesionSegura = function(urlDestino) {
        const url = urlDestino || (esAdmin ? 'admin-login.html' : esAlumno ? 'login/estudiantes.html' : 'login/docente.html');
        
        // Limpiar almacenamiento de sesión y credenciales
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('cursoActivo');
        localStorage.removeItem('materiaActiva');
        localStorage.removeItem('eductrack_admin_session');
        sessionStorage.clear();

        // Reemplazar la entrada actual en el historial para que no se pueda volver con "Atrás"
        window.location.replace(url);
    };

})();

