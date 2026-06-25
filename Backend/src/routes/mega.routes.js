const express = require('express');
const router = express.Router();
const megaController = require('../controllers/mega.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/connect', authMiddleware.authUser, megaController.connectMega);
router.post('/disconnect', authMiddleware.authUser, megaController.disconnectMega);
router.get('/status', authMiddleware.authUser, megaController.getMegaStatus);

module.exports = router;
