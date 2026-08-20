// backend/src/routes/case.routes.ts
import { Router } from "express";
import { Container } from "../container";
import { CaseController } from "../controllers/CaseController";

export default function caseRoutes(container: Container): Router {
  const router = Router();

  const caseController = new CaseController(container.caseService);
  const authenticate = container.authMiddleware;

  router.post("/at-need", authenticate, ...caseController.createAtNeed);
  router.post("/pre-need", authenticate, ...caseController.createPreNeed);
  router.get("/", authenticate, ...caseController.getCases);
  router.get("/:id", authenticate, ...caseController.getCase);
  router.put("/:id", authenticate, ...caseController.updateCase);
  router.post("/generate-link", authenticate, ...caseController.generateLink);
  router.post("/send-link", authenticate, ...caseController.sendFamilyLink);
  router.post("/:id/close", authenticate, ...caseController.closeCase);

  // Public route (no authentication required)
  router.get("/public/:token", caseController.getCaseByToken);

  return router;
}
