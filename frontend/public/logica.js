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
      resumen: 'Se explicaron matrices 2x3, cálculo de determinantes y la regla de Cramer. Resolver los ejercicios impares de la página.',
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
      resumen: 'Traer calculadora científica no programable y formulario para el parcial.',
      archivo: 'orden_del_dia_reunion.docx'
    },
    {
      id: 4,
      titulo: 'Reunión de Departamento Docente',
      fecha: '2026-11-25',
      resumen: 'Coordinación trimestral para entrega de planillas de calificaciones y planificación del ciclo lectivo. Se requiere la presencia de todos los docentes para la firma de actas.',
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
        if (Array.isArray(parsed) && parsed.length >= 4) {
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
      li.style.position = 'relative';
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
        ${tieneArchivo ? `
          <button type="button" class="btn-descarga-item" onclick="event.stopPropagation(); window.descargarPDFRecordatorio(${item.id})" title="Descargar PDF del recordatorio">
            <i class="fa-solid fa-download"></i> PDF
          </button>
        ` : ''}
        <i class="fa-solid fa-chevron-right" style="opacity:0.5; font-size:12px; margin-left:6px;"></i>
        <span style="position:absolute; bottom:3px; right:8px; font-size:9px; opacity:0.35; color:#fff; pointer-events:none; letter-spacing:0.3px;">.file-item</span>
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
          <button type="button" class="btn btn--secondary btn--sm" style="padding:4px 10px;" onclick="window.descargarPDFRecordatorio(${item.id})">
            <i class="fa-solid fa-download"></i> Descargar PDF
          </button>
        `;
        detalleListaArchivos.appendChild(li);
      } else {
        detalleArchivosContenedor.style.display = 'none';
      }
    }

    modalDetalle.classList.add('is-open');
    modalDetalle.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function cerrarDetalle() {
    const modalDetalle = getEl('modalDetalle');
    if (modalDetalle) {
      modalDetalle.classList.remove('is-open');
      modalDetalle.setAttribute('aria-hidden', 'true');
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
    let archivoRecordatorioData = null;
    const filePicker = getEl('recordatorioFileInput');
    if (filePicker) {
      filePicker.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const inputArchivo = getEl('recordatorioArchivo');
          if (inputArchivo) {
            inputArchivo.value = file.name;
          }
          const reader = new FileReader();
          reader.onload = function(evt) {
            archivoRecordatorioData = evt.target.result;
          };
          reader.readAsDataURL(file);
        } else {
          archivoRecordatorioData = null;
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
              archivo,
              archivoData: archivoRecordatorioData || recordatorios[idx].archivoData
            };
          }
        } else {
          recordatorios.unshift({
            id: Date.now(),
            titulo,
            resumen,
            fecha,
            archivo,
            archivoData: archivoRecordatorioData
          });
        }

        archivoRecordatorioData = null;
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

  // ── Generador y Descargador de PDF Oficial para Recordatorios ─────────
  window.descargarPDFRecordatorio = function(id) {
    const item = recordatorios.find(r => String(r.id) === String(id));
    if (!item) return;

    const curso = sessionStorage.getItem('cursoActivo') || localStorage.getItem('cursoActivo') || '4B';
    const materia = sessionStorage.getItem('materiaActiva') || localStorage.getItem('materiaActiva') || 'Matemáticas';
    const nombreArchivo = (item.archivo && item.archivo.toLowerCase().endsWith('.pdf')) 
      ? item.archivo 
      : `${(item.titulo || 'Recordatorio').replace(/[^a-zA-Z0-9_-]/g, '_')}_${curso}.pdf`;

    if (item.archivoData && item.archivoData.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = item.archivoData;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const sanitizar = (s) => (s || '').replace(/[\r\n\t]/g, ' ').replace(/[\\()]/g, '');
    const tit = sanitizar(item.titulo);
    const cur = sanitizar(curso);
    const mat = sanitizar(materia);
    const fec = sanitizar(item.fecha);
    const arch = sanitizar(item.archivo || 'resumen_clase.pdf');
    const rawDesc = sanitizar(item.resumen || 'Sin resumen o consignas detalladas.');

    const palabras = rawDesc.split(' ');
    const descLineas = [];
    let lineaActual = '';
    palabras.forEach(p => {
      if ((lineaActual + ' ' + p).trim().length > 60) {
        descLineas.push(lineaActual.trim());
        lineaActual = p;
      } else {
        lineaActual += ' ' + p;
      }
    });
    if (lineaActual.trim()) descLineas.push(lineaActual.trim());

    let stream = `BT
/F1 18 Tf
50 730 Td
(EDUCTRACK - RESUMEN DE CLASE Y RECORDATORIO) Tj
0 -26 Td
/F1 13 Tf
(Materia: ${mat}   |   Curso: ${cur}) Tj
0 -20 Td
/F2 10 Tf
(Fecha del Recordatorio / Clase: ${fec}) Tj
0 -16 Td
(Archivo adjunto de referencia: ${arch}) Tj
0 -28 Td
/F1 12 Tf
(TEMA / TITULO DEL RECORDATORIO:) Tj
0 -18 Td
/F2 11 Tf
(${tit}) Tj
0 -24 Td
/F1 11 Tf
(Resumen de lo trabajado en clase / Avisos importantes:) Tj
/F2 10 Tf
`;

    let yOffset = -16;
    descLineas.forEach(l => {
      stream += `0 ${yOffset} Td\n(${l}) Tj\n`;
      yOffset = -14;
    });

    stream += `0 -45 Td
/F1 9 Tf
(---------------------------------------------------------------------------------------------------) Tj
0 -16 Td
/F2 8 Tf
(Documento generado institucionalmente por la plataforma EduTrack.) Tj
ET`;

    const streamBytes = new TextEncoder().encode(stream);
    const streamLen = streamBytes.length;

    const obj1 = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n";
    const obj2 = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n";
    const obj3 = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj\n";
    const obj4 = `4 0 obj << /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`;
    const obj5 = "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n";
    const obj6 = "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n";

    const header = "%PDF-1.4\n";
    const body = obj1 + obj2 + obj3 + obj4 + obj5 + obj6;
    const fullText = header + body;
    const offset = new TextEncoder().encode(fullText).length;

    const xref = `xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300 00000 n 
0000000375 00000 n 
trailer << /Size 7 /Root 1 0 R >>
startxref
${offset}
%%EOF`;

    const blob = new Blob([fullText + xref], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

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
