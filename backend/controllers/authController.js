const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'edutrack_secreto';

// Función segura para verificar contraseña (soporta hash bcrypt y texto plano para desarrollo)
const verifyPassword = async (inputPass, storedPass) => {
    if (!storedPass || !inputPass) return false;
    if (inputPass === storedPass) return true;
    try {
        return await bcrypt.compare(inputPass, storedPass);
    } catch {
        return false;
    }
};

const login = async (req, res) => {
    try {
        const { usuario, contraseña, rolEsperado } = req.body;

        if (!usuario || !contraseña) {
            return res.status(400).json({
                mensaje: 'Usuario y contraseña son obligatorios'
            });
        }

        const usuarioTrim = usuario.trim();

        // 1. Buscar administrador
        const [admins] = await pool.query(
            'SELECT * FROM administrador WHERE usuario = ?',
            [usuarioTrim]
        );

        if (admins.length > 0) {
            const admin = admins[0];
            const esValida = await verifyPassword(contraseña, admin.contraseña);

            if (!esValida) {
                return res.status(401).json({
                    mensaje: 'Usuario o contraseña incorrectos'
                });
            }

            // Validación estricta: solo se puede iniciar sesión como administrador desde el login de administrador
            if (rolEsperado && rolEsperado !== 'administrador') {
                return res.status(401).json({
                    mensaje: 'Usuario o contraseña incorrectos'
                });
            }

            const token = jwt.sign(
                {
                    id: admin.id_admin,
                    rol: 'administrador'
                },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                mensaje: 'Inicio de sesión correcto',
                token,
                usuario: {
                    id: admin.id_admin,
                    nombre: admin.usuario,
                    rol: 'administrador'
                }
            });
        }

        // 2. Buscar profesor
        const [profesores] = await pool.query(
            'SELECT * FROM profesor WHERE usuario = ?',
            [usuarioTrim]
        );

        if (profesores.length > 0) {
            const profesor = profesores[0];
            const esValida = await verifyPassword(contraseña, profesor.contraseña);

            if (!esValida) {
                return res.status(401).json({
                    mensaje: 'Usuario o contraseña incorrectos'
                });
            }

            // Validación estricta de portal/rol: profesores sólo pueden ingresar desde portal docente
            if (rolEsperado && rolEsperado === 'alumno') {
                return res.status(403).json({
                    mensaje: 'Esta cuenta pertenece a un docente. Debe ingresar desde el portal de Docentes.'
                });
            }

            const token = jwt.sign(
                {
                    id: profesor.id_profesor,
                    rol: 'profesor'
                },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            return res.json({
                mensaje: 'Inicio de sesión correcto',
                token,
                usuario: {
                    id: profesor.id_profesor,
                    nombre: `${profesor.nombre || ''} ${profesor.apellido || ''}`.trim() || profesor.usuario,
                    rol: 'profesor'
                }
            });
        }

        // 3. Buscar alumno
        const [alumnos] = await pool.query(
            'SELECT * FROM alumno WHERE usuario = ?',
            [usuarioTrim]
        );

        if (alumnos.length > 0) {
            const alumno = alumnos[0];
            const esValida = await verifyPassword(contraseña, alumno.contraseña);

            if (!esValida) {
                return res.status(401).json({
                    mensaje: 'Usuario o contraseña incorrectos'
                });
            }

            // Validación estricta de portal/rol: alumnos sólo pueden ingresar desde portal estudiantes
            if (rolEsperado && rolEsperado === 'profesor') {
                return res.status(403).json({
                    mensaje: 'Esta cuenta pertenece a un estudiante. Debe ingresar desde el portal de Estudiantes.'
                });
            }

            const token = jwt.sign(
                {
                    id: alumno.id_alumno,
                    rol: 'alumno'
                },
                JWT_SECRET,
                { expiresIn: '8h' }
            );

            const nombreCompleto = `${alumno.nombre || ''} ${alumno.apellido || ''}`.trim() || alumno.usuario;

            return res.json({
                mensaje: 'Inicio de sesión correcto',
                token,
                usuario: {
                    id: alumno.id_alumno,
                    id_alumno: alumno.id_alumno,
                    usuario: alumno.usuario,
                    nombre: alumno.nombre,
                    apellido: alumno.apellido,
                    nombreCompleto: nombreCompleto,
                    id_curso: alumno.id_curso || alumno.id_curso_actual || 1,
                    rol: 'alumno'
                }
            });
        }

        return res.status(401).json({
            mensaje: 'Usuario o contraseña incorrectos'
        });

    } catch (error) {
        console.error('Error en login:', error);

        res.status(500).json({
            mensaje: 'Error interno del servidor',
            error: error.message
        });
    }
};

module.exports = {
    login
};
