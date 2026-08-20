import { Request, Response } from "express";
import { DashboardService } from "../services/DashboardService";
import { AuthRequest } from "../middleware/auth.middleware";

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  getOverview = [
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const overview = await this.dashboardService.getOverview(
          authReq.funeralHomeId,
        );

        res.json({
          success: true,
          data: overview,
        });
      } catch (error: any) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  getRevenueReport = [
    async (
      req: Request<{}, {}, {}, { period?: "monthly" | "yearly" }>,
      res: Response,
    ) => {
      try {
        const authReq = req as AuthRequest;
        const period = req.query.period || "monthly";
        const report = await this.dashboardService.getRevenueReport(
          authReq.funeralHomeId,
          period,
        );

        res.json({
          success: true,
          data: report,
        });
      } catch (error: any) {
        const statusCode = error.statusCode || 400;
        res.status(statusCode).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];
}
