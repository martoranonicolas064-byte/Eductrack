const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = require('./config/db');
const { query: pgQuery } = require('./config/pgDb');
const authRoutes = require('./routes/authRoutes');
const alumnoRoutes = require('./routes/alumnoRoutes');
const profesorRoutes = require('./routes/profesorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { syncInitialData } = require('./database/syncData');

const app = express();
const PORT = process.env.PORT || 3000;

// Confianza en el proxy inverso (Obligatorio para Render, Heroku y AWS)
app.set('trust proxy', 1);

// Habilitar compresión Gzip / Brotli para acelerar drásticamente la carga de red
app.use(compression());

// Deshabilitar divulgación de información de Express
app.disable('x-powered-by');

// Cabeceras globales de seguridad HTTP
app.use((req, res, next) => {
    // Protección robusta: MIME sniffing, Clickjacking, XSS y Cross-Origin
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Middleware específico para rutas privadas y APIs: Anti-Caché estricto (evita bfcache y filtración al volver atrás)
const noCachePrivate = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, post-check=0, pre-check=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
};

// Middleware de Rate Limiting para Login (Protección contra ataques de fuerza bruta bajo Node y Render)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const MAX_LOGIN_ATTEMPTS = 15;

app.use('/api/auth/login', (req, res, next) => {
    if (req.method === 'POST') {
        const forwarded = req.headers['x-forwarded-for'];
        const ip = (forwarded ? forwarded.split(',')[0].trim() : null) || req.ip || req.connection.remoteAddress || '127.0.0.1';
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

// Servir frontend estático optimizado con compresión y caché de navegador
app.use(express.static(path.join(__dirname, '../frontend/public'), {
    index: false,
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            // Documentos HTML públicos (login) revalidan con el servidor
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else {
            // Imágenes, estilos CSS, scripts JS y fuentes: caché rápido en navegador para carga instantánea
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        }
    }
}));

// Rutas amigables para módulos y paneles (las privadas usan noCachePrivate para evitar filtraciones en historial)
app.get(['/index', '/index.html', '/portal', '/portal.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.get(['/admin', '/admin.html'], noCachePrivate, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/admin.html'));
});

app.get(['/admin-login', '/admin-login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/admin-login.html'));
});

app.get(['/profe', '/profe.html', '/docente'], noCachePrivate, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/profe.html'));
});

app.get(['/asistencia', '/asistencia.html'], noCachePrivate, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/asistencia.html'));
});

app.get(['/tareas', '/tarea', '/tareas.html', '/tarea/Tareas.html', '/tarea/tareas.html'], noCachePrivate, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/tareas.html'));
});

app.get(['/recordatorios', '/pendientes', '/recordatorios.html', '/pendientes.html'], noCachePrivate, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/recordatorios.html'));
});

app.get(['/notas', '/notas.html'], noCachePrivate, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/notas.html'));
});

app.get(['/alumno', '/alumno.html', '/estudiante', '/estudiantes'], noCachePrivate, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/alumno.html'));
});

// Ruta principal de salud de la API
app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        mensaje: 'API de EduTrack funcionando correctamente'
    });
});

// Prueba de conexión con MySQL / TiDB Cloud
app.get('/test-db', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT 1 AS conectado, VERSION() AS version, DATABASE() AS bd');
        const verStr = result[0]?.version || '';
        const esTiDB = verStr.toLowerCase().includes('tidb');
        res.json({
            ok: true,
            mensaje: esTiDB ? 'TiDB Cloud conectado correctamente' : 'Base de datos MySQL conectada correctamente',
            motor: esTiDB ? 'TiDB Cloud' : 'MySQL',
            version: verStr,
            baseDeDatos: result[0]?.bd,
            resultado: result
        });
    } catch (error) {
        console.error('Error de conexión a la base de datos:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al conectar con la base de datos',
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

// Rutas de la API (con Anti-Caché estricto en respuestas JSON)
app.use('/api', noCachePrivate);
app.use('/api/auth', authRoutes);
app.use('/api/alumno', alumnoRoutes);
app.use('/api/profesor', profesorRoutes);
app.use('/api/admin', adminRoutes);

// Iniciar servidor y sincronizar datos
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[EducTrack] Servidor ejecutándose en http://0.0.0.0:${PORT} (Puerto: ${PORT})`);
    await syncInitialData();

    // Auto-ping preventivo para Render Free (mantiene el contenedor activo)
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    if (renderUrl) {
        const pingInterval = 10 * 60 * 1000; // cada 10 minutos
        setInterval(async () => {
            try {
                const res = await fetch(`${renderUrl}/api/health`);
                console.log(`[Keep-Alive] Ping exitoso a ${renderUrl}/api/health (HTTP ${res.status})`);
            } catch (err) {
                console.log(`[Keep-Alive] Ping no completado: ${err.message}`);
            }
        }, pingInterval);
        console.log(`[EducTrack] Keep-Alive activo para URL: ${renderUrl}`);
    }
});
