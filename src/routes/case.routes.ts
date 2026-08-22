import { Router } from "express";
import { Container } from "../container";
import { CaseController } from "../controllers/CaseController";
import { requireStaff, requireLimited } from "../middleware/role.middleware";

export default function caseRoutes(container: Container): Router {
  const router = Router();

  const caseController = new CaseController(container.caseService);
  const authenticate = container.authMiddleware;

  router.post(
    "/at-need",
    authenticate,
    requireStaff,
    ...caseController.createAtNeed,
  );
  router.post(
    "/pre-need",
    authenticate,
    requireStaff,
    ...caseController.createPreNeed,
  );
  router.get("/", authenticate, requireLimited, ...caseController.getCases);
  router.get("/:id", authenticate, requireLimited, ...caseController.getCase);
  router.put("/:id", authenticate, requireStaff, ...caseController.updateCase);
  router.post(
    "/generate-link",
    authenticate,
    requireStaff,
    ...caseController.generateLink,
  );
  router.post(
    "/send-link",
    authenticate,
    requireStaff,
    ...caseController.sendFamilyLink,
  );
  router.post(
    "/:id/close",
    authenticate,
    requireStaff,
    ...caseController.closeCase,
  );

  // Public route (no authentication required)
  router.get("/public/:token", caseController.getCaseByToken);

  return router;
}
