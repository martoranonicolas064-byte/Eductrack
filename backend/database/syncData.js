const pool = require('../config/db');

async function syncInitialData() {
    try {
        console.log('[EducTrack DB] Verificando tablas y datos iniciales en MySQL...');

        // 1. Asegurar administradores por defecto
        const [admins] = await pool.query('SELECT COUNT(*) as count FROM administrador');
        if (admins[0].count === 0) {
            await pool.query(
                `INSERT INTO administrador (usuario, contraseña) VALUES 
                 ('admin', 'admin123'),
                 ('rectoria', 'rectoria2026')`
            );
            console.log('[EducTrack DB] Administradores iniciales creados (admin / admin123).');
        } else {
            // Asegurar que admin tenga contraseña conocida
            await pool.query("UPDATE administrador SET contraseña = 'admin123' WHERE usuario = 'admin'");
        }

        // 2. Asegurar profesores (profesor y profesor1 con contraseña 123456)
        const [profes] = await pool.query('SELECT id_profesor, usuario FROM profesor');
        if (profes.length === 0) {
            await pool.query(
                `INSERT INTO profesor (id_profesor, nombre, apellido, usuario, contraseña) VALUES 
                 (1, 'Carlos', 'Gómez', 'profesor', '123456'),
                 (2, 'Juan', 'Perez', 'profesor1', '123456')`
            );
            console.log('[EducTrack DB] Profesores iniciales creados.');
        } else {
            // Actualizar contraseñas para permitir acceso con 123456
            await pool.query("UPDATE profesor SET contraseña = '123456' WHERE usuario IN ('profesor', 'profesor1')");
            const tieneProfesor = profes.some(p => p.usuario === 'profesor');
            if (!tieneProfesor) {
                await pool.query(
                    `INSERT INTO profesor (nombre, apellido, usuario, contraseña) 
                     VALUES ('Carlos', 'Gómez', 'profesor', '123456')`
                );
            }
        }

        // 3. Asegurar materias (Matemáticas, Historia y Base de datos)
        const [materias] = await pool.query('SELECT id_materia, nombre FROM materia');
        const materiasNombres = materias.map(m => m.nombre.toLowerCase());
        
        if (!materiasNombres.includes('matemáticas') && !materiasNombres.includes('matematicas')) {
            await pool.query("INSERT INTO materia (id_materia, nombre) VALUES (1, 'Matemáticas')");
        }
        if (!materiasNombres.includes('historia')) {
            await pool.query("INSERT INTO materia (id_materia, nombre) VALUES (2, 'Historia')");
        }
        if (!materiasNombres.includes('base de datos')) {
            await pool.query("INSERT INTO materia (id_materia, nombre) VALUES (3, 'Base de datos')");
            console.log('[EducTrack DB] Materia "Base de datos" creada.');
        }

        // 4. Asegurar curso 4B (id_curso: 1)
        const [cursos] = await pool.query('SELECT COUNT(*) as count FROM curso WHERE id_curso = 1');
        if (cursos[0].count === 0) {
            await pool.query(
                `INSERT INTO curso (id_curso, año, division, turno) 
                 VALUES (1, 4, 'B', 'Mañana')`
            );
        }

        // 5. Asegurar asignaciones para las materias (incluyendo id_materia: 3 - Base de datos)
        const [asignaciones] = await pool.query('SELECT id_asignacion, id_materia FROM asignacion WHERE id_curso = 1');
        const materiasAsignadas = asignaciones.map(a => a.id_materia);

        // Obtener ID del profesor principal (2 o 1)
        const [primerProfe] = await pool.query('SELECT id_profesor FROM profesor ORDER BY id_profesor ASC LIMIT 1');
        const idProf = primerProfe[0]?.id_profesor || 2;

        if (!materiasAsignadas.includes(1)) {
            await pool.query('INSERT INTO asignacion (id_profesor, id_materia, id_curso) VALUES (?, 1, 1)', [idProf]);
        }
        if (!materiasAsignadas.includes(2)) {
            await pool.query('INSERT INTO asignacion (id_profesor, id_materia, id_curso) VALUES (?, 2, 1)', [idProf]);
        }
        if (!materiasAsignadas.includes(3)) {
            await pool.query('INSERT INTO asignacion (id_profesor, id_materia, id_curso) VALUES (?, 3, 1)', [idProf]);
            console.log('[EducTrack DB] Asignación creada para materia 3 (Base de datos).');
        }

        // Obtener el ID de asignación para Base de datos
        const [asigBD] = await pool.query('SELECT id_asignacion FROM asignacion WHERE id_materia = 3 AND id_curso = 1 LIMIT 1');
        const idAsigBD = asigBD[0]?.id_asignacion || 3;

        // 6. Asegurar alumnos con contraseña 123456
        const [existingLucas] = await pool.query('SELECT id_alumno FROM alumno WHERE usuario = ?', ['lucas_fernandez']);
        if (existingLucas.length === 0) {
            await pool.query(
                `INSERT INTO alumno (nombre, apellido, usuario, contraseña, id_curso) 
                 VALUES ('Lucas', 'Fernández', 'lucas_fernandez', '123456', 1)`
            );
            console.log('[EducTrack DB] Alumno lucas_fernandez creado.');
        }

        // Asegurar que todos los alumnos tengan contraseña 123456
        await pool.query("UPDATE alumno SET contraseña = '123456' WHERE usuario IN ('amorales', 'cfernandez', 'dreyes', 'lucas_fernandez', 'isilva', 'mcastillo', 'sperez', 'vtorres', 'alumno1', 'alumno2')");

        // 7. Asegurar notas (incluyendo notas para Base de datos)
        const [alumnos] = await pool.query('SELECT id_alumno FROM alumno');
        for (const al of alumnos) {
            // Verificar si el alumno tiene notas en asignación de Base de datos
            const [notasBD] = await pool.query('SELECT COUNT(*) as count FROM nota WHERE id_alumno = ? AND id_asignacion = ?', [al.id_alumno, idAsigBD]);
            if (notasBD[0].count === 0) {
                await pool.query(
                    `INSERT INTO nota (id_alumno, id_asignacion, periodo, nota) VALUES 
                     (?, ?, '1° cuatrimestre', 9.20),
                     (?, ?, '2° cuatrimestre', 8.80)`,
                    [al.id_alumno, idAsigBD, al.id_alumno, idAsigBD]
                );
            }
        }

        // 8. Asegurar recordatorios (incluyendo para Base de datos)
        const [recBD] = await pool.query('SELECT COUNT(*) as count FROM recordatorio WHERE id_asignacion = ?', [idAsigBD]);
        if (recBD[0].count === 0) {
            await pool.query(
                `INSERT INTO recordatorio (id_asignacion, titulo, contenido, fecha_limite, estado) VALUES 
                 (?, 'Proyecto Base de Datos: Modelo Relacional', 'Entregar diagrama entidad-relación y script DDL en SQL', '2026-11-28 23:59:00', 'pendiente'),
                 (?, 'Consultas SQL Complejas', 'Resolver práctica de JOINs, subconsultas y funciones agregadas', '2026-12-05 18:00:00', 'pendiente')`,
                [idAsigBD, idAsigBD]
            );
            console.log('[EducTrack DB] Recordatorios creados para la materia Base de datos.');
        }

        // 9. Asegurar archivos didácticos
        const [archBD] = await pool.query('SELECT COUNT(*) as count FROM archivo WHERE id_asignacion = ?', [idAsigBD]);
        if (archBD[0].count === 0) {
            await pool.query(
                `INSERT INTO archivo (id_asignacion, nombre, url_archivo, fecha_subida) VALUES 
                 (?, 'guia_sql_base_de_datos.pdf', '/archivos/guia_sql_base_de_datos.pdf', '2026-10-15 10:00:00')`,
                [idAsigBD]
            );
        }

        // 10. Verificar y poblar asistencias si no hay suficientes
        const [asistencias] = await pool.query('SELECT COUNT(*) as count FROM asistencia WHERE estado != ""');
        if (asistencias[0].count < 10) {
            console.log('[EducTrack DB] Actualizando registros de asistencia...');
            for (const al of alumnos) {
                await pool.query('DELETE FROM asistencia WHERE id_alumno = ?', [al.id_alumno]);
                
                const fechas = [];
                for (let i = 1; i <= 28; i++) {
                    const dia = String(i).padStart(2, '0');
                    fechas.push({ fecha: `2026-09-${dia > 30 ? '30' : dia}`, estado: 'P' });
                }
                fechas.push({ fecha: '2026-10-01', estado: 'A' });
                fechas.push({ fecha: '2026-10-02', estado: 'A' });
                fechas.push({ fecha: '2026-10-05', estado: 'T' });

                for (const item of fechas) {
                    await pool.query(
                        'INSERT INTO asistencia (id_alumno, id_asignacion, fecha, estado) VALUES (?, 1, ?, ?)',
                        [al.id_alumno, item.fecha, item.estado]
                    );
                }
            }
            console.log('[EducTrack DB] Asistencias de prueba actualizadas.');
        }

        console.log('[EducTrack DB] Sincronización y validación de base de datos MySQL completada con éxito.');
    } catch (err) {
        console.warn('[EducTrack DB] Nota sobre sincronización inicial:', err.message);
    }
}

module.exports = { syncInitialData };
