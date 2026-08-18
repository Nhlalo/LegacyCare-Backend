import { Router } from "express";
import { FuneralHomeController } from "../controllers/FuneralHomeController";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", FuneralHomeController.register);
router.get("/", authenticate, FuneralHomeController.getFuneralHome);
router.put("/branding", authenticate, FuneralHomeController.updateBranding);
router.get("/staff", authenticate, FuneralHomeController.getStaff);
router.post("/staff/invite", authenticate, FuneralHomeController.inviteStaff);

export default router;
