import { Request, Response } from "express";
import { container } from "../container";
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

const funeralHomeService = container.funeralHomeService;

export const FuneralHomeController = {
  register: [
    validate(registerFuneralHomeSchema),
    async (req: Request<{}, {}, RegisterFuneralHomeInput>, res: Response) => {
      try {
        const { name, email, password, firstName, lastName } = req.body;
        const result = await funeralHomeService.register(
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
        res.status(400).json({ success: false, error: error.message });
      }
    },
  ],

  getFuneralHome: [
    authenticate,
    async (req: Request, res: Response) => {
      try {
        const funeralHomeId = (req as any).funeralHomeId;
        const funeralHome =
          await funeralHomeService.getFuneralHome(funeralHomeId);

        res.json({
          success: true,
          data: funeralHome,
        });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
      }
    },
  ],

  updateBranding: [
    authenticate,
    validate(updateBrandingSchema),
    async (req: Request<{}, {}, UpdateBrandingInput>, res: Response) => {
      try {
        const funeralHomeId = (req as any).funeralHomeId;
        const result = await funeralHomeService.updateBranding(
          funeralHomeId,
          req.body,
        );

        res.json({
          success: true,
          message: "Branding updated successfully.",
          data: result,
        });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
      }
    },
  ],

  getStaff: [
    authenticate,
    async (req: Request, res: Response) => {
      try {
        const funeralHomeId = (req as any).funeralHomeId;
        const staff = await funeralHomeService.getStaff(funeralHomeId);

        res.json({
          success: true,
          data: staff,
        });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
      }
    },
  ],

  inviteStaff: [
    authenticate,
    validate(inviteStaffSchema),
    async (req: Request<{}, {}, InviteStaffInput>, res: Response) => {
      try {
        const funeralHomeId = (req as any).funeralHomeId;
        const { email, role } = req.body;
        const result = await funeralHomeService.inviteStaff(
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
        res.status(400).json({ success: false, error: error.message });
      }
    },
  ],
};
