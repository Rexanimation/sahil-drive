const express = require('express');
const authControllers = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/register", authControllers.registerUser);
router.post("/login", authControllers.loginUser);
router.post("/google-login", authControllers.googleLoginUser);
router.get("/me", authMiddleware.authUser, authControllers.getMe);
router.post("/logout", authControllers.logoutUser);
router.post("/link-mega", authMiddleware.authUser, authControllers.linkMega);
router.post("/unlink-mega", authMiddleware.authUser, authControllers.unlinkMega);

module.exports = router;