const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'edutrack_secreto';

/**
 * Middleware para validar el token JWT enviado en los headers
 */
const autenticarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            mensaje: 'Acceso no autorizado: Token no proporcionado'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                mensaje: 'Token inválido o expirado'
            });
        }
        req.usuario = decoded;
        next();
    });
};

/**
 * Middleware para verificar que el usuario autenticado posea rol de profesor
 */
const esProfesor = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'profesor') {
        return next();
    }
    return res.status(403).json({
        mensaje: 'Acceso denegado: Se requieren permisos de profesor'
    });
};

/**
 * Middleware para verificar que el usuario autenticado posea rol de alumno
 */
const esAlumno = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'alumno') {
        return next();
    }
    return res.status(403).json({
        mensaje: 'Acceso denegado: Se requieren permisos de alumno'
    });
};

/**
 * Middleware para verificar que el usuario autenticado posea rol de administrador
 */
const esAdmin = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'administrador') {
        return next();
    }
    return res.status(403).json({
        mensaje: 'Acceso denegado: Se requieren permisos de administrador'
    });
};

module.exports = {
    autenticarToken,
    esProfesor,
    esAlumno,
    esAdmin
};
