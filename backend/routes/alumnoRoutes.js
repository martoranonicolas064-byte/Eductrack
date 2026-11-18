const express = require('express');
const { getDashboard } = require('../controllers/alumnoController');
const { autenticarToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Ruta protegida con JWT para obtener el panel completo del estudiante
router.get('/dashboard', autenticarToken, getDashboard);

module.exports = router;

