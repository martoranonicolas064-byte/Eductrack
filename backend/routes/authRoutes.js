const express = require('express');
const { login } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);

router.post('/logout', (req, res) => {
    res.setHeader('Clear-Site-Data', '"cache", "storage"');
    res.json({ ok: true, mensaje: 'Sesión cerrada correctamente y caché depurada' });
});

module.exports = router;