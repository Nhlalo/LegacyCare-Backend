import { Router } from "express";
import { Container } from "../container";
import { StaffController } from "../controllers/StaffController";
import { requireManager, requireOwner } from "../middleware/role.middleware";

export default function staffRoutes(container: Container): Router {
  const router = Router();

  const staffController = new StaffController(container.staffService);
  const authenticate = container.authMiddleware;

  router.post(
    "/list",
    authenticate,
    requireManager,
    ...staffController.getStaff,
  );

  router.post(
    "/invite",
    authenticate,
    requireManager,

    ...staffController.inviteStaff,
  );

  router.post(
    "/:staffId/role",
    authenticate,
    requireOwner,
    ...staffController.updateRole,
  );

  router.post(
    "/:staffId/remove",
    authenticate,
    requireOwner,
    ...staffController.removeStaff,
  );

  router.post(
    "/:staffId/reactivate",
    authenticate,
    requireOwner,
    ...staffController.reactivateStaff,
  );

  // Accept invitation (public)
  router.post("/accept", staffController.acceptInvitation);
  return router;
}
