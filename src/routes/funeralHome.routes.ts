import { Router } from "express";
import { Container } from "../container";
import { FuneralHomeController } from "../controllers/FuneralHomeController";
import { requireManager, requireStaff } from "../middleware/role.middleware";

export default function funeralHomeRoutes(container: Container): Router {
  const router = Router();

  const funeralHomeController = new FuneralHomeController(
    container.funeralHomeService,
  );
  const authenticate = container.authMiddleware;

  router.post("/register", requireStaff, ...funeralHomeController.register);
  router.get("/", authenticate, ...funeralHomeController.getFuneralHome);
  router.put(
    "/branding",
    authenticate,
    authenticate,
    requireManager,
    ...funeralHomeController.updateBranding,
  );
  router.get(
    "/staff",
    authenticate,
    requireManager,
    authenticate,
    ...funeralHomeController.getStaff,
  );
  router.post(
    "/staff/invite",
    authenticate,
    requireManager,
    authenticate,
    ...funeralHomeController.inviteStaff,
  );

  return router;
}
