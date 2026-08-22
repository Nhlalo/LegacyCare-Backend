import { Request, Response } from "express";
import { StaffService } from "../services/StaffService";
import {
  inviteStaffSchema,
  updateRoleSchema,
  acceptInvitationSchema,
  InviteStaffInput,
  UpdateRoleInput,
  AcceptInvitationInput,
} from "../schemas/staff.schema";
import { validate } from "../middleware/validation";
import { AuthRequest } from "../types";

export class StaffController {
  constructor(private staffService: StaffService) {}

  getStaff = [
    async (
      req: Request<{}, {}, { includeInactive?: boolean }>,
      res: Response,
    ) => {
      try {
        const authReq = req as AuthRequest;
        const includeInactive = req.body.includeInactive || false;

        const staff = await this.staffService.getStaff(
          authReq.funeralHomeId,
          includeInactive,
        );

        res.json({
          success: true,
          data: staff,
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  inviteStaff = [
    validate(inviteStaffSchema),
    async (req: Request<{}, {}, InviteStaffInput>, res: Response) => {
      try {
        const authReq = req as AuthRequest;

        const { email, role } = req.body;

        const result = await this.staffService.inviteStaff(
          authReq.funeralHomeId,
          email,
          role,
          authReq.userId,
        );

        res.json({
          success: true,
          message: `Invitation sent to ${email}`,
          data: result,
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  acceptInvitation = [
    validate(acceptInvitationSchema),
    async (req: Request<{}, {}, AcceptInvitationInput>, res: Response) => {
      try {
        const { token, password } = req.body;

        const result = await this.staffService.acceptInvitation(
          token,
          password,
        );

        res.json({
          success: true,
          message: "Invitation accepted successfully.",
          data: result,
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  updateRole = [
    validate(updateRoleSchema),
    async (
      req: Request<{ staffId: string }, {}, UpdateRoleInput>,
      res: Response,
    ) => {
      try {
        const { staffId } = req.params;
        const { role } = req.body;

        const result = await this.staffService.updateRole(staffId, role);

        res.json({
          success: true,
          message: "Role updated successfully.",
          data: result,
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  removeStaff = [
    async (req: Request, res: Response) => {
      try {
        const { staffId } = req.params;
        const authReq = req as AuthRequest;

        const result = await this.staffService.removeStaff(
          staffId as string,
          authReq.userId,
        );

        res.json({
          success: true,
          message: "Staff removed successfully.",
          data: result,
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];

  reactivateStaff = [
    async (req: Request<{ staffId: string }>, res: Response) => {
      try {
        const { staffId } = req.params;

        const result = await this.staffService.reactivateStaff(staffId);

        res.json({
          success: true,
          message: "Staff reactivated successfully.",
          data: result,
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    },
  ];
}
