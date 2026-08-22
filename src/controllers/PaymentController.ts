import { Request, Response } from "express";
import { PaymentService } from "../services/PaymentService";
import {
  createPaymentSchema,
  manualPaymentSchema,
  CreatePaymentInput,
  ManualPaymentInput,
} from "../schemas/payment.schema";
import { validate } from "../middleware/validation";
import logger from "../lib/logger";
import { AuthRequest } from "../types";

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  createOnlinePayment = [
    validate(createPaymentSchema),
    async (req: Request<{}, {}, CreatePaymentInput>, res: Response) => {
      try {
        const { caseId, amount } = req.body;
        const authReq = req as AuthRequest;

        const caseData = await this.paymentService.getCaseById(caseId);
        if (caseData?.funeralHomeId !== authReq.funeralHomeId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        const result = await this.paymentService.createOnlinePayment(
          caseId,
          amount,
          `${process.env.FRONTEND_URL}/payment/success`,
          `${process.env.FRONTEND_URL}/payment/cancel`,
        );

        res.json({
          success: true,
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

  recordManualPayment = [
    validate(manualPaymentSchema),
    async (req: Request<{}, {}, ManualPaymentInput>, res: Response) => {
      try {
        const { caseId, amount, method, reference } = req.body;
        const authReq = req as AuthRequest;

        const caseData = await this.paymentService.getCaseById(caseId);
        if (caseData?.funeralHomeId !== authReq.funeralHomeId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        const result = await this.paymentService.recordManualPayment(
          caseId,
          amount,
          method,
          reference,
        );

        res.json({
          success: true,
          message: "Payment recorded successfully.",
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

  getPayments = [
    async (req: Request, res: Response) => {
      try {
        const { caseId } = req.params;
        const authReq = req as AuthRequest;

        const caseData = await this.paymentService.getCaseById(
          caseId as string,
        );
        if (caseData?.funeralHomeId !== authReq.funeralHomeId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        const payments = await this.paymentService.getPayments(
          caseId as string,
        );

        res.json({
          success: true,
          data: payments,
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

  getPaymentStatus = [
    async (req: Request, res: Response) => {
      try {
        const { caseId } = req.params;
        const authReq = req as AuthRequest;

        const caseData = await this.paymentService.getCaseById(
          caseId as string,
        );
        if (caseData?.funeralHomeId !== authReq.funeralHomeId) {
          return res.status(403).json({
            success: false,
            error: "Unauthorized",
          });
        }

        const status = await this.paymentService.getPaymentStatus(
          caseId as string,
        );

        res.json({
          success: true,
          data: status,
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

  // Public webhook endpoint (no authentication)
  handleWebhook = async (req: Request, res: Response) => {
    try {
      await this.paymentService.handleWebhook(req.body);
      res.send("OK");
    } catch (error: any) {
      logger.error({ error: error.message }, "Webhook processing failed");
      res.status(500).send("Internal Server Error");
    }
  };
}
