import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { createContainer } from "../container";
import { AuthRequest } from "../types";

export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthRequest).userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      // Get staff record with role
      const container = createContainer(prisma);
      const staffRepo = container.staffService;
      const staff = await staffRepo.findByUserId(userId);

      if (!staff) {
        return res.status(403).json({
          success: false,
          error: "No staff record found",
        });
      }

      if (!allowedRoles.includes(staff.role)) {
        return res.status(403).json({
          success: false,
          error: "Insufficient permissions",
        });
      }

      next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };
};

export const requireOwner = requireRole(["OWNER"]);
export const requireManager = requireRole(["OWNER", "MANAGER"]);
export const requireStaff = requireRole(["OWNER", "MANAGER", "STAFF"]);
export const requireLimited = requireRole([
  "OWNER",
  "MANAGER",
  "STAFF",
  "LIMITED",
]);
