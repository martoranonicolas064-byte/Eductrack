-- ========================================================
-- EDUCTRACK PRO — ESQUEMA COMPATIBLE CON TIDB CLOUD & MYSQL 8
-- Diseñado para TiDB Cloud Serverless / Dedicated
-- ========================================================

CREATE DATABASE IF NOT EXISTS eductrack_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE eductrack_db;

-- 1. Administradores
CREATE TABLE IF NOT EXISTS administrador (
    id_admin INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) DEFAULT 'Administrador Central',
    email VARCHAR(100) DEFAULT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Profesores
CREATE TABLE IF NOT EXISTS profesor (
    id_profesor INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(100) DEFAULT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Cursos
CREATE TABLE IF NOT EXISTS curso (
    id_curso INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) DEFAULT '4° Año B',
    año INT DEFAULT 4,
    anio INT DEFAULT 4,
    division VARCHAR(10) DEFAULT 'B',
    turno VARCHAR(20) DEFAULT 'Mañana',
    nivel VARCHAR(50) DEFAULT 'Secundaria',
    codigo_invitacion VARCHAR(30) DEFAULT 'EDU-4B-9872',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Materias
CREATE TABLE IF NOT EXISTS materia (
    id_materia INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) DEFAULT NULL,
    color VARCHAR(20) DEFAULT '#b71c1c'
);

-- 5. Asignaciones (Profesor <-> Materia <-> Curso)
CREATE TABLE IF NOT EXISTS asignacion (
    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
    id_profesor INT NOT NULL,
    id_materia INT NOT NULL,
    id_curso INT NOT NULL,
    INDEX idx_asig_prof (id_profesor),
    INDEX idx_asig_curso (id_curso),
    INDEX idx_asig_mat (id_materia)
);

-- 6. Alumnos
CREATE TABLE IF NOT EXISTS alumno (
    id_alumno INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT DEFAULT 1,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    rut VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    INDEX idx_alumno_curso (id_curso)
);

-- 7. Calificaciones / Notas
CREATE TABLE IF NOT EXISTS nota (
    id_nota INT AUTO_INCREMENT PRIMARY KEY,
    id_alumno INT NOT NULL,
    id_asignacion INT NOT NULL,
    periodo VARCHAR(50) DEFAULT '1° cuatrimestre',
    nota DECIMAL(4,2) NOT NULL,
    INDEX idx_nota_alumno (id_alumno),
    INDEX idx_nota_asig (id_asignacion)
);

-- 8. Recordatorios y Tareas
CREATE TABLE IF NOT EXISTS recordatorio (
    id_recordatorio INT AUTO_INCREMENT PRIMARY KEY,
    id_asignacion INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT,
    fecha_limite DATETIME,
    estado VARCHAR(20) DEFAULT 'pendiente',
    INDEX idx_rec_asig (id_asignacion)
);

-- 9. Archivos Didácticos
CREATE TABLE IF NOT EXISTS archivo (
    id_archivo INT AUTO_INCREMENT PRIMARY KEY,
    id_asignacion INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    url_archivo VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_arch_asig (id_asignacion)
);

-- 10. Asistencias
CREATE TABLE IF NOT EXISTS asistencia (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_alumno INT NOT NULL,
    id_asignacion INT DEFAULT 1,
    fecha DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'P',
    INDEX idx_asist_alumno (id_alumno)
);

-- ========================================================
-- DATOS INICIALES SEMILLA (SEEDS)
-- ========================================================

-- Administradores
INSERT INTO administrador (usuario, contraseña, nombre) VALUES
('admin', 'admin123', 'Administrador General'),
('rectoria', 'rectoria2026', 'Rectoría Institucional')
ON DUPLICATE KEY UPDATE contraseña=VALUES(contraseña);

-- Profesores (Acceso con contraseña 123456)
INSERT INTO profesor (id_profesor, usuario, contraseña, nombre, apellido, email) VALUES
(1, 'profesor', '123456', 'Carlos', 'Gómez', 'carlos.gomez@eductrack.cl'),
(2, 'profesor1', '123456', 'Juan', 'Pérez', 'juan.perez@eductrack.cl')
ON DUPLICATE KEY UPDATE contraseña=VALUES(contraseña);

-- Curso
INSERT INTO curso (id_curso, nombre, año, anio, division, turno) VALUES
(1, '4° Año B', 4, 4, 'B', 'Mañana')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Materias
INSERT INTO materia (id_materia, nombre, codigo, color) VALUES
(1, 'Matemáticas', 'MAT-4B', '#e53935'),
(2, 'Historia', 'HIS-4B', '#c62828'),
(3, 'Base de datos', 'BD-4B', '#b71c1c')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

-- Asignaciones
INSERT INTO asignacion (id_asignacion, id_profesor, id_materia, id_curso) VALUES
(1, 1, 1, 1),
(2, 1, 2, 1),
(3, 1, 3, 1)
ON DUPLICATE KEY UPDATE id_profesor=VALUES(id_profesor);

-- Alumnos (Acceso con contraseña 123456)
INSERT INTO alumno (id_alumno, id_curso, usuario, contraseña, nombre, apellido, email) VALUES
(1, 1, 'alumno1', '123456', 'Agustín', 'Morales', 'agustin.m@eductrack.cl'),
(2, 1, 'alumno2', '123456', 'Camila', 'Fernández', 'camila.f@eductrack.cl'),
(3, 1, 'lucas_fernandez', '123456', 'Lucas', 'Fernández', 'lucas.fernandez@alumnos.edutrack.edu')
ON DUPLICATE KEY UPDATE contraseña=VALUES(contraseña);
