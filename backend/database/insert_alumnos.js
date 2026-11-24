// Script temporal para insertar alumnos faltantes en TiDB Cloud
const pool = require('../config/db');

async function main() {
    const alumnos = [
        { u: 'amorales', n: 'Agustín', a: 'Morales', e: 'agustin.m@eductrack.cl' },
        { u: 'cfernandez', n: 'Camila', a: 'Fernández', e: 'camila.f@eductrack.cl' },
        { u: 'dreyes', n: 'Diego', a: 'Reyes', e: 'dreyes@eductrack.cl' },
        { u: 'isilva', n: 'Ignacia', a: 'Silva', e: 'isilva@eductrack.cl' },
        { u: 'mcastillo', n: 'Matías', a: 'Castillo', e: 'mcastillo@eductrack.cl' },
        { u: 'sperez', n: 'Sofía', a: 'Pérez', e: 'sperez@eductrack.cl' },
        { u: 'vtorres', n: 'Valentina', a: 'Torres', e: 'vtorres@eductrack.cl' }
    ];

    for (const al of alumnos) {
        const [ex] = await pool.query('SELECT id_alumno FROM alumno WHERE usuario = ?', [al.u]);
        if (ex.length === 0) {
            await pool.query(
                'INSERT INTO alumno (id_curso, usuario, `contraseña`, nombre, apellido, email) VALUES (1, ?, ?, ?, ?, ?)',
                [al.u, '123456', al.n, al.a, al.e]
            );
            console.log('CREADO:', al.u);
        } else {
            await pool.query('UPDATE alumno SET `contraseña` = ? WHERE usuario = ?', ['123456', al.u]);
            console.log('YA EXISTE (pass actualizado):', al.u);
        }
    }

    const [rows] = await pool.query('SELECT id_alumno, usuario, nombre, apellido FROM alumno ORDER BY id_alumno');
    console.log('\n=== ALUMNOS EN BD ===');
    rows.forEach(r => console.log(r.id_alumno, r.usuario, '-', r.nombre, r.apellido));

    process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
