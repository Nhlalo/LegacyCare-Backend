import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthService } from "../services/AuthService";
import logger from "../lib/logger";
import { AuthRequest } from "../types";

export const createAuthMiddleware = (authService: AuthService) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          error: "No token provided",
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
        userId: string;
      };

      const userData = await authService.getAuthenticatedUser(decoded.userId);

      if (!userData.user) {
        return res.status(401).json({
          success: false,
          error: "User not found",
        });
      }

      if (!userData.user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          error: "Please verify your email before accessing this resource.",
        });
      }

      if (!userData.staff) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this resource.",
        });
      }

      if (!userData.funeralHomeId) {
        return res.status(403).json({
          success: false,
          error: "You are not associated with a funeral home.",
        });
      }

      const authReq = req as AuthRequest;
      authReq.userId = userData.user.id;
      authReq.funeralHomeId = userData.funeralHomeId;
      authReq.staffRole = userData.staff.role;
      authReq.userEmail = userData.user.email;
      authReq.userFirstName = userData.user.firstName;
      authReq.userLastName = userData.user.lastName;

      logger.debug(
        {
          userId: authReq.userId,
          funeralHomeId: authReq.funeralHomeId,
          role: authReq.staffRole,
          email: authReq.userEmail,
        },
        "Authenticated request",
      );

      next();
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token expired",
          code: "TOKEN_EXPIRED",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          error: "Invalid token",
        });
      }

      logger.error({ error: error.message }, "Authentication error");
      return res.status(401).json({
        success: false,
        error: "Authentication failed",
      });
    }
  };
};
