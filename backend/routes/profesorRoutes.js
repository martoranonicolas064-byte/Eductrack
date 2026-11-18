const express = require('express');
const { getDashboard, getAlumnosPorCurso } = require('../controllers/profesorController');
const { autenticarToken, esProfesor } = require('../middleware/authMiddleware');

const router = express.Router();

// Ruta protegida para el panel principal del profesor
router.get('/dashboard', autenticarToken, esProfesor, getDashboard);

// Ruta protegida para consultar alumnos de un curso
router.get('/alumnos/:id_curso', autenticarToken, esProfesor, getAlumnosPorCurso);

module.exports = router;

