const pool = require('../config/db');

/**
 * Obtener todos los datos necesarios para el portal del alumno
 * (Perfil, Notas, Asistencia, Recordatorios, Archivos)
 */
const getDashboard = async (req, res) => {
    try {
        const id_alumno = req.usuario.id;

        // 1. Datos del alumno y su curso
        const [alumnos] = await pool.query(
            `SELECT a.id_alumno, a.nombre, a.apellido, a.usuario, a.id_curso,
                    c.año, c.division, c.turno
             FROM alumno a
             LEFT JOIN curso c ON a.id_curso = c.id_curso
             WHERE a.id_alumno = ?`,
            [id_alumno]
        );

        if (alumnos.length === 0) {
            return res.status(404).json({ mensaje: 'Alumno no encontrado' });
        }

        const alumnoData = alumnos[0];
        const cursoNombre = alumnoData.año && alumnoData.division 
            ? `${alumnoData.año}° Año ${alumnoData.division}` 
            : '4° Año B';

        const legajo = `ALU-2026-${String(alumnoData.id_alumno).padStart(4, '0')}`;

        // 2. Calificaciones desde la BD
        const [notas] = await pool.query(
            `SELECT n.id_nota, m.nombre AS materia, n.periodo, CAST(n.nota AS DECIMAL(4,1)) AS nota
             FROM nota n
             JOIN asignacion a ON n.id_asignacion = a.id_asignacion
             JOIN materia m ON a.id_materia = m.id_materia
             WHERE n.id_alumno = ?
             ORDER BY n.id_nota ASC`,
            [id_alumno]
        );

        // Si hay notas en la BD las formateamos, si no usamos calificaciones de muestra
        let grades = [];
        if (notas.length > 0) {
            grades = notas.map(n => ({
                subject: n.materia,
                title: n.periodo || 'Evaluación',
                score: parseFloat(n.nota) || 7.0,
                ponderacion: '25%'
            }));
        } else {
            grades = [
                { subject: 'Matemática', title: 'Trabajo Práctico 1', score: 9.0, ponderacion: '20%' },
                { subject: 'Lengua y Literatura', title: 'Examen de Sintaxis', score: 8.5, ponderacion: '30%' },
                { subject: 'Historia', title: 'Presentación Oral', score: 10.0, ponderacion: '25%' },
                { subject: 'Física', title: 'Laboratorio Parcial', score: 7.5, ponderacion: '25%' }
            ];
        }

        // 3. Asistencias desde la BD
        const [asistencias] = await pool.query(
            `SELECT estado, COUNT(*) as cantidad 
             FROM asistencia 
             WHERE id_alumno = ? 
             GROUP BY estado`,
            [id_alumno]
        );

        let present = 0;
        let absent = 0;
        let late = 0;

        asistencias.forEach(a => {
            const est = (a.estado || '').toUpperCase();
            if (est === 'P' || est === 'PRESENTE') present += a.cantidad;
            else if (est === 'A' || est === 'AUSENTE') absent += a.cantidad;
            else if (est === 'T' || est === 'TARDE' || est === 'ATRASO') late += a.cantidad;
            else if (est === 'J' || est === 'JUSTIFICADO') present += a.cantidad; // Justificado cuenta como presente o no computable
        });

        if (present === 0 && absent === 0 && late === 0) {
            present = 28;
            absent = 2;
            late = 1;
        }

        // 4. Recordatorios y tareas del curso
        const id_curso = alumnoData.id_curso || 1;
        const [recordatorios] = await pool.query(
            `SELECT r.id_recordatorio, r.titulo, r.contenido, r.fecha_limite, r.estado,
                    m.nombre AS materia
             FROM recordatorio r
             JOIN asignacion a ON r.id_asignacion = a.id_asignacion
             JOIN materia m ON a.id_materia = m.id_materia
             WHERE a.id_curso = ?
             ORDER BY r.fecha_limite ASC`,
            [id_curso]
        );

        let reminders = [];
        if (recordatorios.length > 0) {
            reminders = recordatorios.map(r => {
                const fecha = new Date(r.fecha_limite);
                return {
                    id: r.id_recordatorio,
                    month: isNaN(fecha.getMonth()) ? 9 : fecha.getMonth(),
                    day: isNaN(fecha.getDate()) ? 15 : fecha.getDate(),
                    category: (r.materia || 'GENERAL').toUpperCase(),
                    text: `${r.titulo}: ${r.contenido || ''}`.trim(),
                    pdf: r.titulo.toLowerCase().includes('guía') || r.titulo.toLowerCase().includes('guia') 
                         ? 'ejercicios_math.pdf' 
                         : null
                };
            });
        } else {
            reminders = [
                { month: 9, day: 1, category: 'MATEMATICA', text: 'Chicos recuerden entregar el trabajo practico mañana', pdf: null },
                { month: 9, day: 30, category: 'LENGUA Y LITERATURA', text: 'estudien este pdf para la prueba', pdf: 'material_estudio.pdf' },
                { month: 9, day: 5, category: 'LENGUA Y LITERATURA', text: 'Entrega de ejercicio de Lengua', pdf: null },
                { month: 9, day: 10, category: 'MATEMATICA', text: 'Revisión de carpetas', pdf: 'ejercicios_math.pdf' }
            ];
        }

        // 5. Archivos del curso
        const [archivos] = await pool.query(
            `SELECT ar.id_archivo, ar.nombre, ar.url_archivo, ar.fecha_subida,
                    m.nombre AS materia
             FROM archivo ar
             JOIN asignacion a ON ar.id_asignacion = a.id_asignacion
             JOIN materia m ON a.id_materia = m.id_materia
             WHERE a.id_curso = ?
             ORDER BY ar.fecha_subida DESC`,
            [id_curso]
        );

        let files = [];
        if (archivos.length > 0) {
            files = archivos.map(f => {
                const d = new Date(f.fecha_subida);
                const dia = d.getDate();
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const fechaLegible = `${String(dia).padStart(2, '0')} ${meses[d.getMonth()] || 'Sep'}`;
                return {
                    id: f.id_archivo,
                    name: f.nombre,
                    size: '1.2 MB',
                    date: fechaLegible,
                    url: f.url_archivo
                };
            });
        } else {
            files = [
                { name: 'material_estudio.pdf', size: '1.2 MB', date: '02 Sep' },
                { name: 'ejercicios_math.pdf', size: '840 KB', date: '08 Sep' },
                { name: 'guia_historia.pdf', size: '2.1 MB', date: '15 Sep' }
            ];
        }

        return res.json({
            ok: true,
            alumno: {
                id: alumnoData.id_alumno,
                legajo: legajo,
                nombre: alumnoData.nombre,
                apellido: alumnoData.apellido,
                nombreCompleto: `${alumnoData.nombre} ${alumnoData.apellido}`.trim(),
                usuario: alumnoData.usuario,
                curso: cursoNombre,
                turno: alumnoData.turno || 'Mañana',
                cohorte: 2026
            },
            grades,
            attendance: {
                present,
                absent,
                late
            },
            reminders,
            files
        });

    } catch (error) {
        console.error('Error al obtener dashboard del alumno:', error);
        res.status(500).json({
            mensaje: 'Error al obtener datos del alumno',
            error: error.message
        });
    }
};

module.exports = {
    getDashboard
};

