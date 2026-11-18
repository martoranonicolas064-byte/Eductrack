-- ============================================================================
-- EDUCTRACK PRO — ESQUEMA RELACIONAL PARA POSTGRESQL
-- Motor: PostgreSQL 12+ / Supabase / Neon / AWS RDS PostgreSQL
-- ============================================================================

-- 1. Tabla: Profesor / Docente
CREATE TABLE IF NOT EXISTS profesor (
    id_profesor SERIAL PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE,
    avatar_url VARCHAR(255) DEFAULT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla: Curso
CREATE TABLE IF NOT EXISTS curso (
    id_curso SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,           -- Ej: '1A', '2B', '4B'
    nivel VARCHAR(50) NOT NULL DEFAULT 'Secundaria',
    anio INT NOT NULL DEFAULT 2026,
    codigo_invitacion VARCHAR(16) UNIQUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla: Materia / Asignatura
CREATE TABLE IF NOT EXISTS materia (
    id_materia SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,          -- Ej: 'Matemáticas', 'Lenguaje'
    codigo VARCHAR(20) DEFAULT NULL,
    color VARCHAR(20) DEFAULT '#b01c1c'
);

-- 4. Tabla Relacional: Asignación de Docente, Curso y Materia
CREATE TABLE IF NOT EXISTS docente_curso_materia (
    id SERIAL PRIMARY KEY,
    id_profesor INT NOT NULL REFERENCES profesor(id_profesor) ON DELETE CASCADE,
    id_curso INT NOT NULL REFERENCES curso(id_curso) ON DELETE CASCADE,
    id_materia INT NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
    CONSTRAINT uq_prof_curso_mat UNIQUE (id_profesor, id_curso, id_materia)
);

-- 5. Tabla: Alumno
CREATE TABLE IF NOT EXISTS alumno (
    id_alumno SERIAL PRIMARY KEY,
    id_curso INT NOT NULL REFERENCES curso(id_curso) ON DELETE CASCADE,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    rut VARCHAR(20) DEFAULT NULL,
    email VARCHAR(120) DEFAULT NULL
);

-- 6. Tabla: Asistencia
CREATE TABLE IF NOT EXISTS asistencia (
    id_asistencia SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL REFERENCES alumno(id_alumno) ON DELETE CASCADE,
    id_curso INT NOT NULL REFERENCES curso(id_curso) ON DELETE CASCADE,
    id_materia INT NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'presente', -- 'presente', 'ausente', 'tarde', 'justificado'
    observaciones VARCHAR(255) DEFAULT NULL,
    CONSTRAINT uq_asistencia_dia UNIQUE (id_alumno, id_curso, id_materia, fecha)
);

-- 7. Tabla: Pendientes / Tareas / Avisos
CREATE TABLE IF NOT EXISTS pendiente (
    id_pendiente SERIAL PRIMARY KEY,
    id_profesor INT NOT NULL REFERENCES profesor(id_profesor) ON DELETE CASCADE,
    id_curso INT NOT NULL REFERENCES curso(id_curso) ON DELETE CASCADE,
    id_materia INT NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL DEFAULT 'tarea', -- 'tarea', 'prueba', 'reunion'
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_entrega TIMESTAMP NOT NULL,
    completado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DATOS SEMILLA DE PRUEBA (SEED DATA)
-- Contraseña por defecto para Carlos Gómez: '123456'
-- ============================================================================

INSERT INTO profesor (id_profesor, usuario, contraseña, nombre, apellido, email) VALUES
(1, 'profesor1', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Carlos', 'Gómez', 'carlos.gomez@eductrack.edu')
ON CONFLICT (id_profesor) DO NOTHING;

INSERT INTO curso (id_curso, nombre, nivel, anio) VALUES
(1, '1A', 'Secundaria', 2026),
(2, '1B', 'Secundaria', 2026),
(3, '2A', 'Secundaria', 2026),
(4, '2B', 'Secundaria', 2026),
(5, '3A', 'Secundaria', 2026),
(6, '3B', 'Secundaria', 2026),
(7, '4A', 'Secundaria', 2026),
(8, '4B', 'Secundaria', 2026)
ON CONFLICT (id_curso) DO NOTHING;

INSERT INTO materia (id_materia, nombre, color) VALUES
(1, 'Matemáticas', '#b01c1c'),
(2, 'Lenguaje', '#1976d2'),
(3, 'Ciencias', '#388e3c'),
(4, 'Historia', '#f57c00'),
(5, 'Inglés', '#7b1fa2'),
(6, 'Educación Física', '#00796b')
ON CONFLICT (id_materia) DO NOTHING;

-- Asignación del profesor a los cursos 4B y 3A
INSERT INTO docente_curso_materia (id_profesor, id_curso, id_materia) VALUES
(1, 8, 1), -- Carlos Gómez -> 4B -> Matemáticas
(1, 8, 4), -- Carlos Gómez -> 4B -> Historia
(1, 5, 1)  -- Carlos Gómez -> 3A -> Matemáticas
ON CONFLICT DO NOTHING;

-- Alumnos de ejemplo en 4B
INSERT INTO alumno (id_alumno, id_curso, usuario, contraseña, nombre, apellido, email) VALUES
(1, 8, 'amorales', '123456', 'Agustín', 'Morales', 'agustin@eductrack.edu'),
(2, 8, 'cfernandez', '123456', 'Camila', 'Fernández', 'camila@eductrack.edu'),
(3, 8, 'lucas_fernandez', '123456', 'Lucas', 'Fernández', 'lucas@eductrack.edu')
ON CONFLICT (id_alumno) DO NOTHING;

-- Sincronizar secuencias
SELECT setval('profesor_id_profesor_seq', (SELECT MAX(id_profesor) FROM profesor));
SELECT setval('curso_id_curso_seq', (SELECT MAX(id_curso) FROM curso));
SELECT setval('materia_id_materia_seq', (SELECT MAX(id_materia) FROM materia));
SELECT setval('alumno_id_alumno_seq', (SELECT MAX(id_alumno) FROM alumno));

