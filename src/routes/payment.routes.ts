// backend/src/routes/payment.routes.ts
import { Router } from "express";
import { Container } from "../container";
import { PaymentController } from "../controllers/PaymentController";

export default function paymentRoutes(container: Container): Router {
  const router = Router();

  const paymentController = new PaymentController(container.paymentService);
  const authenticate = container.authMiddleware;

  router.post(
    "/create",
    authenticate,
    ...paymentController.createOnlinePayment,
  );
  router.post(
    "/manual",
    authenticate,
    ...paymentController.recordManualPayment,
  );
  router.get("/case/:caseId", authenticate, ...paymentController.getPayments);
  router.get(
    "/case/:caseId/status",
    authenticate,
    ...paymentController.getPaymentStatus,
  );

  // Public webhook route
  router.post("/webhook/payfast", paymentController.handleWebhook);

  return router;
}
