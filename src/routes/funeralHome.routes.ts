import { Router } from "express";
import { Container } from "../container";
import { FuneralHomeController } from "../controllers/FuneralHomeController";
import { authenticate } from "../middleware/auth.middleware";

export default function funeralHomeRoutes(container: Container): Router {
  const router = Router();

  const funeralHomeController = new FuneralHomeController(
    container.funeralHomeService,
  );

  router.post("/register", funeralHomeController.register);
  router.get("/", authenticate, funeralHomeController.getFuneralHome);
  router.put("/branding", authenticate, funeralHomeController.updateBranding);
  router.get("/staff", authenticate, funeralHomeController.getStaff);
  router.post("/staff/invite", authenticate, funeralHomeController.inviteStaff);

  return router;
}
