import { Router } from "express";
import { Container } from "../container";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middleware/auth.middleware";

export default function authRoutes(container: Container): Router {
  const router = Router();

  const authController = new AuthController(container.authService);

  router.post("/register", authController.register);
  router.post("/login", authController.login);
  router.post("/verify-email", authController.verifyEmail);
  router.post("/forgot-password", authController.forgotPassword);
  router.post("/reset-password", authController.resetPassword);
  router.post("/refresh", authController.refresh);
  router.post("/logout", authenticate, authController.logout);

  return router;
}
