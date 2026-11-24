const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

/**
 * Configuración dinámica de conexión a MySQL / TiDB Cloud
 * Compatible con:
 * - TiDB Cloud Serverless / Dedicated (puerto 4000 y SSL obligatorio)
 * - Render Web Service (variables de entorno o DATABASE_URL)
 * - Entorno de desarrollo local (localhost:3306 sin SSL)
 */
function getPoolConfig() {
    // 1. Si se proporciona una URL de conexión completa (DATABASE_URL / TIDB_DATABASE_URL)
    const connectionUri = process.env.DATABASE_URL || process.env.TIDB_DATABASE_URL;
    if (connectionUri) {
        const isTiDB = connectionUri.includes('tidbcloud.com') || connectionUri.includes(':4000');
        const enableSSL = process.env.DB_SSL === 'true' || isTiDB;

        return {
            uri: connectionUri,
            waitForConnections: true,
            connectionLimit: 10,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
            ssl: (enableSSL && process.env.DB_SSL !== 'false') ? {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true
            } : undefined
        };
    }

    // 2. Parámetros individuales
    const host = process.env.DB_HOST || process.env.TIDB_HOST || 'localhost';
    const isTiDB = host.toLowerCase().includes('tidbcloud.com') || String(process.env.DB_PORT) === '4000';
    const port = parseInt(process.env.DB_PORT || process.env.TIDB_PORT || (isTiDB ? 4000 : 3306), 10);
    const user = process.env.DB_USER || process.env.TIDB_USER || 'root';
    const password = process.env.DB_PASSWORD || process.env.TIDB_PASSWORD || '';
    const database = process.env.DB_NAME || process.env.TIDB_DATABASE || 'eductrack_db';

    const enableSSL = process.env.DB_SSL === 'true' || isTiDB;

    const config = {
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
    };

    if (enableSSL && process.env.DB_SSL !== 'false') {
        config.ssl = {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true
        };
    }

    return config;
}

const pool = mysql.createPool(getPoolConfig());

module.exports = pool;
