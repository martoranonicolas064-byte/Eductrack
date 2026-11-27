const pool = require('../config/db');

async function resetDatabase() {
    console.log('[RESET] Iniciando reseteo total en TiDB Cloud...');
    try {
        await pool.query('DELETE FROM nota');
        console.log('[RESET] Notas eliminadas');
        
        await pool.query('DELETE FROM asistencia');
        console.log('[RESET] Asistencias eliminadas');
        
        try { await pool.query('DELETE FROM recordatorio'); } catch(e){}
        try { await pool.query('DELETE FROM archivo'); } catch(e){}
        
        await pool.query('DELETE FROM asignacion');
        console.log('[RESET] Asignaciones eliminadas');
        
        await pool.query('DELETE FROM alumno');
        console.log('[RESET] Alumnos eliminados');
        
        await pool.query('DELETE FROM profesor');
        console.log('[RESET] Profesores eliminados');
        
        // Administrador admin / admin123
        await pool.query("DELETE FROM administrador WHERE usuario != 'admin'");
        const [adm] = await pool.query("SELECT COUNT(*) as c FROM administrador WHERE usuario = 'admin'");
        if (adm[0].c === 0) {
            await pool.query("INSERT INTO administrador (usuario, contraseña, nombre) VALUES ('admin', 'admin123', 'Administrador Central')");
        } else {
            await pool.query("UPDATE administrador SET contraseña = 'admin123' WHERE usuario = 'admin'");
        }
        console.log('[RESET] Administrador listo: admin / admin123');
        
        // Cursos base
        await pool.query('DELETE FROM curso');
        await pool.query(`INSERT INTO curso (id_curso, nombre, año, anio, division, turno) VALUES 
            (1, '4° Año B', 4, 4, 'B', 'Mañana'),
            (2, '3° Año A', 3, 3, 'A', 'Tarde'),
            (3, '2° Año A', 2, 2, 'A', 'Mañana'),
            (4, '1° Año A', 1, 1, 'A', 'Mañana')
        `);
        console.log('[RESET] Cursos reestablecidos');
        
        // Materias base
        await pool.query('DELETE FROM materia');
        await pool.query(`INSERT INTO materia (id_materia, nombre, color) VALUES 
            (1, 'Matemáticas', '#b01c1c'),
            (2, 'Historia', '#b01c1c'),
            (3, 'Base de datos', '#b01c1c'),
            (4, 'Lengua y Literatura', '#b01c1c'),
            (5, 'Ciencias Naturales', '#b01c1c'),
            (6, 'Inglés Técnico', '#b01c1c')
        `);
        console.log('[RESET] Materias reestablecidas');
        
        console.log('[RESET] ¡Limpieza completa de TiDB Cloud realizada con ÉXITO!');
        process.exit(0);
    } catch (err) {
        console.error('[RESET ERROR]:', err);
        process.exit(1);
    }
}

resetDatabase();
