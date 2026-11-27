const express = require('express');
const {
    getDashboard,
    getAlumnosPorCurso,
    guardarAsistencia,
    getAsistenciaPorFecha,
    programarReunion,
    getRecordatoriosProfesor,
    crearRecordatorioProfesor,
    eliminarRecordatorioProfesor,
    getNotasPorCurso,
    guardarNotas
} = require('../controllers/profesorController');
const { autenticarToken, esProfesor } = require('../middleware/authMiddleware');

const router = express.Router();

// Dashboard general del docente
router.get('/dashboard', autenticarToken, esProfesor, getDashboard);

// Alumnos del curso
router.get('/alumnos/:id_curso', autenticarToken, esProfesor, getAlumnosPorCurso);

// Asistencia
router.post('/asistencia', autenticarToken, esProfesor, guardarAsistencia);
router.get('/asistencia/:id_curso', autenticarToken, esProfesor, getAsistenciaPorFecha);

// Calificaciones / Notas
router.get('/notas/:id_curso', autenticarToken, esProfesor, getNotasPorCurso);
router.post('/notas', autenticarToken, esProfesor, guardarNotas);

// Programar reunión de clase
router.post('/reunion', autenticarToken, esProfesor, programarReunion);

// Recordatorios y avisos a cursos
router.get('/recordatorios', autenticarToken, esProfesor, getRecordatoriosProfesor);
router.post('/recordatorios', autenticarToken, esProfesor, crearRecordatorioProfesor);
router.delete('/recordatorios/:id', autenticarToken, esProfesor, eliminarRecordatorioProfesor);

module.exports = router;
