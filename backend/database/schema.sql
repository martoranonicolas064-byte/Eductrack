-- ========================================================
-- SISTEMA DE GESTIÓN DOCENTE (EDUCTRACK)
-- Esquema Relacional de Base de Datos SQL (MySQL / MariaDB)
-- ========================================================

CREATE DATABASE IF NOT EXISTS eductrack_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE eductrack_db;

-- 1. Tabla: Administrador
CREATE TABLE IF NOT EXISTS administrador (
    id_admin INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabla: Profesor / Docente
CREATE TABLE IF NOT EXISTS profesor (
    id_profesor INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    avatar_url VARCHAR(255) DEFAULT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Tabla: Curso
CREATE TABLE IF NOT EXISTS curso (
    id_curso INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    nivel VARCHAR(50) NOT NULL,
    anio INT NOT NULL DEFAULT 2026,
    codigo_invitacion VARCHAR(16) UNIQUE NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Tabla: Materia / Asignatura
CREATE TABLE IF NOT EXISTS materia (
    id_materia INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) DEFAULT NULL,
    color VARCHAR(20) DEFAULT '#b71c1c'
) ENGINE=InnoDB;

-- 5. Tabla Relacional: Asignación de Profesor, Curso y Materia
CREATE TABLE IF NOT EXISTS docente_curso_materia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_profesor INT NOT NULL,
    id_curso INT NOT NULL,
    id_materia INT NOT NULL,
    FOREIGN KEY (id_profesor) REFERENCES profesor(id_profesor) ON DELETE CASCADE,
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso) ON DELETE CASCADE,
    FOREIGN KEY (id_materia) REFERENCES materia(id_materia) ON DELETE CASCADE,
    UNIQUE KEY uq_docente_curso_mat (id_profesor, id_curso, id_materia)
) ENGINE=InnoDB;

-- 6. Tabla: Alumno
CREATE TABLE IF NOT EXISTS alumno (
    id_alumno INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    rut VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Tabla: Periodo Académico
CREATE TABLE IF NOT EXISTS periodo (
    id_periodo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    anio INT NOT NULL DEFAULT 2026,
    fecha_inicio DATE,
    fecha_fin DATE
) ENGINE=InnoDB;

-- 8. Tabla: Asistencia
CREATE TABLE IF NOT EXISTS asistencia (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_alumno INT NOT NULL,
    id_curso INT NOT NULL,
    id_materia INT NOT NULL,
    fecha DATE NOT NULL,
    estado ENUM('presente', 'ausente', 'justificado', 'atraso') NOT NULL DEFAULT 'presente',
    observaciones VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno) ON DELETE CASCADE,
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso) ON DELETE CASCADE,
    FOREIGN KEY (id_materia) REFERENCES materia(id_materia) ON DELETE CASCADE,
    UNIQUE KEY uq_alumno_asistencia_dia (id_alumno, id_curso, id_materia, fecha)
) ENGINE=InnoDB;

-- 9. Tabla: Evaluaciones
CREATE TABLE IF NOT EXISTS evaluacion (
    id_evaluacion INT AUTO_INCREMENT PRIMARY KEY,
    id_curso INT NOT NULL,
    id_materia INT NOT NULL,
    id_periodo INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    ponderacion DECIMAL(4,2) DEFAULT 1.0,
    fecha_evaluacion DATE DEFAULT NULL,
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso) ON DELETE CASCADE,
    FOREIGN KEY (id_materia) REFERENCES materia(id_materia) ON DELETE CASCADE,
    FOREIGN KEY (id_periodo) REFERENCES periodo(id_periodo) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Tabla: Calificaciones / Notas
CREATE TABLE IF NOT EXISTS calificacion (
    id_calificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_evaluacion INT NOT NULL,
    id_alumno INT NOT NULL,
    nota DECIMAL(3,1) NOT NULL,
    observacion VARCHAR(150) DEFAULT NULL,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_evaluacion) REFERENCES evaluacion(id_evaluacion) ON DELETE CASCADE,
    FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno) ON DELETE CASCADE,
    UNIQUE KEY uq_alumno_evaluacion (id_evaluacion, id_alumno)
) ENGINE=InnoDB;

-- 11. Tabla: Archivos Compartidos y Material Didáctico
CREATE TABLE IF NOT EXISTS archivo (
    id_archivo INT AUTO_INCREMENT PRIMARY KEY,
    id_profesor INT NOT NULL,
    id_curso INT NOT NULL,
    id_materia INT NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_servidor VARCHAR(255) NOT NULL,
    ruta VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    tamanio INT NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_profesor) REFERENCES profesor(id_profesor) ON DELETE CASCADE,
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso) ON DELETE CASCADE,
    FOREIGN KEY (id_materia) REFERENCES materia(id_materia) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. Tabla: Pendientes (Tareas, Pruebas y Recordatorios)
CREATE TABLE IF NOT EXISTS pendiente (
    id_pendiente INT AUTO_INCREMENT PRIMARY KEY,
    id_profesor INT NOT NULL,
    id_curso INT NOT NULL,
    id_materia INT NOT NULL,
    tipo ENUM('tarea', 'prueba', 'recordatorio') NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_entrega DATETIME NOT NULL,
    completado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_profesor) REFERENCES profesor(id_profesor) ON DELETE CASCADE,
    FOREIGN KEY (id_curso) REFERENCES curso(id_curso) ON DELETE CASCADE,
    FOREIGN KEY (id_materia) REFERENCES materia(id_materia) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ========================================================
-- DATOS INICIALES DE PRUEBA (SEEDS)
-- ========================================================

-- Contraseña encriptada para '123456' usando bcrypt ($2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW)
INSERT INTO profesor (id_profesor, usuario, contraseña, nombre, apellido, email) VALUES
(1, 'profesor', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Carlos', 'Gómez', 'carlos.gomez@eductrack.cl')
ON DUPLICATE KEY UPDATE nombre=nombre;

INSERT INTO curso (id_curso, nombre, nivel, anio, codigo_invitacion) VALUES
(1, '4B', 'Enseñanza Media', 2026, 'EDU-4B-9872')
ON DUPLICATE KEY UPDATE nombre=nombre;

INSERT INTO materia (id_materia, nombre, codigo, color) VALUES
(1, 'Matemáticas', 'MAT-4B', '#e53935'),
(2, 'Historia', 'HIS-4B', '#c62828')
ON DUPLICATE KEY UPDATE nombre=nombre;

INSERT INTO docente_curso_materia (id_profesor, id_curso, id_materia) VALUES
(1, 1, 1),
(1, 1, 2)
ON DUPLICATE KEY UPDATE id_profesor=id_profesor;

-- ALUMNOS (Contraseña por defecto: 123456)
INSERT INTO alumno (id_alumno, id_curso, usuario, contraseña, nombre, apellido, rut, email) VALUES
(1, 1, 'alumno1', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Agustín', 'Morales', '21.456.789-1', 'agustin.m@eductrack.cl'),
(2, 1, 'alumno2', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Camila', 'Fernández', '21.789.123-4', 'camila.f@eductrack.cl'),
(3, 1, 'alumno3', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Diego', 'Reyes', '22.123.456-7', 'diego.r@eductrack.cl'),
(4, 1, 'alumno4', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Ignacia', 'Silva', '21.890.321-0', 'ignacia.s@eductrack.cl'),
(5, 1, 'alumno5', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Matías', 'Castillo', '21.567.890-2', 'matias.c@eductrack.cl'),
(6, 1, 'alumno6', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Sofía', 'Pérez', '22.345.678-9', 'sofia.p@eductrack.cl'),
(7, 1, 'alumno7', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Valentina', 'Torres', '21.901.234-5', 'valentina.t@eductrack.cl'),
(104, 1, 'lucas_fernandez', '$2a$10$8sJ15uKzH32xH3m2P7l49eqYQ6f0W.9YJpBvFk9mBfO3Jk2O7hVbW', 'Lucas', 'Fernández', '48.912.405', 'lucas.fernandez@alumnos.edutrack.edu')
ON DUPLICATE KEY UPDATE nombre=nombre;
