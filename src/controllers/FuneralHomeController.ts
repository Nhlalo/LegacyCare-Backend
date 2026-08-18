import { Request, Response } from "express";
import { FuneralHomeService } from "../services/FuneralHomeService";
import {
  registerFuneralHomeSchema,
  updateBrandingSchema,
  inviteStaffSchema,
  RegisterFuneralHomeInput,
  UpdateBrandingInput,
  InviteStaffInput,
} from "../schemas/funeralHome.schema";
import { validate } from "../middleware/validation";
import { authenticate } from "../middleware/auth.middleware";

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
    authenticate,
    async (req: Request, res: Response) => {
      try {
        const funeralHomeId = (req as any).funeralHomeId;
        const funeralHome =
          await this.funeralHomeService.getFuneralHome(funeralHomeId);

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
    authenticate,
    validate(updateBrandingSchema),
    async (req: Request<{}, {}, UpdateBrandingInput>, res: Response) => {
      try {
        const funeralHomeId = (req as any).funeralHomeId;
        const result = await this.funeralHomeService.updateBranding(
          funeralHomeId,
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
    authenticate,
    async (req: Request, res: Response) => {
      try {
        const funeralHomeId = (req as any).funeralHomeId;
        const staff = await this.funeralHomeService.getStaff(funeralHomeId);

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
    authenticate,
    validate(inviteStaffSchema),
    async (req: Request<{}, {}, InviteStaffInput>, res: Response) => {
      try {
        const funeralHomeId = (req as any).funeralHomeId;
        const { email, role } = req.body;
        const result = await this.funeralHomeService.inviteStaff(
          funeralHomeId,
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
