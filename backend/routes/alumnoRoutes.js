const express = require('express');
const { getDashboard } = require('../controllers/alumnoController');
const { autenticarToken, esAlumno } = require('../middleware/authMiddleware');

const router = express.Router();

// Ruta protegida con JWT y rol estricto para obtener el panel completo del estudiante
router.get('/dashboard', autenticarToken, esAlumno, getDashboard);

module.exports = router;

