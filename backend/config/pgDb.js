const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Importación protegida y opcional de PostgreSQL ('pg')
// Si el paquete no está instalado en node_modules, la aplicación no crashea
// y opera de manera fluida y nativa con MySQL.
let Pool = null;
try {
    Pool = require('pg').Pool;
} catch {
    // 'pg' no está instalado en este entorno
}

let pgPool = null;
let pgAvailable = false;
let lastPgCheck = 0;

if (Pool) {
    const poolConfig = process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
        }
        : {
            host: process.env.PG_HOST || 'localhost',
            port: parseInt(process.env.PG_PORT || '5432', 10),
            user: process.env.PG_USER || 'postgres',
            password: process.env.PG_PASSWORD || 'postgres',
            database: process.env.PG_DATABASE || 'eductrack_db',
            max: 5,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 800
        };

    try {
        pgPool = new Pool(poolConfig);
        pgPool.on('connect', () => {
            pgAvailable = true;
        });
        pgPool.on('error', () => {
            pgAvailable = false;
        });
    } catch {
        pgPool = null;
        pgAvailable = false;
    }
}

/**
 * Comprobar disponibilidad de PostgreSQL sin bloquear la aplicación
 */
const checkPgStatus = async () => {
    if (!pgPool) {
        pgAvailable = false;
        return false;
    }
    const now = Date.now();
    if (pgAvailable === false && now - lastPgCheck < 30000) {
        return false;
    }
    lastPgCheck = now;
    try {
        const client = await pgPool.connect();
        client.release();
        pgAvailable = true;
        return true;
    } catch {
        pgAvailable = false;
        return false;
    }
};

/**
 * Ejecutar consultas parametrizadas seguras ($1, $2, ...)
 */
const query = async (text, params) => {
    if (!pgPool) {
        const err = new Error('El módulo PostgreSQL ("pg") no está instalado. El sistema opera con MySQL.');
        err.code = 'PG_NOT_INSTALLED';
        throw err;
    }
    const isReady = await checkPgStatus();
    if (!isReady) {
        const err = new Error('PostgreSQL no disponible o no iniciado');
        err.code = 'PG_UNAVAILABLE';
        throw err;
    }
    return await pgPool.query(text, params);
};

module.exports = {
    pgPool,
    query,
    isPgAvailable: () => pgAvailable === true,
    checkPgStatus
};
