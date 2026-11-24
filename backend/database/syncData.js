const pool = require('../config/db');

/**
 * Crea las tablas si no existen en la base de datos (MySQL local o TiDB Cloud)
 */
async function ensureTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS administrador (
            id_admin INT AUTO_INCREMENT PRIMARY KEY,
            usuario VARCHAR(50) NOT NULL UNIQUE,
            contraseña VARCHAR(255) NOT NULL,
            nombre VARCHAR(100) DEFAULT 'Administrador Central',
            email VARCHAR(100) DEFAULT NULL,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS profesor (
            id_profesor INT AUTO_INCREMENT PRIMARY KEY,
            usuario VARCHAR(50) NOT NULL UNIQUE,
            contraseña VARCHAR(255) NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            apellido VARCHAR(100) NOT NULL,
            email VARCHAR(100) DEFAULT NULL,
            avatar_url VARCHAR(255) DEFAULT NULL,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS curso (
            id_curso INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(50) DEFAULT '4° Año B',
            año INT DEFAULT 4,
            anio INT DEFAULT 4,
            division VARCHAR(10) DEFAULT 'B',
            turno VARCHAR(20) DEFAULT 'Mañana',
            nivel VARCHAR(50) DEFAULT 'Secundaria',
            codigo_invitacion VARCHAR(30) DEFAULT 'EDU-4B-9872',
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS materia (
            id_materia INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            codigo VARCHAR(20) DEFAULT NULL,
            color VARCHAR(20) DEFAULT '#b71c1c'
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS asignacion (
            id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
            id_profesor INT NOT NULL,
            id_materia INT NOT NULL,
            id_curso INT NOT NULL
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS alumno (
            id_alumno INT AUTO_INCREMENT PRIMARY KEY,
            id_curso INT DEFAULT 1,
            usuario VARCHAR(50) NOT NULL UNIQUE,
            contraseña VARCHAR(255) NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            apellido VARCHAR(100) NOT NULL,
            rut VARCHAR(20) DEFAULT NULL,
            email VARCHAR(100) DEFAULT NULL
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS nota (
            id_nota INT AUTO_INCREMENT PRIMARY KEY,
            id_alumno INT NOT NULL,
            id_asignacion INT NOT NULL,
            periodo VARCHAR(50) DEFAULT '1° cuatrimestre',
            nota DECIMAL(4,2) NOT NULL
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS recordatorio (
            id_recordatorio INT AUTO_INCREMENT PRIMARY KEY,
            id_asignacion INT NOT NULL,
            titulo VARCHAR(150) NOT NULL,
            contenido TEXT,
            fecha_limite DATETIME,
            estado VARCHAR(20) DEFAULT 'pendiente'
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS archivo (
            id_archivo INT AUTO_INCREMENT PRIMARY KEY,
            id_asignacion INT NOT NULL,
            nombre VARCHAR(255) NOT NULL,
            url_archivo VARCHAR(255) NOT NULL,
            fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS asistencia (
            id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
            id_alumno INT NOT NULL,
            id_asignacion INT DEFAULT 1,
            fecha DATE NOT NULL,
            estado VARCHAR(20) NOT NULL DEFAULT 'P'
        )
    `);
}

async function syncInitialData() {
    try {
        console.log('[EducTrack DB] Comprobando estado de inicialización...');
        
        // Fast-path: Si la base de datos ya está inicializada, evitar ejecutar 25 consultas DDL/DML secuenciales en el arranque
        try {
            const [check] = await pool.query('SELECT COUNT(*) as count FROM administrador');
            if (check && check[0]?.count > 0) {
                console.log('[EducTrack DB] Base de datos TiDB Cloud conectada y lista (arranque rápido).');
                return;
            }
        } catch (err) {
            // Si la tabla administrador no existe aún, procedemos a crear las tablas
            console.log('[EducTrack DB] Inicializando tablas por primera vez...');
        }

        console.log('[EducTrack DB] Verificando tablas y conectividad con la base de datos...');
        await ensureTables();

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
        const materiasNombres = materias.map(m => (m.nombre || '').toLowerCase());
        
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
                `INSERT INTO curso (id_curso, nombre, año, anio, division, turno) 
                 VALUES (1, '4° Año B', 4, 4, 'B', 'Mañana')`
            );
        }

        // 5. Asegurar asignaciones para las materias (incluyendo id_materia: 3 - Base de datos)
        const [asignaciones] = await pool.query('SELECT id_asignacion, id_materia FROM asignacion WHERE id_curso = 1');
        const materiasAsignadas = asignaciones.map(a => a.id_materia);

        const [primerProfe] = await pool.query('SELECT id_profesor FROM profesor ORDER BY id_profesor ASC LIMIT 1');
        const idProf = primerProfe[0]?.id_profesor || 1;

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

        // 8. Asegurar recordatorios
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

        // 10. Asistencias de prueba si no existen
        const [asistencias] = await pool.query('SELECT COUNT(*) as count FROM asistencia WHERE estado != ""');
        if (asistencias[0].count < 10) {
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
        }

        console.log('[EducTrack DB] Sincronización y validación de base de datos completada con éxito.');
    } catch (err) {
        console.warn('[EducTrack DB] Nota sobre sincronización inicial:', err.message);
    }
}

module.exports = { syncInitialData };
