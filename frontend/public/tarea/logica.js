/**
 * EducTrack — Lógica y Gestión de Recordatorios y Pendientes
 * Controlador a prueba de errores con resolución dinámica de elementos DOM
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'educTrack_recordatorios';

  // Datos iniciales representativos
  const DEFAULT_RECORDATORIOS = [
    {
      id: 1,
      titulo: 'Resumen: Álgebra y Matrices',
      fecha: '2026-11-12',
      resumen: 'Se explicaron matrices 3x3, cálculo de determinantes y la regla de Cramer. Resolver los ejercicios impares de la página 45.',
      archivo: 'resumen_algebra_clase4.pdf'
    },
    {
      id: 2,
      titulo: 'Examen Parcial - Unidad 2',
      fecha: '2026-11-18',
      resumen: 'Evaluación presencial sobre funciones cuadráticas y sistemas de ecuaciones lineales. Traer calculadora científica.',
      archivo: 'temario_examen_unidad2.pdf'
    },
    {
      id: 3,
      titulo: 'Reunión de Departamento Docente',
      fecha: '2026-11-25',
      resumen: 'Coordinación trimestral para entrega de planillas de calificaciones y planificación del ciclo lectivo.',
      archivo: 'orden_del_dia_reunion.docx'
    }
  ];

  let recordatorios = [];
  let recordatorioActivoId = null;

  // ── Helper para obtener elementos de forma segura ──────────────────
  function getEl(id, fallbackSelector) {
    if (id) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    if (fallbackSelector) {
      return document.querySelector(fallbackSelector);
    }
    return null;
  }

  // ── Carga y Persistencia ────────────────────────────────────────────
  function cargarRecordatorios() {
    try {
      const dataRaw = localStorage.getItem(STORAGE_KEY);
      if (dataRaw) {
        const parsed = JSON.parse(dataRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          recordatorios = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('[EducTrack] Error al leer recordatorios de localStorage:', e);
    }
    recordatorios = JSON.parse(JSON.stringify(DEFAULT_RECORDATORIOS));
    guardarRecordatorios();
  }

  function guardarRecordatorios() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recordatorios));
    } catch (e) {
      console.error('[EducTrack] Error al guardar en localStorage:', e);
    }
  }

  // ── Sincronizar Contexto Institucional ───────────────────────────────
  function sincronizarContexto() {
    const curso = sessionStorage.getItem('cursoActivo') || localStorage.getItem('cursoActivo') || '4B';
    const materia = sessionStorage.getItem('materiaActiva') || localStorage.getItem('materiaActiva') || 'Matemáticas';
    const label = getEl('labelCursoPendientes', '.course-badge span');
    if (label) {
      label.textContent = `${curso} • ${materia}`;
    }
  }

  // ── Formateo de Fecha Robusto ────────────────────────────────────────
  function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    try {
      const partes = String(fechaStr).split(/[-/T]/);
      if (partes.length >= 3) {
        const y = partes[0].length === 4 ? partes[0] : partes[2];
        const m = partes[1];
        const d = partes[0].length === 4 ? partes[2] : partes[0];
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mesNombre = meses[parseInt(m, 10) - 1] || m;
        return `${parseInt(d, 10)} de ${mesNombre}, ${y}`;
      }
      return fechaStr;
    } catch (_) {
      return fechaStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Renderizado de la Lista ─────────────────────────────────────────
  function renderizar() {
    const lista = getEl('listaRecordatorios', '.file-list');
    if (!lista) return;

    const inputBuscar = getEl('inputBuscar', 'input[type="search"]');
    const filtroFecha = getEl('filtroFecha', 'input[type="date"]');

    const textoBusqueda = (inputBuscar?.value || '').trim().toLowerCase();
    const fechaFiltro = filtroFecha?.value || '';

    let filtrados = recordatorios.filter(item => {
      const coincideTexto = !textoBusqueda ||
        (item.titulo && item.titulo.toLowerCase().includes(textoBusqueda)) ||
        (item.resumen && item.resumen.toLowerCase().includes(textoBusqueda)) ||
        (item.archivo && item.archivo.toLowerCase().includes(textoBusqueda));

      const coincideFecha = !fechaFiltro || item.fecha === fechaFiltro;

      return coincideTexto && coincideFecha;
    });

    lista.innerHTML = '';

    if (filtrados.length === 0) {
      lista.innerHTML = `
        <li class="empty-state" style="padding:28px 16px; text-align:center; color:rgba(255,255,255,0.65);">
          <i class="fa-regular fa-folder-open" style="font-size:2rem; color:rgba(255,59,59,0.5); display:block; margin-bottom:8px;"></i>
          <p>No se encontraron recordatorios con los criterios seleccionados.</p>
        </li>
      `;
      return;
    }

    filtrados.forEach(item => {
      const li = document.createElement('li');
      li.className = 'file-item';
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `Ver detalle de ${item.titulo}`);

      const tieneArchivo = Boolean(item.archivo && item.archivo.trim());
      const iconoArchivo = tieneArchivo
        ? '<i class="fa-solid fa-file-pdf"></i>'
        : '<i class="fa-regular fa-bell"></i>';

      li.innerHTML = `
        <div class="file-item__icon">${iconoArchivo}</div>
        <div class="file-item__info">
          <span class="file-item__name">${escapeHtml(item.titulo)}</span>
          <span class="file-item__meta">
            <i class="fa-regular fa-calendar"></i> ${formatearFecha(item.fecha)}
            ${tieneArchivo ? `&bull; <i class="fa-solid fa-paperclip"></i> ${escapeHtml(item.archivo)}` : ''}
          </span>
          <span class="file-item__desc">${escapeHtml(item.resumen || '')}</span>
        </div>
        <i class="fa-solid fa-chevron-right" style="opacity:0.5; font-size:12px; margin-left:6px;"></i>
      `;

      li.addEventListener('click', () => abrirDetalle(item.id));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          abrirDetalle(item.id);
        }
      });

      lista.appendChild(li);
    });
  }

  // ── Detalle del Recordatorio ────────────────────────────────────────
  function abrirDetalle(id) {
    const item = recordatorios.find(r => String(r.id) === String(id));
    if (!item) return;

    recordatorioActivoId = item.id;

    const modalDetalle = getEl('modalDetalle');
    if (!modalDetalle) return;

    const detalleTitulo = getEl('detalleTitulo');
    const detalleFecha = getEl('detalleFecha');
    const detalleFechaTexto = getEl('detalleFechaTexto');
    const detalleDesc = getEl('detalleDesc');
    const detalleArchivosContenedor = getEl('detalleArchivosContenedor');
    const detalleListaArchivos = getEl('detalleListaArchivos');

    if (detalleTitulo) detalleTitulo.textContent = item.titulo;

    if (detalleFechaTexto) {
      detalleFechaTexto.textContent = formatearFecha(item.fecha);
    } else if (detalleFecha) {
      detalleFecha.innerHTML = `<i class="fa-regular fa-calendar"></i> ${formatearFecha(item.fecha)}`;
    }

    if (detalleDesc) {
      detalleDesc.textContent = item.resumen || 'Sin resumen o consignas registradas.';
    }

    if (detalleArchivosContenedor && detalleListaArchivos) {
      detalleListaArchivos.innerHTML = '';
      if (item.archivo && item.archivo.trim()) {
        detalleArchivosContenedor.style.display = 'block';
        const li = document.createElement('li');
        li.className = 'detalle-archivo-item';
        li.innerHTML = `
          <span style="display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-file-lines" style="color:var(--red-bright);"></i>
            <strong>${escapeHtml(item.archivo)}</strong>
          </span>
          <button type="button" class="btn btn--secondary btn--sm" style="padding:4px 10px;" onclick="alert('Descargando archivo adjunto: ${escapeHtml(item.archivo)}')">
            <i class="fa-solid fa-download"></i> Bajar
          </button>
        `;
        detalleListaArchivos.appendChild(li);
      } else {
        detalleArchivosContenedor.style.display = 'none';
      }
    }

    modalDetalle.classList.add('is-open');
    modalDetalle.setAttribute('aria-hidden', 'false');
    modalDetalle.style.display = 'flex';
    document.body.classList.add('modal-open');
  }

  function cerrarDetalle() {
    const modalDetalle = getEl('modalDetalle');
    if (modalDetalle) {
      modalDetalle.classList.remove('is-open');
      modalDetalle.setAttribute('aria-hidden', 'true');
      modalDetalle.style.display = 'none';
    }
    document.body.classList.remove('modal-open');
    recordatorioActivoId = null;
  }

  // ── Formulario: Crear / Editar ──────────────────────────────────────
  function abrirModalCrear() {
    const modal = getEl('modalRecordatorio');
    const form = getEl('formRecordatorio');
    const inputId = getEl('recordatorioId');
    const inputTitulo = getEl('recordatorioTitulo');
    const inputFecha = getEl('recordatorioFecha');
    const inputArchivo = getEl('recordatorioArchivo');
    const modalTitulo = getEl('modalTitulo');

    if (form) form.reset();
    if (inputId) inputId.value = '';
    if (inputArchivo) inputArchivo.value = '';
    if (modalTitulo) modalTitulo.textContent = 'Crear recordatorio';

    // Fecha de hoy por defecto
    if (inputFecha) {
      const hoy = new Date().toISOString().split('T')[0];
      inputFecha.value = hoy;
    }

    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
    }

    if (inputTitulo) {
      setTimeout(() => inputTitulo.focus(), 100);
    }
  }

  function abrirModalEditar(id) {
    const item = recordatorios.find(r => String(r.id) === String(id));
    if (!item) return;

    cerrarDetalle();

    const modal = getEl('modalRecordatorio');
    const inputId = getEl('recordatorioId');
    const inputTitulo = getEl('recordatorioTitulo');
    const inputResumen = getEl('recordatorioResumen');
    const inputFecha = getEl('recordatorioFecha');
    const inputArchivo = getEl('recordatorioArchivo');
    const modalTitulo = getEl('modalTitulo');

    if (inputId) inputId.value = item.id;
    if (inputTitulo) inputTitulo.value = item.titulo || '';
    if (inputResumen) inputResumen.value = item.resumen || '';
    if (inputFecha) inputFecha.value = item.fecha || '';
    if (inputArchivo) inputArchivo.value = item.archivo || '';

    if (modalTitulo) modalTitulo.textContent = 'Editar recordatorio';

    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
    }

    if (inputTitulo) {
      setTimeout(() => inputTitulo.focus(), 100);
    }
  }

  function cerrarModalForm() {
    const modal = getEl('modalRecordatorio');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
    }
    document.body.classList.remove('modal-open');
  }

  // ── Inicialización de Eventos ───────────────────────────────────────
  function inicializarEventos() {
    const btnCrear = getEl('crear_recordatorio');
    if (btnCrear) btnCrear.addEventListener('click', abrirModalCrear);

    const btnCerrarModal = getEl('btnCerrarModal');
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalForm);

    const btnCancelarModal = getEl('btnCancelarModal');
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', cerrarModalForm);

    const modalOverlay = getEl('modalOverlay');
    if (modalOverlay) modalOverlay.addEventListener('click', cerrarModalForm);

    const btnCerrarDetalle = getEl('btnCerrarDetalle');
    if (btnCerrarDetalle) btnCerrarDetalle.addEventListener('click', cerrarDetalle);

    const modalDetalleOverlay = getEl('modalDetalleOverlay');
    if (modalDetalleOverlay) modalDetalleOverlay.addEventListener('click', cerrarDetalle);

    const btnEditar = getEl('btnEditarRecordatorio');
    if (btnEditar) {
      btnEditar.addEventListener('click', () => {
        if (recordatorioActivoId) abrirModalEditar(recordatorioActivoId);
      });
    }

    const btnEliminar = getEl('btnEliminarTarea');
    if (btnEliminar) {
      btnEliminar.addEventListener('click', () => {
        if (!recordatorioActivoId) return;
        if (confirm('¿Desea eliminar este recordatorio?')) {
          recordatorios = recordatorios.filter(r => String(r.id) !== String(recordatorioActivoId));
          guardarRecordatorios();
          cerrarDetalle();
          renderizar();
        }
      });
    }

    // Selector de archivo local opcional
    const filePicker = getEl('recordatorioFileInput');
    if (filePicker) {
      filePicker.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const inputArchivo = getEl('recordatorioArchivo');
          if (inputArchivo) {
            inputArchivo.value = e.target.files[0].name;
          }
        }
      });
    }

    const form = getEl('formRecordatorio');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const inputTitulo = getEl('recordatorioTitulo');
        const inputResumen = getEl('recordatorioResumen');
        const inputFecha = getEl('recordatorioFecha');
        const inputArchivo = getEl('recordatorioArchivo');
        const inputId = getEl('recordatorioId');

        const titulo = inputTitulo ? inputTitulo.value.trim() : '';
        const resumen = inputResumen ? inputResumen.value.trim() : '';
        const fecha = inputFecha ? inputFecha.value : '';
        const archivo = inputArchivo ? inputArchivo.value.trim() : '';
        const idVal = inputId ? inputId.value : '';

        if (!titulo || !resumen || !fecha) {
          alert('Por favor complete todos los campos obligatorios (Título, Resumen y Fecha).');
          return;
        }

        if (idVal) {
          const idx = recordatorios.findIndex(r => String(r.id) === String(idVal));
          if (idx !== -1) {
            recordatorios[idx] = {
              ...recordatorios[idx],
              titulo,
              resumen,
              fecha,
              archivo
            };
          }
        } else {
          recordatorios.unshift({
            id: Date.now(),
            titulo,
            resumen,
            fecha,
            archivo
          });
        }

        guardarRecordatorios();
        cerrarModalForm();
        renderizar();
      });
    }

    const inputBuscar = getEl('inputBuscar', 'input[type="search"]');
    if (inputBuscar) {
      inputBuscar.addEventListener('input', renderizar);
    }

    const filtroFecha = getEl('filtroFecha', 'input[type="date"]');
    if (filtroFecha) {
      filtroFecha.addEventListener('change', renderizar);
      filtroFecha.addEventListener('input', renderizar);
    }

    const btnLimpiar = getEl('btnLimpiarFiltroFecha', '.btn-clear-filter');
    if (btnLimpiar) {
      btnLimpiar.addEventListener('click', () => {
        if (filtroFecha) filtroFecha.value = '';
        renderizar();
      });
    }

    // Botón de menú en cabecera: regresar al panel docente
    const menuBtn = getEl(null, '.menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        window.location.href = 'profe.html';
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cerrarModalForm();
        cerrarDetalle();
      }
    });
  }

  // ── Inicialización ──────────────────────────────────────────────────
  function init() {
    sincronizarContexto();
    cargarRecordatorios();
    inicializarEventos();
    renderizar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
