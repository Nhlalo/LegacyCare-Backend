import { Request, Response } from "express";
import { CaseService } from "../services/CaseService";
import {
  createAtNeedCaseSchema,
  createPreNeedCaseSchema,
  updateCaseSchema,
  generateFamilyLinkSchema,
  CreateAtNeedCaseInput,
  CreatePreNeedCaseInput,
  GenerateFamilyLinkInput,
} from "../schemas/case.schema";
import { validate } from "../middleware/validation";
import { AuthRequest } from "../middleware/auth.middleware";

export class CaseController {
  constructor(private caseService: CaseService) {}

  createAtNeed = [
    validate(createAtNeedCaseSchema),
    async (req: Request<{}, {}, CreateAtNeedCaseInput>, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const result = await this.caseService.createAtNeedCase(
          authReq.funeralHomeId,
          req.body,
        );

        res.status(201).json({
          success: true,
          message: "At-need case created successfully.",
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

  createPreNeed = [
    validate(createPreNeedCaseSchema),
    async (req: Request<{}, {}, CreatePreNeedCaseInput>, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const result = await this.caseService.createPreNeedCase(
          authReq.funeralHomeId,
          req.body,
        );

        res.status(201).json({
          success: true,
          message: "Pre-need case created successfully.",
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

  getCases = [
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const cases = await this.caseService.getCases(authReq.funeralHomeId);

        res.json({
          success: true,
          data: cases,
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

  getCase = [
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const authReq = req as AuthRequest;

        const caseData = await this.caseService.getCase(id as string);

        if (!caseData) {
          return res.status(404).json({
            success: false,
            error: "Case not found",
          });
        }

        if (caseData.funeralHomeId !== authReq.funeralHomeId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        res.json({
          success: true,
          data: caseData,
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

  updateCase = [
    validate(updateCaseSchema),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const authReq = req as AuthRequest;

        const caseData = await this.caseService.getCase(id as string);
        if (!caseData) {
          return res.status(404).json({
            success: false,
            error: "Case not found",
          });
        }

        if (caseData.funeralHomeId !== authReq.funeralHomeId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        const result = await this.caseService.updateCase(
          id as string,
          req.body,
        );

        res.json({
          success: true,
          message: "Case updated successfully.",
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

  generateLink = [
    validate(generateFamilyLinkSchema),
    async (req: Request<{}, {}, GenerateFamilyLinkInput>, res: Response) => {
      try {
        const { caseId } = req.body;
        const authReq = req as AuthRequest;

        const caseData = await this.caseService.getCase(caseId);
        if (!caseData) {
          return res.status(404).json({
            success: false,
            error: "Case not found",
          });
        }

        if (caseData.funeralHomeId !== authReq.funeralHomeId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        const result = await this.caseService.generateFamilyLink(caseId);

        res.json({
          success: true,
          message: "Family link generated successfully.",
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

  sendFamilyLink = [
    async (
      req: Request<{}, {}, { caseId: string; email: string }>,
      res: Response,
    ) => {
      try {
        const { caseId, email } = req.body;
        const authReq = req as AuthRequest;

        if (!email) {
          return res.status(400).json({
            success: false,
            error: "Email is required",
          });
        }

        const caseData = await this.caseService.getCase(caseId);
        if (!caseData) {
          return res.status(404).json({
            success: false,
            error: "Case not found",
          });
        }

        if (caseData.funeralHomeId !== authReq.funeralHomeId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        await this.caseService.sendFamilyLink(caseId, email);

        res.json({
          success: true,
          message: `Link sent to ${email} successfully.`,
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

  closeCase = [
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const authReq = req as AuthRequest;

        const caseData = await this.caseService.getCase(id as string);
        if (!caseData) {
          return res.status(404).json({
            success: false,
            error: "Case not found",
          });
        }

        if (caseData.funeralHomeId !== authReq.funeralHomeId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        await this.caseService.closeCase(id as string);

        res.json({
          success: true,
          message: "Case closed successfully.",
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

  // Public endpoint - no authentication required
  getCaseByToken = async (req: Request<{ token: string }>, res: Response) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Token is required",
        });
      }

      const caseData = await this.caseService.getCaseByAccessToken(token);

      if (!caseData) {
        return res.status(404).json({
          success: false,
          error: "Case not found or link expired",
        });
      }

      res.json({
        success: true,
        data: caseData,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        error: error.message,
      });
    }
  };
}
