/**
 * EduTrack — Servicio de Conexión en la Nube con Google Sheets (mediante SheetBest)
 * y Caché de Respaldo Local (localStorage).
 */

const SheetBestService = (function () {
  'use strict';

  const STORAGE_KEYS = {
    CONFIG: 'eductrack_sheetbest_config',
    ADMIN_SESSION: 'eductrack_admin_session',
    REMEMBER_ADMIN: 'eductrack_remember_admin',
    ASIGNACIONES: 'eductrack_asignaciones_data',
    CURSOS: 'eductrack_cursos_data',
    PROFESORES: 'eductrack_profesores_data',
    ALUMNOS: 'eductrack_alumnos_data',
    ADMINISTRADORES: 'eductrack_administradores_data'
  };

  // ── Datos Iniciales Representativos (Semilla) ──────────────────────
  const SEED_DATA = {
    administradores: [
      {
        id: '1',
        usuario: 'admin',
        clave: 'admin123',
        nombre: 'Administrador General',
        email: 'admin@eductrack.edu',
        rol: 'Director Académico'
      },
      {
        id: '2',
        usuario: 'rectoria',
        clave: 'rectoria2026',
        nombre: 'Rectoría Institucional',
        email: 'rectoria@eductrack.edu',
        rol: 'Superadministrador'
      }
    ],
    asignaciones: [
      {
        id: 'asig-1',
        materia: 'Matemáticas',
        titulo: 'Trabajo Práctico N° 4: Funciones Cuadráticas y Parábolas',
        descripcion: 'Análisis gráfico y algebraico de polinomios de 2do grado. Los estudiantes deberán identificar el vértice, calcular el eje de simetría y las raíces reales utilizando la fórmula de Bhaskara. Se requiere justificación paso a paso de cada cálculo.',
        curso: '4B',
        fechaEntrega: '2026-11-20',
        profesor: 'Prof. Juan Pérez',
        estado: 'Publicada',
        prioridad: 'Alta'
      },
      {
        id: 'asig-2',
        materia: 'Lengua y Literatura',
        titulo: 'Ensayo Crítico: El Realismo Mágico en Cien Años de Soledad',
        descripcion: 'Elaboración de un ensayo reflexivo de 3 carillas donde se examine el tratamiento del tiempo circular y la genealogía familiar en la novela de Gabriel García Márquez. Incluir al menos tres citas textuales en formato APA.',
        curso: '4B',
        fechaEntrega: '2026-11-25',
        profesor: 'Prof. Laura Rossi',
        estado: 'Publicada',
        prioridad: 'Media'
      },
      {
        id: 'asig-3',
        materia: 'Física',
        titulo: 'Informe Experimental: Leyes de Newton y Dinámica',
        descripcion: 'Elaboración de informe de laboratorio grupal analizando el movimiento sobre plano inclinado con rozamiento. Tabular aceleraciones experimentales y calcular el coeficiente de fricción cinético.',
        curso: '3A',
        fechaEntrega: '2026-11-18',
        profesor: 'Prof. Carlos Gómez',
        estado: 'Publicada',
        prioridad: 'Alta'
      },
      {
        id: 'asig-4',
        materia: 'Historia',
        titulo: 'Monografía: Transformaciones Sociales de la Revolución Industrial',
        descripcion: 'Investigación histórica acerca de la emergencia del movimiento obrero durante el siglo XIX en Gran Bretaña. Comparar las condiciones fabriles con las normativas laborales actuales.',
        curso: '4B',
        fechaEntrega: '2026-11-28',
        profesor: 'Prof. Mariana Benítez',
        estado: 'Publicada',
        prioridad: 'Media'
      },
      {
        id: 'asig-5',
        materia: 'Química',
        titulo: 'Guía de Problemas: Balanceo Redox y Estequiometría',
        descripcion: 'Resolución de 12 ejercicios de balanceo por el método ion-electrón en medio ácido y cálculo de masa molar, reactivo limitante y rendimiento porcentual de las reacciones indicadas.',
        curso: '4A',
        fechaEntrega: '2026-12-02',
        profesor: 'Prof. Martín Díaz',
        estado: 'Publicada',
        prioridad: 'Alta'
      },
      {
        id: 'asig-6',
        materia: 'Biología',
        titulo: 'Maqueta Celular y Explicación de la Síntesis de Proteínas',
        descripcion: 'Construcción de modelo tridimensional que identifique la transcripción y traducción del ARN mensajero en los ribosomas. Adjuntar memoria técnica explicativa.',
        curso: '2A',
        fechaEntrega: '2026-12-05',
        profesor: 'Prof. Sofía Navarro',
        estado: 'Publicada',
        prioridad: 'Baja'
      }
    ],
    cursos: [
      { id: 'cur-1', nombre: '1A', nivel: 'Secundaria Básica', turno: 'Mañana', preceptor: 'Roberto Sánchez' },
      { id: 'cur-2', nombre: '2A', nivel: 'Secundaria Básica', turno: 'Mañana', preceptor: 'Ana Clara Luna' },
      { id: 'cur-3', nombre: '3A', nivel: 'Ciclo Superior', turno: 'Tarde', preceptor: 'Marcos Varela' },
      { id: 'cur-4', nombre: '4A', nivel: 'Ciclo Superior', turno: 'Mañana', preceptor: 'Valeria Castro' },
      { id: 'cur-5', nombre: '4B', nivel: 'Ciclo Superior', turno: 'Mañana', preceptor: 'Valeria Castro' }
    ],
    profesores: [
      { id: 'prof-1', nombre: 'Juan', apellido: 'Pérez', usuario: 'profesor1', email: 'jperez@eductrack.edu', materia: 'Matemáticas' },
      { id: 'prof-2', nombre: 'Laura', apellido: 'Rossi', usuario: 'lrossi', email: 'lrossi@eductrack.edu', materia: 'Lengua y Literatura' },
      { id: 'prof-3', nombre: 'Carlos', apellido: 'Gómez', usuario: 'cgomez', email: 'cgomez@eductrack.edu', materia: 'Física' },
      { id: 'prof-4', nombre: 'Mariana', apellido: 'Benítez', usuario: 'mbenitez', email: 'mbenitez@eductrack.edu', materia: 'Historia' },
      { id: 'prof-5', nombre: 'Martín', apellido: 'Díaz', usuario: 'mdiaz', email: 'mdiaz@eductrack.edu', materia: 'Química' }
    ],
    alumnos: [
      { id: 'alu-1', nombre: 'Agustín', apellido: 'Morales', usuario: 'amorales', email: 'amorales@eductrack.edu', curso: '4B' },
      { id: 'alu-2', nombre: 'Camila', apellido: 'Fernández', usuario: 'cfernandez', email: 'cfernandez@eductrack.edu', curso: '4B' },
      { id: 'alu-3', nombre: 'Diego', apellido: 'Reyes', usuario: 'dreyes', email: 'dreyes@eductrack.edu', curso: '3A' },
      { id: 'alu-4', nombre: 'Ignacia', apellido: 'Silva', usuario: 'isilva', email: 'isilva@eductrack.edu', curso: '4B' },
      { id: 'alu-5', nombre: 'Matías', apellido: 'Castillo', usuario: 'mcastillo', email: 'mcastillo@eductrack.edu', curso: '2A' }
    ]
  };

  // ── Configuración Inicial ───────────────────────────────────────────
  function getConfig() {
    try {
      const cfg = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (cfg) return JSON.parse(cfg);
    } catch (e) {
      console.warn('[SheetBest] Error leyendo config:', e);
    }
    return {
      apiUrl: '', // URL provista por el usuario de SheetBest
      autoSync: true,
      lastSync: null
    };
  }

  function saveConfig(config) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }

  // ── Utilidades de Almacenamiento Local ───────────────────────────────
  function getLocal(key, defaultData) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn(`[SheetBest] Error leyendo ${key}:`, e);
    }
    // Si no hay datos, sembramos los por defecto
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }

  function setLocal(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`[SheetBest] Error guardando ${key}:`, e);
    }
  }

  // ── Inicialización de Caché Local ───────────────────────────────────
  function initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.ASIGNACIONES)) {
      setLocal(STORAGE_KEYS.ASIGNACIONES, SEED_DATA.asignaciones);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURSOS)) {
      setLocal(STORAGE_KEYS.CURSOS, SEED_DATA.cursos);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROFESORES)) {
      setLocal(STORAGE_KEYS.PROFESORES, SEED_DATA.profesores);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ALUMNOS)) {
      setLocal(STORAGE_KEYS.ALUMNOS, SEED_DATA.alumnos);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ADMINISTRADORES)) {
      setLocal(STORAGE_KEYS.ADMINISTRADORES, SEED_DATA.administradores);
    }
  }

  initStorage();

  // ── Wrapper HTTP para SheetBest ─────────────────────────────────────
  async function fetchSheetBest(endpointUrl, options = {}) {
    const config = getConfig();
    const url = endpointUrl || config.apiUrl;
    if (!url) {
      throw new Error('NO_URL_CONFIGURED');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const json = await response.json();
      return json;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // ── Módulo 1: ASIGNACIONES ESCOLARES (Lectura Pública y CRUD) ────────
  async function getAsignaciones(forceCloud = false) {
    const config = getConfig();
    if (config.apiUrl && (forceCloud || config.autoSync)) {
      try {
        // En SheetBest se puede consultar la raíz o tab asignaciones
        const data = await fetchSheetBest(config.apiUrl);
        if (Array.isArray(data) && data.length > 0) {
          // Filtrar o normalizar si proviene de Google Sheets
          const normalizadas = data.map((item, index) => ({
            id: String(item.id || item.ID || `asig-${index + 1}`),
            materia: item.materia || item.Materia || 'General',
            titulo: item.titulo || item.Titulo || item.Título || 'Sin título',
            descripcion: item.descripcion || item.Descripcion || item.Descripción || item['De qué se trata'] || 'Sin descripción detallada.',
            curso: item.curso || item.Curso || 'Todos',
            fechaEntrega: item.fechaEntrega || item.fecha || item.Fecha || item['Fecha de Entrega'] || '',
            profesor: item.profesor || item.Profesor || 'Docente a cargo',
            estado: item.estado || item.Estado || 'Publicada',
            prioridad: item.prioridad || item.Prioridad || 'Normal'
          }));
          setLocal(STORAGE_KEYS.ASIGNACIONES, normalizadas);
          config.lastSync = new Date().toISOString();
          saveConfig(config);
          return { data: normalizadas, fromCloud: true };
        }
      } catch (err) {
        console.warn('[SheetBest] Conexión en la nube falló o no configurada, usando respaldo local:', err.message);
      }
    }
    const local = getLocal(STORAGE_KEYS.ASIGNACIONES, SEED_DATA.asignaciones);
    return { data: local, fromCloud: false };
  }

  async function saveAsignacion(asignacion) {
    const local = getLocal(STORAGE_KEYS.ASIGNACIONES, SEED_DATA.asignaciones);
    const index = local.findIndex(a => String(a.id) === String(asignacion.id));
    
    let isNew = false;
    if (index >= 0) {
      local[index] = { ...local[index], ...asignacion };
    } else {
      isNew = true;
      if (!asignacion.id) {
        asignacion.id = 'asig-' + Date.now();
      }
      local.unshift(asignacion);
    }
    setLocal(STORAGE_KEYS.ASIGNACIONES, local);

    // Intentar replicar en SheetBest si hay URL configurada
    const config = getConfig();
    if (config.apiUrl) {
      try {
        if (isNew) {
          await fetchSheetBest(config.apiUrl, {
            method: 'POST',
            body: JSON.stringify([asignacion])
          });
        } else {
          // Actualización mediante query parametrizada de SheetBest
          await fetchSheetBest(`${config.apiUrl}/id/${asignacion.id}`, {
            method: 'PATCH',
            body: JSON.stringify(asignacion)
          });
        }
      } catch (err) {
        console.warn('[SheetBest] Replicación en la nube pendiente (se sincronizará luego):', err.message);
      }
    }
    return asignacion;
  }

  async function deleteAsignacion(id) {
    let local = getLocal(STORAGE_KEYS.ASIGNACIONES, SEED_DATA.asignaciones);
    local = local.filter(a => String(a.id) !== String(id));
    setLocal(STORAGE_KEYS.ASIGNACIONES, local);

    const config = getConfig();
    if (config.apiUrl) {
      try {
        await fetchSheetBest(`${config.apiUrl}/id/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn('[SheetBest] Eliminación remota pendiente:', err.message);
      }
    }
    return true;
  }

  // ── Módulo 2: AUTENTICACIÓN ADMINISTRATIVA (admin-login.html) ────────
  async function autenticarAdmin(usuario, clave) {
    const usuarioClean = (usuario || '').trim().toLowerCase();
    const claveClean = (clave || '').trim();

    if (!usuarioClean || !claveClean) {
      return { ok: false, mensaje: 'Por favor complete todos los campos.' };
    }

    const config = getConfig();

    // 1. Intentar validar contra SheetBest si hay conexión
    if (config.apiUrl) {
      try {
        // Consultar hoja / administradores
        const data = await fetchSheetBest(config.apiUrl);
        if (Array.isArray(data) && data.length > 0) {
          const matchAdmin = data.find(row => {
            const rowUser = String(row.usuario || row.Usuario || row.email || row.Email || '').toLowerCase();
            const rowPass = String(row.clave || row.Clave || row.contraseña || row.password || row.Password || '');
            const rowRol = String(row.rol || row.Rol || '').toLowerCase();
            const esAdminRol = rowRol.includes('admin') || rowRol.includes('director') || rowRol.includes('rector') || !rowRol;
            return rowUser === usuarioClean && rowPass === claveClean && esAdminRol;
          });

          if (matchAdmin) {
            const adminUser = {
              id: matchAdmin.id || 'admin-cloud',
              usuario: matchAdmin.usuario || matchAdmin.Usuario || usuarioClean,
              nombre: matchAdmin.nombre || matchAdmin.Nombre || 'Administrador',
              email: matchAdmin.email || matchAdmin.Email || 'admin@eductrack.edu',
              rol: matchAdmin.rol || 'Administrador SheetBest'
            };
            guardarSesionAdmin(adminUser);
            return { ok: true, usuario: adminUser, fromCloud: true };
          }
        }
      } catch (err) {
        console.warn('[SheetBest] Validación remota no disponible, recurriendo a administradores locales:', err.message);
      }
    }

    // 2. Fallback de administradores locales en caché
    const admins = getLocal(STORAGE_KEYS.ADMINISTRADORES, SEED_DATA.administradores);
    const encontrado = admins.find(a => 
      (a.usuario.toLowerCase() === usuarioClean || a.email.toLowerCase() === usuarioClean) &&
      a.clave === claveClean
    );

    if (encontrado) {
      const adminUser = {
        id: encontrado.id,
        usuario: encontrado.usuario,
        nombre: encontrado.nombre,
        email: encontrado.email,
        rol: encontrado.rol
      };
      guardarSesionAdmin(adminUser);
      return { ok: true, usuario: adminUser, fromCloud: false };
    }

    return {
      ok: false,
      mensaje: 'Credenciales administrativas inválidas. Verifique su usuario y contraseña.'
    };
  }

  function guardarSesionAdmin(usuario) {
    const sesion = {
      token: 'admin_jwt_' + Math.random().toString(36).substring(2) + Date.now(),
      usuario,
      fechaLogin: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(sesion));
  }

  function getSesionAdmin() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function cerrarSesionAdmin() {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  }

  // ── Módulo 3: CURSOS (CRUD) ─────────────────────────────────────────
  function getCursos() {
    return getLocal(STORAGE_KEYS.CURSOS, SEED_DATA.cursos);
  }

  function saveCurso(curso) {
    const cursos = getCursos();
    const idx = cursos.findIndex(c => String(c.id) === String(curso.id));
    if (idx >= 0) {
      cursos[idx] = { ...cursos[idx], ...curso };
    } else {
      curso.id = curso.id || 'cur-' + Date.now();
      cursos.push(curso);
    }
    setLocal(STORAGE_KEYS.CURSOS, cursos);
    return curso;
  }

  function deleteCurso(id) {
    let cursos = getCursos();
    cursos = cursos.filter(c => String(c.id) !== String(id));
    setLocal(STORAGE_KEYS.CURSOS, cursos);
    return true;
  }

  // ── Módulo 4: PROFESORES (CRUD) ─────────────────────────────────────
  function getProfesores() {
    return getLocal(STORAGE_KEYS.PROFESORES, SEED_DATA.profesores);
  }

  function saveProfesor(profesor) {
    const profs = getProfesores();
    const idx = profs.findIndex(p => String(p.id) === String(profesor.id));
    if (idx >= 0) {
      profs[idx] = { ...profs[idx], ...profesor };
    } else {
      profesor.id = profesor.id || 'prof-' + Date.now();
      profs.push(profesor);
    }
    setLocal(STORAGE_KEYS.PROFESORES, profs);
    return profesor;
  }

  function deleteProfesor(id) {
    let profs = getProfesores();
    profs = profs.filter(p => String(p.id) !== String(id));
    setLocal(STORAGE_KEYS.PROFESORES, profs);
    return true;
  }

  // ── Módulo 5: ALUMNOS (CRUD) ─────────────────────────────────────────
  function getAlumnos() {
    return getLocal(STORAGE_KEYS.ALUMNOS, SEED_DATA.alumnos);
  }

  function saveAlumno(alumno) {
    const alus = getAlumnos();
    const idx = alus.findIndex(a => String(a.id) === String(alumno.id));
    if (idx >= 0) {
      alus[idx] = { ...alus[idx], ...alumno };
    } else {
      alumno.id = alumno.id || 'alu-' + Date.now();
      alus.push(alumno);
    }
    setLocal(STORAGE_KEYS.ALUMNOS, alus);
    return alumno;
  }

  function deleteAlumno(id) {
    let alus = getAlumnos();
    alus = alus.filter(a => String(a.id) !== String(id));
    setLocal(STORAGE_KEYS.ALUMNOS, alus);
    return true;
  }

  // ── Sincronización Manual Completa ────────────────────────────────────
  async function testConnection(testUrl) {
    try {
      const res = await fetchSheetBest(testUrl, { method: 'GET' });
      return { ok: true, rows: Array.isArray(res) ? res.length : 0 };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async function pushAllToSheetBest() {
    const config = getConfig();
    if (!config.apiUrl) {
      throw new Error('Debe configurar una URL válida de SheetBest primero.');
    }
    const asignaciones = getLocal(STORAGE_KEYS.ASIGNACIONES, SEED_DATA.asignaciones);
    await fetchSheetBest(config.apiUrl, {
      method: 'POST',
      body: JSON.stringify(asignaciones)
    });
    config.lastSync = new Date().toISOString();
    saveConfig(config);
    return true;
  }

  return {
    STORAGE_KEYS,
    SEED_DATA,
    getConfig,
    saveConfig,
    testConnection,
    pushAllToSheetBest,
    getAsignaciones,
    saveAsignacion,
    deleteAsignacion,
    autenticarAdmin,
    guardarSesionAdmin,
    getSesionAdmin,
    cerrarSesionAdmin,
    getCursos,
    saveCurso,
    deleteCurso,
    getProfesores,
    saveProfesor,
    deleteProfesor,
    getAlumnos,
    saveAlumno,
    deleteAlumno
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SheetBestService;
}

