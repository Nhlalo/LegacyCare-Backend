import { Router } from "express";
import { Container } from "../container";
import { DashboardController } from "../controllers/DashboardController";

export default function dashboardRoutes(container: Container): Router {
  const router = Router();

  const dashboardController = new DashboardController(
    container.dashboardService,
  );
  const authenticate = container.authMiddleware;

  router.get("/overview", authenticate, ...dashboardController.getOverview);
  router.get("/revenue", authenticate, ...dashboardController.getRevenueReport);

  return router;
}
