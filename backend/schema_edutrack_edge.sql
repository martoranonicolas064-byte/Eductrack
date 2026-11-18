-- ============================================================================
-- EDUCTRACK PRO — ESQUEMA RELACIONAL Y CONECTIVIDAD EDGE DISTRIBUIDA
-- Motor: MySQL 8.0+ / MariaDB 10.5+
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `educktrack_db` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `educktrack_db`;

-- Desactivar chequeo de claves foráneas temporalmente para inicialización limpia
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `edge_sync_log`;
DROP TABLE IF EXISTS `edge_devices`;
DROP TABLE IF EXISTS `archivos_estudio`;
DROP TABLE IF EXISTS `recordatorios`;
DROP TABLE IF EXISTS `asistencias`;
DROP TABLE IF EXISTS `calificaciones`;
DROP TABLE IF EXISTS `matriculas`;
DROP TABLE IF EXISTS `materias`;
DROP TABLE IF EXISTS `cursos`;
DROP TABLE IF EXISTS `alumno`;
DROP TABLE IF EXISTS `profesor`;
DROP TABLE IF EXISTS `administrador`;
DROP TABLE IF EXISTS `usuarios`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. TABLA UNIFICADA DE AUTENTICACIÓN (CORE RBAC)
CREATE TABLE `usuarios` (
    `id_usuario` INT AUTO_INCREMENT PRIMARY KEY,
    `usuario` VARCHAR(60) NOT NULL UNIQUE,
    `contraseña` VARCHAR(255) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `rol` ENUM('administrador', 'profesor', 'alumno') NOT NULL,
    `estado` ENUM('activo', 'inactivo', 'suspendido') DEFAULT 'activo',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_usuario_rol` (`usuario`, `rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA ADMINISTRADOR
CREATE TABLE `administrador` (
    `id_admin` INT AUTO_INCREMENT PRIMARY KEY,
    `id_usuario` INT NULL,
    `usuario` VARCHAR(50) NOT NULL UNIQUE,
    `contraseña` VARCHAR(255) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL DEFAULT 'Administrador Central',
    `nivel_acceso` INT DEFAULT 1,
    CONSTRAINT `fk_admin_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA CURSOS (AÑOS Y DIVISIONES ACADÉMICAS)
CREATE TABLE `cursos` (
    `id_curso` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre` VARCHAR(60) NOT NULL,           -- Ej: "4° Año A"
    `nivel` VARCHAR(40) NOT NULL DEFAULT 'Secundaria',
    `division` VARCHAR(10) NOT NULL DEFAULT 'A',
    `turno` ENUM('Mañana', 'Tarde', 'Noche') DEFAULT 'Mañana',
    `ciclo_lectivo` INT NOT NULL DEFAULT 2026
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA PROFESOR
CREATE TABLE `profesor` (
    `id_profesor` INT AUTO_INCREMENT PRIMARY KEY,
    `id_usuario` INT NULL,
    `usuario` VARCHAR(50) NOT NULL UNIQUE,
    `contraseña` VARCHAR(255) NOT NULL,
    `nombre` VARCHAR(50) NOT NULL,
    `apellido` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100),
    `especialidad` VARCHAR(100) DEFAULT 'Docencia General',
    CONSTRAINT `fk_profesor_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA ALUMNO (CASO DE ESTUDIO DEL ALUMNO)
CREATE TABLE `alumno` (
    `id_alumno` INT AUTO_INCREMENT PRIMARY KEY,
    `id_usuario` INT NULL,
    `legajo` VARCHAR(30) NOT NULL UNIQUE,     -- Ej: "ALU-2026-8492"
    `usuario` VARCHAR(50) NOT NULL UNIQUE,
    `contraseña` VARCHAR(255) NOT NULL,
    `nombre` VARCHAR(50) NOT NULL,
    `apellido` VARCHAR(50) NOT NULL,
    `id_curso_actual` INT NULL,
    `fecha_nacimiento` DATE,
    `dni` VARCHAR(20) UNIQUE,
    `tutor_contacto` VARCHAR(100),
    CONSTRAINT `fk_alumno_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios`(`id_usuario`) ON DELETE SET NULL,
    CONSTRAINT `fk_alumno_curso` FOREIGN KEY (`id_curso_actual`) REFERENCES `cursos`(`id_curso`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA MATERIAS
CREATE TABLE `materias` (
    `id_materia` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo` VARCHAR(20) NOT NULL UNIQUE,
    `nombre` VARCHAR(80) NOT NULL,           -- Ej: "Matemática", "Lengua y Literatura"
    `area` VARCHAR(60) NOT NULL,
    `carga_horaria_semanal` INT DEFAULT 4,
    `id_profesor_titular` INT NULL,
    CONSTRAINT `fk_materia_profesor` FOREIGN KEY (`id_profesor_titular`) REFERENCES `profesor`(`id_profesor`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABLA MATRÍCULAS (INSCRIPCIÓN DE ALUMNOS EN CURSOS/MATERIAS)
CREATE TABLE `matriculas` (
    `id_matricula` INT AUTO_INCREMENT PRIMARY KEY,
    `id_alumno` INT NOT NULL,
    `id_curso` INT NOT NULL,
    `ciclo_lectivo` INT NOT NULL DEFAULT 2026,
    `estado` ENUM('regular', 'libre', 'egresado') DEFAULT 'regular',
    CONSTRAINT `fk_matricula_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumno`(`id_alumno`) ON DELETE CASCADE,
    CONSTRAINT `fk_matricula_curso` FOREIGN KEY (`id_curso`) REFERENCES `cursos`(`id_curso`) ON DELETE CASCADE,
    UNIQUE KEY `uk_alumno_curso_ciclo` (`id_alumno`, `id_curso`, `ciclo_lectivo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABLA CALIFICACIONES (BOLETÍN DE NOTAS Y PROMEDIO GENERAL)
CREATE TABLE `calificaciones` (
    `id_calificacion` INT AUTO_INCREMENT PRIMARY KEY,
    `id_alumno` INT NOT NULL,
    `id_materia` INT NOT NULL,
    `id_profesor` INT NULL,
    `tipo_evaluacion` VARCHAR(80) NOT NULL,    -- Ej: "Trabajo Práctico 1", "Examen de Sintaxis"
    `nota` DECIMAL(4,2) NOT NULL,             -- Ej: 9.00, 8.50, 10.00, 7.50
    `ponderacion_porcentaje` DECIMAL(5,2) DEFAULT 25.00,
    `periodo` VARCHAR(30) DEFAULT 'Trimestre 1',
    `fecha_calificacion` DATE NOT NULL,
    `observaciones` TEXT,
    CONSTRAINT `fk_calif_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumno`(`id_alumno`) ON DELETE CASCADE,
    CONSTRAINT `fk_calif_materia` FOREIGN KEY (`id_materia`) REFERENCES `materias`(`id_materia`) ON DELETE CASCADE,
    CONSTRAINT `fk_calif_profesor` FOREIGN KEY (`id_profesor`) REFERENCES `profesor`(`id_profesor`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABLA ASISTENCIAS (MÉTRICAS DEL ALUMNO)
CREATE TABLE `asistencias` (
    `id_asistencia` INT AUTO_INCREMENT PRIMARY KEY,
    `id_alumno` INT NOT NULL,
    `id_curso` INT NOT NULL,
    `fecha` DATE NOT NULL,
    `estado` ENUM('presente', 'ausente', 'tarde') NOT NULL,
    `justificada` BOOLEAN DEFAULT FALSE,
    `origen_registro` ENUM('manual_docente', 'edge_biometric', 'edge_qr') DEFAULT 'edge_qr',
    CONSTRAINT `fk_asist_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumno`(`id_alumno`) ON DELETE CASCADE,
    CONSTRAINT `fk_asist_curso` FOREIGN KEY (`id_curso`) REFERENCES `cursos`(`id_curso`) ON DELETE CASCADE,
    UNIQUE KEY `uk_asistencia_diaria` (`id_alumno`, `fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABLA ARCHIVOS DE ESTUDIO (MATERIALES PDF / CACHÉ EDGE)
CREATE TABLE `archivos_estudio` (
    `id_archivo` INT AUTO_INCREMENT PRIMARY KEY,
    `nombre_archivo` VARCHAR(150) NOT NULL,
    `tamano_bytes` BIGINT NOT NULL,
    `tamano_legible` VARCHAR(20) NOT NULL,     -- Ej: "1.2 MB", "840 KB"
    `mime_type` VARCHAR(80) DEFAULT 'application/pdf',
    `hash_sha256` CHAR(64) NULL,               -- Verificación de integridad en Edge Caching
    `url_descarga` VARCHAR(255) NOT NULL,
    `id_materia` INT NULL,
    `id_profesor_autor` INT NULL,
    `fecha_publicacion` DATE NOT NULL,
    CONSTRAINT `fk_archivo_materia` FOREIGN KEY (`id_materia`) REFERENCES `materias`(`id_materia`) ON DELETE SET NULL,
    CONSTRAINT `fk_archivo_profesor` FOREIGN KEY (`id_profesor_autor`) REFERENCES `profesor`(`id_profesor`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABLA RECORDATORIOS / AGENDA
CREATE TABLE `recordatorios` (
    `id_recordatorio` INT AUTO_INCREMENT PRIMARY KEY,
    `id_materia` INT NOT NULL,
    `id_profesor` INT NULL,
    `categoria` VARCHAR(60) NOT NULL,          -- Ej: "MATEMATICA", "LENGUA Y LITERATURA"
    `texto` TEXT NOT NULL,
    `fecha_programada` DATE NOT NULL,
    `id_archivo_adjunto` INT NULL,
    CONSTRAINT `fk_recordatorio_materia` FOREIGN KEY (`id_materia`) REFERENCES `materias`(`id_materia`) ON DELETE CASCADE,
    CONSTRAINT `fk_recordatorio_profesor` FOREIGN KEY (`id_profesor`) REFERENCES `profesor`(`id_profesor`) ON DELETE SET NULL,
    CONSTRAINT `fk_recordatorio_archivo` FOREIGN KEY (`id_archivo_adjunto`) REFERENCES `archivos_estudio`(`id_archivo`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TABLAS ESPECÍFICAS DE ARQUITECTURA "EDGE" (NODOS LOCALES Y DISPOSITIVOS DE BORDE)
CREATE TABLE `edge_devices` (
    `id_edge` INT AUTO_INCREMENT PRIMARY KEY,
    `codigo_nodo` VARCHAR(50) NOT NULL UNIQUE,  -- Ej: "EDGE-AULA-B3"
    `ubicacion_aula` VARCHAR(80) NOT NULL,
    `ip_local` VARCHAR(45) NOT NULL,
    `estado_red` ENUM('online', 'offline', 'sincronizando') DEFAULT 'online',
    `ultima_sincronizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `version_firmware` VARCHAR(20) DEFAULT 'v2.4.1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `edge_sync_log` (
    `id_log` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `id_edge` INT NOT NULL,
    `tipo_entidad` ENUM('asistencia', 'calificaciones', 'recordatorios', 'cache_archivos') NOT NULL,
    `registros_afectados` INT DEFAULT 0,
    `latencia_ms` INT DEFAULT 12,
    `resultado` ENUM('ok', 'conflicto_resuelto', 'error') DEFAULT 'ok',
    `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_edge_log_device` FOREIGN KEY (`id_edge`) REFERENCES `edge_devices`(`id_edge`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VISTAS ANALÍTICAS: CÁLCULO AUTOMÁTICO DE PROMEDIO GENERAL Y ASISTENCIA
-- ============================================================================

-- Vista del Promedio General del Alumno
CREATE OR REPLACE VIEW `vw_promedios_alumnos` AS
SELECT 
    a.id_alumno,
    a.legajo,
    CONCAT(a.nombre, ' ', a.apellido) AS nombre_completo,
    c.nombre AS curso,
    COUNT(cal.id_calificacion) AS total_evaluaciones,
    ROUND(AVG(cal.nota), 2) AS promedio_general,
    ROUND(MIN(cal.nota), 2) AS nota_minima,
    ROUND(MAX(cal.nota), 2) AS nota_maxima,
    CASE 
        WHEN AVG(cal.nota) >= 8.50 THEN 'Sobresaliente / Aprobado con Distinción'
        WHEN AVG(cal.nota) >= 6.00 THEN 'Aprobado Regular'
        ELSE 'En Recuperatorio'
    END AS estado_academico
FROM `alumno` a
LEFT JOIN `cursos` c ON a.id_curso_actual = c.id_curso
LEFT JOIN `calificaciones` cal ON a.id_alumno = cal.id_alumno
GROUP BY a.id_alumno, a.legajo, a.nombre, a.apellido, c.nombre;

-- Vista del Resumen de Asistencia
CREATE OR REPLACE VIEW `vw_resumen_asistencia` AS
SELECT 
    a.id_alumno,
    a.legajo,
    CONCAT(a.nombre, ' ', a.apellido) AS nombre_completo,
    SUM(CASE WHEN ast.estado = 'presente' THEN 1 ELSE 0 END) AS dias_presente,
    SUM(CASE WHEN ast.estado = 'ausente' THEN 1 ELSE 0 END) AS dias_ausente,
    SUM(CASE WHEN ast.estado = 'tarde' THEN 1 ELSE 0 END) AS dias_tarde,
    COUNT(ast.id_asistencia) AS total_registros,
    ROUND((SUM(CASE WHEN ast.estado = 'presente' THEN 1 ELSE 0 END) / COUNT(ast.id_asistencia)) * 100, 1) AS porcentaje_asistencia
FROM `alumno` a
LEFT JOIN `asistencias` ast ON a.id_alumno = ast.id_alumno
GROUP BY a.id_alumno, a.legajo, a.nombre, a.apellido;

-- ============================================================================
-- DATA SET REALISTA DE PRUEBA (SEED DATA ALINEADO AL CASO DE ESTUDIO)
-- ============================================================================

-- Usuarios
INSERT INTO `usuarios` (`id_usuario`, `usuario`, `contraseña`, `email`, `rol`) VALUES
(1, 'admin', '$2a$10$e8w.p4B03fN7jC86O8R0beT5eT4G2fU0ZqIq9F3t2w5iY0X9.vXme', 'admin@edutrack.edu', 'administrador'),
(2, 'prof_martinez', '$2a$10$e8w.p4B03fN7jC86O8R0beT5eT4G2fU0ZqIq9F3t2w5iY0X9.vXme', 'smartinez@edutrack.edu', 'profesor'),
(3, 'lucas_fernandez', '$2a$10$e8w.p4B03fN7jC86O8R0beT5eT4G2fU0ZqIq9F3t2w5iY0X9.vXme', 'lucas.fernandez@alumnos.edutrack.edu', 'alumno');

-- Cursos
INSERT INTO `cursos` (`id_curso`, `nombre`, `nivel`, `division`, `turno`, `ciclo_lectivo`) VALUES
(1, '4° Año A', 'Secundaria Orientada', 'A', 'Mañana', 2026);

-- Profesores
INSERT INTO `profesor` (`id_profesor`, `id_usuario`, `usuario`, `contraseña`, `nombre`, `apellido`, `email`, `especialidad`) VALUES
(1, 2, 'prof_martinez', '$2a$10$e8w.p4B03fN7jC86O8R0beT5eT4G2fU0ZqIq9F3t2w5iY0X9.vXme', 'Silvia', 'Martínez', 'smartinez@edutrack.edu', 'Ciencias Exactas');

-- Alumno
INSERT INTO `alumno` (`id_alumno`, `id_usuario`, `legajo`, `usuario`, `contraseña`, `nombre`, `apellido`, `id_curso_actual`, `fecha_nacimiento`, `dni`) VALUES
(104, 3, 'ALU-2026-8492', 'lucas_fernandez', '$2a$10$e8w.p4B03fN7jC86O8R0beT5eT4G2fU0ZqIq9F3t2w5iY0X9.vXme', 'Lucas', 'Fernández', 1, '2010-04-14', '48.912.405');

-- Materias
INSERT INTO `materias` (`id_materia`, `codigo`, `nombre`, `area`, `carga_horaria_semanal`, `id_profesor_titular`) VALUES
(1, 'MAT-401', 'Matemática', 'Ciencias Exactas', 5, 1),
(2, 'LEN-402', 'Lengua y Literatura', 'Humanidades', 4, 1),
(3, 'HIS-403', 'Historia', 'Ciencias Sociales', 3, 1),
(4, 'FIS-404', 'Física', 'Ciencias Naturales', 4, 1);

-- Calificaciones del Alumno (Cálculo exacto: (9.0 + 8.5 + 10.0 + 7.5)/4 = 8.75)
INSERT INTO `calificaciones` (`id_alumno`, `id_materia`, `id_profesor`, `tipo_evaluacion`, `nota`, `ponderacion_porcentaje`, `periodo`, `fecha_calificacion`) VALUES
(104, 1, 1, 'Trabajo Práctico 1', 9.00, 25.00, 'Trimestre 1', '2026-09-12'),
(104, 2, 1, 'Examen de Sintaxis', 8.50, 25.00, 'Trimestre 1', '2026-09-22'),
(104, 3, 1, 'Presentación Oral', 10.00, 25.00, 'Trimestre 1', '2026-09-28'),
(104, 4, 1, 'Laboratorio Parcial', 7.50, 25.00, 'Trimestre 1', '2026-10-05');

-- Asistencia: 28 presentes, 2 ausentes, 1 tardanza = 31 registros totales (90.3% ~ 90%)
INSERT INTO `asistencias` (`id_alumno`, `id_curso`, `fecha`, `estado`, `justificada`) VALUES
(104, 1, '2026-10-01', 'presente', 0),
(104, 1, '2026-10-02', 'presente', 0),
(104, 1, '2026-10-03', 'tarde', 1),
(104, 1, '2026-10-06', 'presente', 0),
(104, 1, '2026-10-07', 'ausente', 1),
(104, 1, '2026-10-08', 'presente', 0),
(104, 1, '2026-10-09', 'presente', 0),
(104, 1, '2026-10-10', 'presente', 0),
(104, 1, '2026-10-13', 'presente', 0),
(104, 1, '2026-10-14', 'ausente', 0),
(104, 1, '2026-10-15', 'presente', 0);
-- Inserción sintética complementaria para completar los 28 presentes
INSERT INTO `asistencias` (`id_alumno`, `id_curso`, `fecha`, `estado`) VALUES
(104, 1, '2026-09-01', 'presente'), (104, 1, '2026-09-02', 'presente'), (104, 1, '2026-09-03', 'presente'),
(104, 1, '2026-09-04', 'presente'), (104, 1, '2026-09-07', 'presente'), (104, 1, '2026-09-08', 'presente'),
(104, 1, '2026-09-09', 'presente'), (104, 1, '2026-09-10', 'presente'), (104, 1, '2026-09-11', 'presente'),
(104, 1, '2026-09-14', 'presente'), (104, 1, '2026-09-15', 'presente'), (104, 1, '2026-09-16', 'presente'),
(104, 1, '2026-09-17', 'presente'), (104, 1, '2026-09-18', 'presente'), (104, 1, '2026-09-21', 'presente'),
(104, 1, '2026-09-22', 'presente'), (104, 1, '2026-09-23', 'presente'), (104, 1, '2026-09-24', 'presente'),
(104, 1, '2026-09-25', 'presente'), (104, 1, '2026-09-28', 'presente');

-- Archivos de Estudio
INSERT INTO `archivos_estudio` (`id_archivo`, `nombre_archivo`, `tamano_bytes`, `tamano_legible`, `mime_type`, `url_descarga`, `id_materia`, `id_profesor_autor`, `fecha_publicacion`) VALUES
(1, 'material_estudio.pdf', 1258291, '1.2 MB', 'application/pdf', '/static/docs/material_estudio.pdf', 2, 1, '2026-09-02'),
(2, 'ejercicios_math.pdf', 860160, '840 KB', 'application/pdf', '/static/docs/ejercicios_math.pdf', 1, 1, '2026-09-08'),
(3, 'guia_historia.pdf', 2202009, '2.1 MB', 'application/pdf', '/static/docs/guia_historia.pdf', 3, 1, '2026-09-15');

-- Recordatorios
INSERT INTO `recordatorios` (`id_recordatorio`, `id_materia`, `id_profesor`, `categoria`, `texto`, `fecha_programada`, `id_archivo_adjunto`) VALUES
(1, 1, 1, 'MATEMATICA', 'Chicos recuerden entregar el trabajo practico mañana', '2026-10-01', NULL),
(2, 2, 1, 'LENGUA Y LITERATURA', 'estudien este pdf para la prueba', '2026-10-30', 1),
(3, 2, 1, 'LENGUA Y LITERATURA', 'Entrega de ejercicio de Lengua', '2026-10-05', NULL),
(4, 1, 1, 'MATEMATICA', 'Revisión de carpetas', '2026-10-10', 2);

-- Nodo Edge Institucional
INSERT INTO `edge_devices` (`id_edge`, `codigo_nodo`, `ubicacion_aula`, `ip_local`, `estado_red`, `version_firmware`) VALUES
(1, 'EDGE-AULA-B3', 'Edificio Principal - Aula B3', '192.168.10.45', 'online', 'v2.4.1');

INSERT INTO `edge_sync_log` (`id_edge`, `tipo_entidad`, `registros_afectados`, `latencia_ms`, `resultado`) VALUES
(1, 'asistencia', 31, 8, 'ok'),
(1, 'calificaciones', 4, 11, 'ok'),
(1, 'cache_archivos', 3, 24, 'ok');
