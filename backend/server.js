const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = require('./config/db');
const { query: pgQuery } = require('./config/pgDb');
const authRoutes = require('./routes/authRoutes');
const alumnoRoutes = require('./routes/alumnoRoutes');
const profesorRoutes = require('./routes/profesorRoutes');
const { syncInitialData } = require('./database/syncData');

const app = express();
const PORT = process.env.PORT || 3000;

// Deshabilitar divulgación de información de Express
app.disable('x-powered-by');

// Cabeceras de seguridad HTTP y Anti-Caché Global (Evita volver atrás en el navegador)
app.use((req, res, next) => {
    // Anti-caché estricto: evita que el navegador almacene páginas privadas en bfcache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    // Protección contra MIME sniffing, Clickjacking y XSS
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Middleware de Rate Limiting para Login (Protección contra ataques de fuerza bruta bajo Node)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const MAX_LOGIN_ATTEMPTS = 15;

app.use('/api/auth/login', (req, res, next) => {
    if (req.method === 'POST') {
        const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
        const now = Date.now();
        const record = loginAttempts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + RATE_LIMIT_WINDOW_MS;
        }

        record.count++;
        loginAttempts.set(ip, record);

        if (record.count > MAX_LOGIN_ATTEMPTS) {
            return res.status(429).json({
                ok: false,
                mensaje: 'Demasiados intentos de acceso fallidos. Por seguridad, intente nuevamente en 5 minutos.'
            });
        }
    }
    next();
});

app.use(cors());
app.use(express.json());

// Redirigir raíz al login de docentes ANTES del static (evita que index.html sea servido en /)
app.get('/', (req, res) => {
    res.redirect('/login/docente.html');
});

// Servir frontend estático directamente (index: false para que el redirect de / funcione)
app.use(express.static(path.join(__dirname, '../frontend/public'), {
    index: false,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

// Rutas amigables para módulos y paneles
app.get(['/index', '/index.html', '/portal', '/portal.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.get(['/admin', '/admin.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/admin.html'));
});

app.get(['/admin-login', '/admin-login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/admin-login.html'));
});

app.get(['/profe', '/profe.html', '/docente'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/profe.html'));
});

app.get(['/asistencia', '/asistencia.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/asistencia.html'));
});

app.get(['/tareas', '/tarea', '/tareas.html', '/tarea/Tareas.html', '/tarea/tareas.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/tareas.html'));
});

app.get(['/recordatorios', '/pendientes', '/recordatorios.html', '/pendientes.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/recordatorios.html'));
});

app.get(['/notas', '/notas.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/notas.html'));
});

app.get(['/alumno', '/alumno.html', '/estudiante', '/estudiantes'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/alumno.html'));
});

// Ruta principal de salud de la API
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        mensaje: 'API de EduTrack funcionando correctamente'
    });
});

// Prueba de conexión con MySQL
app.get('/test-db', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT 1 AS conectado');
        res.json({
            ok: true,
            mensaje: 'MySQL conectado correctamente',
            motor: 'MySQL',
            resultado: result
        });
    } catch (error) {
        console.error('Error de conexión a MySQL:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al conectar con MySQL',
            error: error.message
        });
    }
});

// Prueba de conexión con PostgreSQL
app.get('/test-pg', async (req, res) => {
    try {
        const result = await pgQuery('SELECT NOW() AS hora_servidor, 1 AS conectado');
        res.json({
            ok: true,
            conectado: true,
            mensaje: 'PostgreSQL conectado correctamente',
            resultado: result.rows[0]
        });
    } catch (error) {
        // Reportar estado amigable sin lanzar HTTP 500 para diagnósticos
        res.json({
            ok: false,
            conectado: false,
            motorActivo: 'MySQL',
            mensaje: 'PostgreSQL no disponible o no iniciado. La plataforma está funcionando activamente con MySQL.',
            error: error.message
        });
    }
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/alumno', alumnoRoutes);
app.use('/api/profesor', profesorRoutes);

// Iniciar servidor y sincronizar datos
app.listen(PORT, async () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    await syncInitialData();
});
