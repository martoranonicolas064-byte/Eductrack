/**
 * EducTrack — Lógica y Gestión de Recordatorios y Pendientes
 * Conectado en tiempo real a la base de datos TiDB Cloud
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'educTrack_recordatorios';
  let recordatorios = [];
  let cursosDocente = [];
  let recordatorioActivoId = null;
  let archivoSeleccionadoBase64 = null;

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

  // ── Sincronizar Contexto Institucional ───────────────────────────────
  function sincronizarContexto() {
    const curso = sessionStorage.getItem('cursoActivo') || localStorage.getItem('cursoActivo') || '4B';
    const materia = sessionStorage.getItem('materiaActiva') || localStorage.getItem('materiaActiva') || 'Matemáticas';
    const label = getEl('labelCursoPendientes', '.course-badge span');
    if (label) {
      label.textContent = `${curso} • ${materia}`;
    }
  }

  // ── Cargar cursos del docente para el selector ──────────────────────
  async function cargarCursosDocente() {
    const select = getEl('recordatorioCursoSelect');
    if (!select) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const API_BASE = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';
    try {
      const res = await fetch(`${API_BASE}/api/profesor/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.cursos)) {
          cursosDocente = data.cursos;
          select.innerHTML = '<option value="todos">Todos mis cursos asignados</option>';
          cursosDocente.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id_curso;
            opt.textContent = `${c.nombre} (${c.descripcion || 'Curso'})`;
            select.appendChild(opt);
          });
          const activoId = sessionStorage.getItem('cursoActivoId');
          if (activoId) select.value = activoId;
        }
      }
    } catch (e) {
      console.warn('[Recordatorios] Error al cargar cursos:', e);
    }
  }

  // ── Carga y Persistencia desde TiDB Cloud ───────────────────────────
  async function cargarRecordatorios() {
    const token = localStorage.getItem('token');
    const API_BASE = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/api/profesor/recordatorios`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.recordatorios)) {
            recordatorios = data.recordatorios;
            guardarRecordatoriosLocal();
            renderizar();
            return;
          }
        }
      } catch (e) {
        console.warn('[EducTrack] Servidor backend no alcanzable, usando caché local:', e);
      }
    }

    try {
      const dataRaw = localStorage.getItem(STORAGE_KEY);
      if (dataRaw) {
        const parsed = JSON.parse(dataRaw);
        if (Array.isArray(parsed)) {
          recordatorios = parsed;
        }
      }
    } catch (e) {
      console.warn('[EducTrack] Error al leer recordatorios de localStorage:', e);
      recordatorios = [];
    }
    renderizar();
  }

  function guardarRecordatoriosLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recordatorios));
    } catch (e) {
      console.error('[EducTrack] Error al guardar en localStorage:', e);
    }
  }

  // ── Formateo de Fecha Robusto ────────────────────────────────────────
  function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    try {
      const partes = String(fechaStr).split(/[-/T ]/);
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
        (item.curso && item.curso.toLowerCase().includes(textoBusqueda));

      const coincideFecha = !fechaFiltro || (item.fecha && item.fecha.startsWith(fechaFiltro));

      return coincideTexto && coincideFecha;
    });

    lista.innerHTML = '';

    if (filtrados.length === 0) {
      lista.innerHTML = `
        <li class="empty-state" style="padding:28px 16px; text-align:center; color:rgba(255,255,255,0.65);">
          <i class="fa-regular fa-folder-open" style="font-size:2rem; color:rgba(255,59,59,0.5); display:block; margin-bottom:8px;"></i>
          <p>No hay recordatorios registrados aún.</p>
          <p style="font-size:12px; color:rgba(255,255,255,0.45); margin-top:4px;">Haz clic en "Crear recordatorio" para enviar un aviso a tus cursos.</p>
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

      const cursoTag = item.curso ? `<span style="background:rgba(255,59,59,0.25); border:1px solid rgba(255,59,59,0.4); padding:2px 7px; border-radius:6px; font-size:11px; font-weight:700; color:#fff; margin-right:6px;">${escapeHtml(item.curso)}</span>` : '';
      const tieneArchivo = Boolean(item.archivo && item.archivo.trim());
      const iconoArchivo = item.estado === 'reunion'
        ? '<i class="fa-solid fa-video" style="color: #60a5fa;"></i>'
        : (tieneArchivo ? '<i class="fa-solid fa-file-pdf"></i>' : '<i class="fa-regular fa-bell"></i>');

      li.innerHTML = `
        <div class="file-item__icon">${iconoArchivo}</div>
        <div class="file-item__info">
          <span class="file-item__name">${cursoTag}${escapeHtml(item.titulo)}</span>
          <span class="file-item__meta">
            <i class="fa-regular fa-calendar"></i> ${formatearFecha(item.fecha)}
            ${item.materia ? `&bull; ${escapeHtml(item.materia)}` : ''}
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

    if (detalleTitulo) {
      const curTxt = item.curso ? `[${item.curso}] ` : '';
      detalleTitulo.textContent = `${curTxt}${item.titulo}`;
    }

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

  // ── Formulario: Crear ───────────────────────────────────────────────
  function abrirModalCrear() {
    const modal = getEl('modalRecordatorio');
    const form = getEl('formRecordatorio');
    const inputId = getEl('recordatorioId');
    const inputTitulo = getEl('recordatorioTitulo');
    const inputFecha = getEl('recordatorioFecha');
    const inputArchivo = getEl('recordatorioArchivo');
    const inputFileInput = getEl('recordatorioFileInput');
    const modalTitulo = getEl('modalTitulo');

    archivoSeleccionadoBase64 = null;
    if (form) form.reset();
    if (inputId) inputId.value = '';
    if (inputArchivo) inputArchivo.value = '';
    if (inputFileInput) inputFileInput.value = '';
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

    // Detección y lectura de archivo adjunto / PDF
    const fileInput = getEl('recordatorioFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const inputArchivo = getEl('recordatorioArchivo');
          if (inputArchivo) inputArchivo.value = file.name;
          const reader = new FileReader();
          reader.onload = (evt) => {
            archivoSeleccionadoBase64 = evt.target.result;
          };
          reader.readAsDataURL(file);
        } else {
          archivoSeleccionadoBase64 = null;
        }
      });
    }

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

    const btnEliminar = getEl('btnEliminarTarea');
    if (btnEliminar) {
      btnEliminar.addEventListener('click', async () => {
        if (!recordatorioActivoId) return;
        if (confirm('¿Desea eliminar este recordatorio?')) {
          const token = localStorage.getItem('token');
          const API_BASE = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';
          try {
            await fetch(`${API_BASE}/api/profesor/recordatorios/${recordatorioActivoId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (e) {
            console.warn('Error al eliminar en backend:', e);
          }
          recordatorios = recordatorios.filter(r => String(r.id) !== String(recordatorioActivoId));
          guardarRecordatoriosLocal();
          cerrarDetalle();
          renderizar();
        }
      });
    }

    const form = getEl('formRecordatorio');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputTitulo = getEl('recordatorioTitulo');
        const inputResumen = getEl('recordatorioResumen');
        const inputFecha = getEl('recordatorioFecha');
        const selectCurso = getEl('recordatorioCursoSelect');
        const inputArchivo = getEl('recordatorioArchivo');

        const titulo = inputTitulo ? inputTitulo.value.trim() : '';
        const resumen = inputResumen ? inputResumen.value.trim() : '';
        const fecha = inputFecha ? inputFecha.value : '';
        const cursoVal = selectCurso ? selectCurso.value : 'todos';
        const archivoNombre = inputArchivo ? inputArchivo.value.trim() : '';

        if (!titulo || !resumen || !fecha) {
          alert('Por favor complete todos los campos obligatorios (Título, Resumen y Fecha).');
          return;
        }

        const token = localStorage.getItem('token');
        const API_BASE = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';

        try {
          const res = await fetch(`${API_BASE}/api/profesor/recordatorios`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id_curso: cursoVal === 'todos' ? null : cursoVal,
              todos_los_cursos: cursoVal === 'todos',
              titulo,
              contenido: resumen,
              fecha_limite: fecha,
              archivo: archivoNombre || null,
              archivo_data: archivoSeleccionadoBase64 || null
            })
          });
          const data = await res.json();
          if (data.ok) {
            alert('¡Recordatorio y archivo PDF publicados con éxito para los estudiantes!');
            await cargarRecordatorios();
          } else {
            alert(data.mensaje || 'Error al guardar recordatorio');
          }
        } catch (err) {
          console.error('Error al guardar recordatorio:', err);
          alert('Recordatorio guardado localmente');
        }

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

    const curso = item.curso || sessionStorage.getItem('cursoActivo') || '4B';
    const materia = item.materia || sessionStorage.getItem('materiaActiva') || 'General';
    const nombreArchivo = (item.archivo && item.archivo.toLowerCase().endsWith('.pdf')) 
      ? item.archivo 
      : `${(item.titulo || 'Recordatorio').replace(/[^a-zA-Z0-9_-]/g, '_')}_${curso}.pdf`;

    // Si se subió un archivo real en base64
    if (item.archivo_data && item.archivo_data.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = item.archivo_data;
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
(EDUCTRACK - RECORDATORIO INSTITUCIONAL) Tj
0 -26 Td
/F1 13 Tf
(Materia: ${mat}   |   Curso: ${cur}) Tj
0 -20 Td
/F2 10 Tf
(Fecha del Recordatorio / Plazo: ${fec}) Tj
0 -28 Td
/F1 12 Tf
(ASUNTO / TITULO:) Tj
0 -18 Td
/F2 11 Tf
(${tit}) Tj
0 -24 Td
/F1 11 Tf
(Instrucciones / Informacion:) Tj
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
  async function init() {
    sincronizarContexto();
    inicializarEventos();
    await cargarCursosDocente();
    await cargarRecordatorios();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
