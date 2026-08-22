import { Router } from "express";
import { Container } from "../container";
import { PaymentController } from "../controllers/PaymentController";
import { requireStaff, requireLimited } from "../middleware/role.middleware";

export default function paymentRoutes(container: Container): Router {
  const router = Router();

  const paymentController = new PaymentController(container.paymentService);
  const authenticate = container.authMiddleware;

  router.post(
    "/create",
    authenticate,
    requireStaff,
    ...paymentController.createOnlinePayment,
  );
  router.post(
    "/manual",
    authenticate,
    requireStaff,
    ...paymentController.recordManualPayment,
  );
  router.get(
    "/case/:caseId",
    authenticate,
    requireLimited,
    ...paymentController.getPayments,
  );
  router.get(
    "/case/:caseId/status",
    authenticate,
    requireLimited,
    ...paymentController.getPaymentStatus,
  );

  // Public webhook route
  router.post("/webhook/payfast", paymentController.handleWebhook);

  return router;
}
