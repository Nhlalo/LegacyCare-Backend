import { Router } from "express";
import { Container } from "../container";
import { DashboardController } from "../controllers/DashboardController";
import { requireLimited, requireManager } from "../middleware/role.middleware";

export default function dashboardRoutes(container: Container): Router {
  const router = Router();

  const dashboardController = new DashboardController(
    container.dashboardService,
  );
  const authenticate = container.authMiddleware;

  router.get(
    "/overview",
    authenticate,
    requireLimited,
    ...dashboardController.getOverview,
  );
  router.get(
    "/revenue",
    authenticate,
    requireManager,
    ...dashboardController.getRevenueReport,
  );

  return router;
}
