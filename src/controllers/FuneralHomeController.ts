import { Request, Response } from "express";
import { FuneralHomeService } from "../services/FuneralHomeService";
import { AuthRequest } from "../types";
import {
  registerFuneralHomeSchema,
  updateBrandingSchema,
  inviteStaffSchema,
  RegisterFuneralHomeInput,
} from "../schemas/funeralHome.schema";
import { validate } from "../middleware/validation";

export class FuneralHomeController {
  constructor(private funeralHomeService: FuneralHomeService) {}

  register = [
    validate(registerFuneralHomeSchema),
    async (req: Request<{}, {}, RegisterFuneralHomeInput>, res: Response) => {
      try {
        const { name, email, password, firstName, lastName } = req.body;
        const result = await this.funeralHomeService.register(
          name,
          email,
          password,
          firstName,
          lastName,
        );

        res.status(201).json({
          success: true,
          message:
            "Registration successful. Please check your email to verify your account.",
          data: result,
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

  getFuneralHome = [
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const funeralHome = await this.funeralHomeService.getFuneralHome(
          authReq.funeralHomeId,
        );

        res.json({
          success: true,
          data: funeralHome,
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

  updateBranding = [
    validate(updateBrandingSchema),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const result = await this.funeralHomeService.updateBranding(
          authReq.funeralHomeId,
          req.body,
        );

        res.json({
          success: true,
          message: "Branding updated successfully.",
          data: result,
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

  getStaff = [
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const staff = await this.funeralHomeService.getStaff(
          authReq.funeralHomeId,
        );

        res.json({
          success: true,
          data: staff,
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

  inviteStaff = [
    validate(inviteStaffSchema),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const { email, role } = req.body;
        const result = await this.funeralHomeService.inviteStaff(
          authReq.funeralHomeId,
          email,
          role,
        );

        res.json({
          success: true,
          message: `Invitation sent to ${email}`,
          data: result,
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
