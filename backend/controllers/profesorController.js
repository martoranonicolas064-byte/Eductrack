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
            const key = cm.curso_nombre || '4B';
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
                `SELECT r.id_recordatorio AS id_pendiente, r.titulo, 'recordatorio' AS tipo, r.fecha_limite AS fecha_entrega 
                 FROM recordatorio r
                 JOIN asignacion a ON r.id_asignacion = a.id_asignacion
                 WHERE a.id_profesor = ?
                 ORDER BY r.fecha_limite ASC LIMIT 5`,
                [id_profesor]
            );
            pendientes = recRows;
        }

        const nombreCompleto = `${profesorData.nombre || ''} ${profesorData.apellido || ''}`.trim() || profesorData.usuario;

        // Próximo evento real (o null si no hay pendientes creados)
        let proximaReunion = null;
        if (pendientes.length > 0 && pendientes[0].fecha_entrega) {
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
 * Consultar alumnos de un curso específico de forma segura desde TiDB Cloud
 */
const getAlumnosPorCurso = async (req, res) => {
    try {
        const { id_curso } = req.params;

        const [alumnos] = await mysqlPool.query(
            `SELECT id_alumno, nombre, apellido, usuario, id_curso 
             FROM alumno 
             WHERE id_curso = ? 
             ORDER BY apellido ASC, nombre ASC`,
            [id_curso]
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

module.exports = {
    getDashboard,
    getAlumnosPorCurso
};
