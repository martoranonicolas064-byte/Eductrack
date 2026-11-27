const express = require('express');
const pool = require('../config/db');
const { autenticarToken } = require('../middleware/authMiddleware');
const router = express.Router();

// Middleware: solo admin puede usar estas rutas
const esAdmin = (req, res, next) => {
    if (req.usuario && (req.usuario.rol === 'administrador' || req.usuario.rol === 'admin')) {
        return next();
    }
    return res.status(403).json({ ok: false, mensaje: 'Acceso denegado: Se requieren permisos de administrador' });
};

// ─── PROFESORES ───────────────────────────────────────────────────────────────

// Listar todos los profesores
router.get('/profesores', autenticarToken, esAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id_profesor, nombre, apellido, usuario, `contraseña`, email FROM profesor ORDER BY apellido ASC, nombre ASC'
        );
        res.json({ ok: true, profesores: rows });
    } catch (error) {
        console.error('Error al obtener profesores:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al consultar profesores', error: error.message });
    }
});

// Crear profesor (guarda directo en TiDB Cloud y genera asignaciones iniciales)
router.post('/profesores', autenticarToken, esAdmin, async (req, res) => {
    try {
        let { nombre, apellido, usuario, contrasena } = req.body;
        if (!nombre || !apellido) {
            return res.status(400).json({ ok: false, mensaje: 'Nombre y apellido son obligatorios' });
        }

        nombre = nombre.trim();
        apellido = apellido.trim();
        
        // Si no se proporcionó usuario, autogenerar nombre.apellido
        if (!usuario || !usuario.trim()) {
            usuario = `${nombre.split(' ')[0].toLowerCase()}.${apellido.split(' ')[0].toLowerCase()}`;
        } else {
            usuario = usuario.trim();
        }

        // Si no se proporcionó contraseña, usar 123456 por defecto
        if (!contrasena || !contrasena.trim()) {
            contrasena = '123456';
        } else {
            contrasena = contrasena.trim();
        }

        // Verificar unicidad de usuario
        const [existe] = await pool.query('SELECT id_profesor FROM profesor WHERE usuario = ?', [usuario]);
        if (existe.length > 0) {
            return res.status(409).json({ ok: false, mensaje: `El usuario "${usuario}" ya existe en el sistema. Elegí otro.` });
        }

        const email = `${usuario}@eductrack.edu`;
        const [result] = await pool.query(
            'INSERT INTO profesor (nombre, apellido, usuario, `contraseña`, email) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, usuario, contrasena, email]
        );

        const idNuevoProfesor = result.insertId;

        // Asignar al nuevo profesor materias del curso 1 (4B) para que tenga panel funcional de inmediato
        try {
            const [materias] = await pool.query('SELECT id_materia FROM materia LIMIT 3');
            for (const m of materias) {
                await pool.query(
                    'INSERT INTO asignacion (id_profesor, id_materia, id_curso) VALUES (?, ?, 1)',
                    [idNuevoProfesor, m.id_materia]
                );
            }
        } catch (asigErr) {
            console.warn('[AdminRoutes] Advertencia al crear asignaciones iniciales del profesor:', asigErr.message);
        }

        res.json({
            ok: true,
            mensaje: 'Profesor registrado correctamente en la base de datos',
            profesor: {
                id_profesor: idNuevoProfesor,
                nombre,
                apellido,
                usuario,
                contrasena
            }
        });
    } catch (error) {
        console.error('Error al crear profesor:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al registrar profesor en la base de datos', error: error.message });
    }
});

// Editar profesor (usuario, contraseña, nombre, apellido)
router.patch('/profesores/:id', autenticarToken, esAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, usuario, contrasena } = req.body;

        if (!nombre && !apellido && !usuario && !contrasena) {
            return res.status(400).json({ ok: false, mensaje: 'No se enviaron datos para actualizar' });
        }

        if (usuario && usuario.trim()) {
            const [existe] = await pool.query('SELECT id_profesor FROM profesor WHERE usuario = ? AND id_profesor != ?', [usuario.trim(), id]);
            if (existe.length > 0) {
                return res.status(409).json({ ok: false, mensaje: `El usuario "${usuario}" ya está en uso por otro docente.` });
            }
            await pool.query('UPDATE profesor SET usuario = ? WHERE id_profesor = ?', [usuario.trim(), id]);
        }

        if (contrasena && contrasena.trim()) {
            await pool.query('UPDATE profesor SET `contraseña` = ? WHERE id_profesor = ?', [contrasena.trim(), id]);
        }

        if (nombre && nombre.trim()) {
            await pool.query('UPDATE profesor SET nombre = ? WHERE id_profesor = ?', [nombre.trim(), id]);
        }

        if (apellido && apellido.trim()) {
            await pool.query('UPDATE profesor SET apellido = ? WHERE id_profesor = ?', [apellido.trim(), id]);
        }

        res.json({ ok: true, mensaje: 'Docente actualizado correctamente en TiDB Cloud' });
    } catch (error) {
        console.error('Error al editar profesor:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al actualizar docente', error: error.message });
    }
});

// Eliminar profesor
router.delete('/profesores/:id', autenticarToken, esAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM asignacion WHERE id_profesor = ?', [id]);
        await pool.query('DELETE FROM profesor WHERE id_profesor = ?', [id]);
        res.json({ ok: true, mensaje: 'Docente eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar profesor:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al eliminar docente', error: error.message });
    }
});

// ─── ALUMNOS ──────────────────────────────────────────────────────────────────

// Listar todos los alumnos
router.get('/alumnos', autenticarToken, esAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT a.id_alumno, a.nombre, a.apellido, a.usuario, a.\`contraseña\`, a.id_curso, c.nombre AS curso_nombre
             FROM alumno a LEFT JOIN curso c ON a.id_curso = c.id_curso
             ORDER BY a.apellido ASC, a.nombre ASC`
        );
        res.json({ ok: true, alumnos: rows });
    } catch (error) {
        console.error('Error al listar alumnos:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al consultar alumnos', error: error.message });
    }
});

// Crear alumno
router.post('/alumnos', autenticarToken, esAdmin, async (req, res) => {
    try {
        let { nombre, apellido, usuario, contrasena, id_curso } = req.body;
        if (!nombre || !apellido) {
            return res.status(400).json({ ok: false, mensaje: 'Nombre y apellido son obligatorios' });
        }

        nombre = nombre.trim();
        apellido = apellido.trim();

        if (!usuario || !usuario.trim()) {
            usuario = `${nombre.split(' ')[0].toLowerCase()}.${apellido.split(' ')[0].toLowerCase()}`;
        } else {
            usuario = usuario.trim();
        }

        if (!contrasena || !contrasena.trim()) {
            contrasena = '123456';
        } else {
            contrasena = contrasena.trim();
        }

        const [existe] = await pool.query('SELECT id_alumno FROM alumno WHERE usuario = ?', [usuario]);
        if (existe.length > 0) {
            return res.status(409).json({ ok: false, mensaje: `El usuario "${usuario}" ya existe en el sistema. Elegí otro.` });
        }

        const cursoId = parseInt(id_curso) || 1;
        const email = `${usuario}@eductrack.edu`;
        const [result] = await pool.query(
            'INSERT INTO alumno (nombre, apellido, usuario, `contraseña`, id_curso, email) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, apellido, usuario, contrasena, cursoId, email]
        );

        res.json({
            ok: true,
            mensaje: 'Estudiante registrado correctamente en la base de datos',
            alumno: {
                id_alumno: result.insertId,
                nombre,
                apellido,
                usuario,
                contrasena,
                id_curso: cursoId
            }
        });
    } catch (error) {
        console.error('Error al crear alumno:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al registrar alumno en la base de datos', error: error.message });
    }
});

// Editar alumno
router.patch('/alumnos/:id', autenticarToken, esAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, usuario, contrasena, id_curso } = req.body;

        if (!nombre && !apellido && !usuario && !contrasena && !id_curso) {
            return res.status(400).json({ ok: false, mensaje: 'No se enviaron datos para actualizar' });
        }

        if (usuario && usuario.trim()) {
            const [existe] = await pool.query('SELECT id_alumno FROM alumno WHERE usuario = ? AND id_alumno != ?', [usuario.trim(), id]);
            if (existe.length > 0) {
                return res.status(409).json({ ok: false, mensaje: `El usuario "${usuario}" ya está en uso por otro alumno.` });
            }
            await pool.query('UPDATE alumno SET usuario = ? WHERE id_alumno = ?', [usuario.trim(), id]);
        }

        if (contrasena && contrasena.trim()) {
            await pool.query('UPDATE alumno SET `contraseña` = ? WHERE id_alumno = ?', [contrasena.trim(), id]);
        }

        if (nombre && nombre.trim()) {
            await pool.query('UPDATE alumno SET nombre = ? WHERE id_alumno = ?', [nombre.trim(), id]);
        }

        if (apellido && apellido.trim()) {
            await pool.query('UPDATE alumno SET apellido = ? WHERE id_alumno = ?', [apellido.trim(), id]);
        }

        if (id_curso) {
            await pool.query('UPDATE alumno SET id_curso = ? WHERE id_alumno = ?', [parseInt(id_curso), id]);
        }

        res.json({ ok: true, mensaje: 'Estudiante actualizado correctamente en TiDB Cloud' });
    } catch (error) {
        console.error('Error al editar alumno:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al actualizar estudiante', error: error.message });
    }
});

// Eliminar alumno
router.delete('/alumnos/:id', autenticarToken, esAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM nota WHERE id_alumno = ?', [id]);
        await pool.query('DELETE FROM asistencia WHERE id_alumno = ?', [id]);
        await pool.query('DELETE FROM alumno WHERE id_alumno = ?', [id]);
        res.json({ ok: true, mensaje: 'Estudiante eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar alumno:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al eliminar estudiante', error: error.message });
    }
});

// ─── CURSOS ───────────────────────────────────────────────────────────────────

router.get('/cursos', autenticarToken, esAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id_curso, nombre, año, division, turno FROM curso ORDER BY año ASC, division ASC');
        res.json({ ok: true, cursos: rows });
    } catch (error) {
        console.error('Error al obtener cursos:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al consultar cursos', error: error.message });
    }
});

// ─── RESET COMPLETO DE BASE DE DATOS A ESTADO LIMPIO ──────────────────────────
router.post('/reset', autenticarToken, esAdmin, async (req, res) => {
    try {
        console.log('[Admin] Solicitud de RESET total de base de datos recibida...');

        // 1. Limpiar datos dependientes
        await pool.query('DELETE FROM nota');
        await pool.query('DELETE FROM asistencia');
        await pool.query('DELETE FROM recordatorio');
        await pool.query('DELETE FROM archivo');
        await pool.query('DELETE FROM asignacion');

        // 2. Limpiar alumnos y profesores
        await pool.query('DELETE FROM alumno');
        await pool.query('DELETE FROM profesor');

        // 3. Asegurar administrador maestro
        await pool.query("DELETE FROM administrador WHERE usuario NOT IN ('admin')");
        const [adminCount] = await pool.query('SELECT COUNT(*) as c FROM administrador WHERE usuario = "admin"');
        if (adminCount[0].c === 0) {
            await pool.query('INSERT INTO administrador (usuario, contraseña, nombre) VALUES ("admin", "admin123", "Administrador Central")');
        } else {
            await pool.query('UPDATE administrador SET contraseña = "admin123" WHERE usuario = "admin"');
        }

        // 4. Asegurar estructura limpia de Cursos
        await pool.query('DELETE FROM curso');
        await pool.query(`
            INSERT INTO curso (id_curso, nombre, año, anio, division, turno) VALUES 
            (1, '4° Año B', 4, 4, 'B', 'Mañana'),
            (2, '3° Año A', 3, 3, 'A', 'Tarde'),
            (3, '2° Año A', 2, 2, 'A', 'Mañana'),
            (4, '1° Año A', 1, 1, 'A', 'Mañana')
        `);

        // 5. Asegurar materias institucionales
        await pool.query('DELETE FROM materia');
        await pool.query(`
            INSERT INTO materia (id_materia, nombre, color) VALUES 
            (1, 'Matemáticas', '#b01c1c'),
            (2, 'Historia', '#b01c1c'),
            (3, 'Base de datos', '#b01c1c'),
            (4, 'Lengua y Literatura', '#b01c1c'),
            (5, 'Ciencias Naturales', '#b01c1c'),
            (6, 'Inglés Técnico', '#b01c1c')
        `);

        res.json({
            ok: true,
            mensaje: 'Sistema reiniciado exitosamente. La base de datos está limpia y lista para que cargues tus profesores y alumnos reales.'
        });
    } catch (error) {
        console.error('Error al reiniciar base de datos:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al reiniciar la base de datos', error: error.message });
    }
});

module.exports = router;
