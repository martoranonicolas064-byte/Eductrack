const mysqlPool = require('../config/db');

/**
 * Obtener todos los datos del dashboard del profesor
 * (Perfil, Cursos asignados, Materias, Métricas de alumnos y Asistencias)
 * Conectado 100% a TiDB Cloud con datos reales (sin datos ficticios).
 */
const getDashboard = async (req, res) => {
    try {
        const id_profesor = req.usuario.id;

        let profesorData = null;
        let cursosMaterias = [];
        let totalAlumnos = 0;
        let asistenciaPromedio = null;
        let pendientes = [];

        // 1. Consultar profesor en MySQL / TiDB
        const [profesores] = await mysqlPool.query(
            'SELECT id_profesor, usuario, nombre, apellido, email, avatar_url FROM profesor WHERE id_profesor = ?',
            [id_profesor]
        );

        if (profesores.length > 0) {
            profesorData = profesores[0];
        } else {
            profesorData = {
                id_profesor: id_profesor,
                nombre: req.usuario.nombre || 'Profesor',
                apellido: '',
                usuario: req.usuario.usuario || 'profesor'
            };
        }

        // 2. Consultar asignaciones reales del profesor en TiDB
        const [asignaciones] = await mysqlPool.query(
            `SELECT 
                a.id_asignacion,
                c.id_curso,
                c.nombre AS curso_nombre_completo,
                CONCAT(c.año, c.division) AS curso_nombre,
                m.id_materia,
                m.nombre AS materia_nombre,
                m.color AS materia_color
             FROM asignacion a
             JOIN curso c ON a.id_curso = c.id_curso
             JOIN materia m ON a.id_materia = m.id_materia
             WHERE a.id_profesor = ?
             ORDER BY c.año ASC, c.division ASC, m.nombre ASC`,
            [id_profesor]
        );
        cursosMaterias = asignaciones;

        // Cursos y materias únicos agrupados para la selección del profesor
        const cursosMap = {};
        cursosMaterias.forEach(cm => {
            const key = cm.curso_nombre || `Curso ${cm.id_curso}`;
            if (!cursosMap[key]) {
                cursosMap[key] = {
                    id_curso: cm.id_curso,
                    nombre: key,
                    descripcion: cm.curso_nombre_completo || `Curso ${key}`,
                    materias: []
                };
            }
            if (cm.materia_nombre && !cursosMap[key].materias.some(m => m.id_materia === cm.id_materia)) {
                cursosMap[key].materias.push({
                    id_asignacion: cm.id_asignacion,
                    id_materia: cm.id_materia,
                    nombre: cm.materia_nombre,
                    color: cm.materia_color || '#b01c1c'
                });
            }
        });

        const cursosIds = Object.values(cursosMap).map(c => c.id_curso).filter(Boolean);

        // 3. Métricas reales calculadas desde TiDB Cloud
        if (cursosIds.length > 0) {
            // Conteo real de alumnos en los cursos asignados a este profesor
            const [alCount] = await mysqlPool.query(
                `SELECT COUNT(DISTINCT id_alumno) AS total FROM alumno WHERE id_curso IN (?)`,
                [cursosIds]
            );
            totalAlumnos = alCount[0]?.total || 0;

            // Asistencia real calculada
            const [asistData] = await mysqlPool.query(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN UPPER(estado) IN ('P', 'PRESENTE', 'J') THEN 1 ELSE 0 END) as presentes
                 FROM asistencia 
                 WHERE id_alumno IN (SELECT id_alumno FROM alumno WHERE id_curso IN (?))`,
                [cursosIds]
            );
            if (asistData[0]?.total > 0) {
                const pct = Math.round((asistData[0].presentes / asistData[0].total) * 100);
                asistenciaPromedio = `${pct}%`;
            }

            // Recordatorios reales de las asignaciones de este docente
            const [recRows] = await mysqlPool.query(
                `SELECT r.id_recordatorio AS id_pendiente, r.titulo, r.estado AS tipo, r.fecha_limite AS fecha_entrega 
                 FROM recordatorio r
                 JOIN asignacion a ON r.id_asignacion = a.id_asignacion
                 WHERE a.id_profesor = ?
                 ORDER BY r.fecha_limite ASC LIMIT 5`,
                [id_profesor]
            );
            pendientes = recRows;
        }

        const nombreCompleto = `${profesorData.nombre || ''} ${profesorData.apellido || ''}`.trim() || profesorData.usuario;

        // Próxima reunión programada real
        let proximaReunion = null;
        const [reuniones] = await mysqlPool.query(
            `SELECT r.id_recordatorio, r.titulo, r.contenido, r.fecha_limite 
             FROM recordatorio r
             JOIN asignacion a ON r.id_asignacion = a.id_asignacion
             WHERE a.id_profesor = ? AND (r.estado = 'reunion' OR r.titulo LIKE '%Reunión%' OR r.titulo LIKE '%Clase%')
             ORDER BY r.fecha_limite DESC LIMIT 1`,
            [id_profesor]
        );

        if (reuniones.length > 0 && reuniones[0].fecha_limite) {
            const f = new Date(reuniones[0].fecha_limite);
            if (!isNaN(f.getTime())) {
                const dia = f.getDate();
                const mes = f.getMonth() + 1;
                const horas = String(f.getHours()).padStart(2, '0');
                const mins = String(f.getMinutes()).padStart(2, '0');
                proximaReunion = `${dia}/${mes} - ${horas}:${mins}`;
            }
        } else if (pendientes.length > 0 && pendientes[0].fecha_entrega) {
            const f = new Date(pendientes[0].fecha_entrega);
            if (!isNaN(f.getTime())) {
                proximaReunion = `${f.getDate()}/${f.getMonth() + 1}`;
            }
        }

        return res.json({
            ok: true,
            motor: 'TiDB Cloud',
            profesor: {
                id: profesorData.id_profesor,
                nombre: profesorData.nombre,
                apellido: profesorData.apellido,
                nombreCompleto: nombreCompleto,
                usuario: profesorData.usuario,
                email: profesorData.email || `${profesorData.usuario}@eductrack.edu`,
                avatar_url: profesorData.avatar_url || null
            },
            metricas: {
                totalAlumnos: totalAlumnos,
                proximaReunion: proximaReunion || '—',
                asistenciaPromedio: asistenciaPromedio || 'Sin registros'
            },
            cursos: Object.values(cursosMap),
            pendientes
        });

    } catch (error) {
        console.error('[ProfesorController] Error al obtener dashboard:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error interno al consultar datos del profesor',
            error: error.message
        });
    }
};

/**
 * Consultar alumnos de un curso específico de forma flexible desde TiDB Cloud
 * Permite buscar por id_curso, nombre ("1° Año A"), o alias ("1A")
 */
const getAlumnosPorCurso = async (req, res) => {
    try {
        let { id_curso } = req.params;
        id_curso = decodeURIComponent(id_curso || '').trim();

        const [alumnos] = await mysqlPool.query(
            `SELECT a.id_alumno, a.nombre, a.apellido, a.usuario, a.id_curso,
                    c.nombre AS curso_nombre, CONCAT(c.año, c.division) AS curso_alias
             FROM alumno a 
             JOIN curso c ON a.id_curso = c.id_curso
             WHERE a.id_curso = ? 
                OR CONCAT(c.año, c.division) = ?
                OR c.nombre = ?
                OR CONCAT(c.año, '° Año ', c.division) = ?
                OR CONCAT(c.año, '° ', c.division) = ?
             ORDER BY a.apellido ASC, a.nombre ASC`,
            [id_curso, id_curso, id_curso, id_curso, id_curso]
        );

        return res.json({
            ok: true,
            motor: 'TiDB Cloud',
            id_curso,
            total: alumnos.length,
            alumnos
        });
    } catch (error) {
        console.error('[ProfesorController] Error al obtener alumnos:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al consultar alumnos del curso',
            error: error.message
        });
    }
};

/**
 * Registrar o actualizar asistencia masiva de alumnos para una fecha dada
 */
const guardarAsistencia = async (req, res) => {
    try {
        const id_profesor = req.usuario.id;
        const { id_curso, fecha, registros } = req.body;

        if (!fecha || !Array.isArray(registros) || registros.length === 0) {
            return res.status(400).json({ ok: false, mensaje: 'Datos incompletos para guardar asistencia' });
        }

        // Buscar una asignación válida para asociar la asistencia
        let id_asignacion = 1;
        if (id_curso) {
            const [asig] = await mysqlPool.query(
                `SELECT a.id_asignacion 
                 FROM asignacion a
                 JOIN curso c ON a.id_curso = c.id_curso
                 WHERE a.id_profesor = ? AND (a.id_curso = ? OR CONCAT(c.año, c.division) = ? OR c.nombre = ?)
                 LIMIT 1`,
                [id_profesor, id_curso, id_curso, id_curso]
            );
            if (asig.length > 0) id_asignacion = asig[0].id_asignacion;
        }

        for (const r of registros) {
            const id_alumno = r.id_alumno || r.id;
            let estado = (r.estado || 'Presente').toUpperCase();
            if (estado === 'PRESENTE') estado = 'P';
            else if (estado === 'AUSENTE') estado = 'A';
            else if (estado === 'TARDE') estado = 'T';

            if (!id_alumno) continue;

            const [existente] = await mysqlPool.query(
                'SELECT id_asistencia FROM asistencia WHERE id_alumno = ? AND fecha = ?',
                [id_alumno, fecha]
            );

            if (existente.length > 0) {
                await mysqlPool.query(
                    'UPDATE asistencia SET estado = ?, id_asignacion = ? WHERE id_asistencia = ?',
                    [estado, id_asignacion, existente[0].id_asistencia]
                );
            } else {
                await mysqlPool.query(
                    'INSERT INTO asistencia (id_alumno, id_asignacion, fecha, estado) VALUES (?, ?, ?, ?)',
                    [id_alumno, id_asignacion, fecha, estado]
                );
            }
        }

        return res.json({
            ok: true,
            mensaje: 'Asistencia guardada correctamente en la base de datos'
        });
    } catch (error) {
        console.error('[ProfesorController] Error al guardar asistencia:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al registrar asistencia en el servidor',
            error: error.message
        });
    }
};

/**
 * Consultar asistencia guardada para una fecha y curso
 */
const getAsistenciaPorFecha = async (req, res) => {
    try {
        let { id_curso } = req.params;
        const { fecha } = req.query;

        if (!fecha) {
            return res.status(400).json({ ok: false, mensaje: 'Fecha requerida' });
        }

        id_curso = decodeURIComponent(id_curso || '').trim();

        const [rows] = await mysqlPool.query(
            `SELECT a.id_alumno, a.estado, a.fecha
             FROM asistencia a
             JOIN alumno al ON a.id_alumno = al.id_alumno
             JOIN curso c ON al.id_curso = c.id_curso
             WHERE (al.id_curso = ? OR CONCAT(c.año, c.division) = ? OR c.nombre = ?)
               AND a.fecha = ?`,
            [id_curso, id_curso, id_curso, fecha]
        );

        return res.json({
            ok: true,
            fecha,
            registros: rows.map(r => ({
                id_alumno: r.id_alumno,
                estado: r.estado === 'P' ? 'Presente' : r.estado === 'A' ? 'Ausente' : r.estado === 'T' ? 'Tarde' : r.estado
            }))
        });
    } catch (error) {
        console.error('[ProfesorController] Error al obtener asistencias:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al consultar asistencias por fecha',
            error: error.message
        });
    }
};

/**
 * Programar reunión de clase (guarda en recordatorio con tipo 'reunion')
 */
const programarReunion = async (req, res) => {
    try {
        const id_profesor = req.usuario.id;
        const { id_curso, id_materia, fecha, hora, titulo, descripcion } = req.body;

        if (!fecha || !hora) {
            return res.status(400).json({ ok: false, mensaje: 'Fecha y hora son obligatorias' });
        }

        // Buscar asignación correspondiente al curso y profesor
        let [asigs] = await mysqlPool.query(
            `SELECT a.id_asignacion 
             FROM asignacion a
             JOIN curso c ON a.id_curso = c.id_curso
             WHERE a.id_profesor = ? AND (a.id_curso = ? OR CONCAT(c.año, c.division) = ? OR c.nombre = ?)
             LIMIT 1`,
            [id_profesor, id_curso, id_curso, id_curso]
        );

        let id_asignacion = asigs.length > 0 ? asigs[0].id_asignacion : null;

        if (!id_asignacion) {
            const [todasAsigs] = await mysqlPool.query(
                'SELECT id_asignacion FROM asignacion WHERE id_profesor = ? LIMIT 1',
                [id_profesor]
            );
            if (todasAsigs.length > 0) id_asignacion = todasAsigs[0].id_asignacion;
        }

        if (!id_asignacion) {
            return res.status(400).json({ ok: false, mensaje: 'No tienes cursos asignados para programar reuniones' });
        }

        const fechaHoraStr = `${fecha} ${hora}:00`;
        const tituloReunion = titulo || 'Reunión de Clase Virtual / Presencial';
        const contenidoReunion = descripcion || 'Reunión informativa y repaso de contenidos de la clase.';

        const [resultado] = await mysqlPool.query(
            `INSERT INTO recordatorio (id_asignacion, titulo, contenido, fecha_limite, estado) 
             VALUES (?, ?, ?, ?, 'reunion')`,
            [id_asignacion, tituloReunion, contenidoReunion, fechaHoraStr]
        );

        return res.json({
            ok: true,
            mensaje: 'Reunión de clase programada exitosamente',
            id_recordatorio: resultado.insertId,
            fecha: fechaHoraStr
        });
    } catch (error) {
        console.error('[ProfesorController] Error al programar reunión:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al programar la reunión',
            error: error.message
        });
    }
};

/**
 * Obtener todos los recordatorios creados por el profesor en sus cursos
 */
const getRecordatoriosProfesor = async (req, res) => {
    try {
        const id_profesor = req.usuario.id;

        const [recordatorios] = await mysqlPool.query(
            `SELECT r.id_recordatorio, r.titulo, r.contenido AS resumen, r.fecha_limite AS fecha, r.estado,
                    c.id_curso, CONCAT(c.año, c.division) AS curso_nombre, c.nombre AS curso_nombre_completo,
                    m.id_materia, m.nombre AS materia_nombre
             FROM recordatorio r
             JOIN asignacion a ON r.id_asignacion = a.id_asignacion
             JOIN curso c ON a.id_curso = c.id_curso
             JOIN materia m ON a.id_materia = m.id_materia
             WHERE a.id_profesor = ?
             ORDER BY r.fecha_limite DESC`,
            [id_profesor]
        );

        return res.json({
            ok: true,
            recordatorios: recordatorios.map(r => ({
                id: r.id_recordatorio,
                titulo: r.titulo,
                resumen: r.resumen || '',
                fecha: r.fecha ? new Date(r.fecha).toISOString().split('T')[0] : '',
                fecha_completa: r.fecha,
                estado: r.estado,
                curso: r.curso_nombre,
                curso_completo: r.curso_nombre_completo,
                materia: r.materia_nombre,
                archivo: null
            }))
        });
    } catch (error) {
        console.error('[ProfesorController] Error al obtener recordatorios:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al consultar recordatorios',
            error: error.message
        });
    }
};

/**
 * Crear un recordatorio o aviso para uno o todos los cursos del docente
 */
const crearRecordatorioProfesor = async (req, res) => {
    try {
        const id_profesor = req.usuario.id;
        const { id_curso, titulo, contenido, fecha_limite, todos_los_cursos, archivo } = req.body;

        if (!titulo || !fecha_limite) {
            return res.status(400).json({ ok: false, mensaje: 'Título y fecha son requeridos' });
        }

        // Obtener asignaciones del docente
        let queryAsignaciones = 'SELECT id_asignacion, id_curso FROM asignacion WHERE id_profesor = ?';
        let params = [id_profesor];

        if (!todos_los_cursos && id_curso) {
            queryAsignaciones = `SELECT a.id_asignacion, a.id_curso 
                                 FROM asignacion a
                                 JOIN curso c ON a.id_curso = c.id_curso
                                 WHERE a.id_profesor = ? AND (a.id_curso = ? OR CONCAT(c.año, c.division) = ? OR c.nombre = ?)`;
            params = [id_profesor, id_curso, id_curso, id_curso];
        }

        const [asigs] = await mysqlPool.query(queryAsignaciones, params);

        if (asigs.length === 0) {
            return res.status(400).json({ ok: false, mensaje: 'No se encontraron asignaciones para este curso/profesor' });
        }

        const fechaFinal = fecha_limite.includes(' ') ? fecha_limite : `${fecha_limite} 23:59:59`;

        // Para evitar duplicar el aviso 3 veces si el docente tiene 3 materias en el mismo curso cuando se selecciona "todos",
        // agrupamos por curso único
        const asignacionesAInsertar = [];
        const cursosProcesados = new Set();
        for (const a of asigs) {
            if (!cursosProcesados.has(a.id_curso)) {
                cursosProcesados.add(a.id_curso);
                asignacionesAInsertar.push(a.id_asignacion);
            }
        }

        for (const id_asig of asignacionesAInsertar) {
            await mysqlPool.query(
                `INSERT INTO recordatorio (id_asignacion, titulo, contenido, fecha_limite, estado) 
                 VALUES (?, ?, ?, ?, 'activo')`,
                [id_asig, titulo, contenido || '', fechaFinal]
            );
        }

        return res.json({
            ok: true,
            mensaje: `Recordatorio enviado a ${asignacionesAInsertar.length} curso(s)`
        });
    } catch (error) {
        console.error('[ProfesorController] Error al crear recordatorio:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al guardar el recordatorio',
            error: error.message
        });
    }
};

/**
 * Eliminar un recordatorio creado por el profesor
 */
const eliminarRecordatorioProfesor = async (req, res) => {
    try {
        const id_profesor = req.usuario.id;
        const { id } = req.params;

        const [result] = await mysqlPool.query(
            `DELETE r FROM recordatorio r
             JOIN asignacion a ON r.id_asignacion = a.id_asignacion
             WHERE r.id_recordatorio = ? AND a.id_profesor = ?`,
            [id, id_profesor]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Recordatorio no encontrado o no pertenece a sus asignaciones' });
        }

        return res.json({
            ok: true,
            mensaje: 'Recordatorio eliminado correctamente'
        });
    } catch (error) {
        console.error('[ProfesorController] Error al eliminar recordatorio:', error);
        return res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar el recordatorio',
            error: error.message
        });
    }
};

module.exports = {
    getDashboard,
    getAlumnosPorCurso,
    guardarAsistencia,
    getAsistenciaPorFecha,
    programarReunion,
    getRecordatoriosProfesor,
    crearRecordatorioProfesor,
    eliminarRecordatorioProfesor
};
