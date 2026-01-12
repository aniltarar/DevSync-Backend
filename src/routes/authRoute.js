const express = require('express');
const router = express.Router();
const { register, login, tokenRefresh, logout } = require('@/controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/token-refresh', tokenRefresh);
router.post('/logout', logout);

module.exports = router;