import { AuthService } from "./services/AuthService";
import { FuneralHomeService } from "./services/FuneralHomeService";
import { PaymentService } from "./services/PaymentService";
import { CaseService } from "./services/CaseService";
import { EmailService } from "./services/EmailService";
import { DashboardService } from "./services/DashboardService";
import { RefreshTokenRepository } from "./repositories/RefreshTokenRepository";
import { FuneralHomeRepository } from "./repositories/FuneralHomeRepository";
import { StaffRepository } from "./repositories/StaffRepository";
import { CaseRepository } from "./repositories/CaseRepository";
import { UserRepository } from "./repositories/UserRepository";
import { PaymentRepository } from "./repositories/PaymentRepository";
import { EmailTemplateFactory } from "./templates/EmailTemplateFactory";
import { FamilyLinkTemplate } from "./templates/FamilyLinkTemplate";
import { DefaultLinkGenerator } from "./lib/DefaultLinkGenerator";
import { PayFastGateway } from "./lib/PayFastGateway";
import { PayFastWebhookHandler } from "./lib/PayFastWebhookHandler";
import { IPaymentGateway } from "./interfaces/IPaymentGateway";
import { IWebhookHandler } from "./interfaces/IWebhookHandler";

import { PrismaClient } from "../generated/prisma/client";
import { RequestHandler } from "express";
import { createAuthMiddleware } from "./middleware/auth.middleware";

export class Container {
  private static instance: Container;
  private _authService?: AuthService;
  private _funeralHomeService?: FuneralHomeService;
  private _caseService?: CaseService;
  private _emailService?: EmailService;
  private _paymentService?: PaymentService;
  private _dashboardService?: DashboardService;
  private _paymentGateway?: IPaymentGateway;
  private _webhookHandler?: IWebhookHandler;
  private _authMiddleware?: RequestHandler;

  constructor(
    private userRepo: UserRepository,
    private refreshTokenRepo: RefreshTokenRepository,
    private funeralHomeRepo: FuneralHomeRepository,
    private staffRepo: StaffRepository,
    private caseRepo: CaseRepository,
    private paymentRepo: PaymentRepository,
  ) {}

  static getInstance(
    userRepo: UserRepository,
    refreshTokenRepo: RefreshTokenRepository,
    funeralHomeRepo: FuneralHomeRepository,
    staffRepo: StaffRepository,
    caseRepo: CaseRepository,
    paymentRepo: PaymentRepository,
  ): Container {
    if (!Container.instance) {
      Container.instance = new Container(
        userRepo,
        refreshTokenRepo,
        funeralHomeRepo,
        staffRepo,
        caseRepo,
        paymentRepo,
      );
    }
    return Container.instance;
  }

  get authMiddleware(): RequestHandler {
    if (!this._authMiddleware) {
      this._authMiddleware = createAuthMiddleware(this.authService);
    }
    return this._authMiddleware;
  }

  get emailService(): EmailService {
    if (!this._emailService) {
      const frontendUrl = process.env.FRONTEND_URL!;
      const brevoApiKey = process.env.BREVO_API_KEY!;
      const emailFrom = process.env.EMAIL_FROM!;

      const templateFactory = new EmailTemplateFactory(frontendUrl);
      this._emailService = new EmailService(
        brevoApiKey,
        emailFrom,
        templateFactory,
      );
    }
    return this._emailService;
  }

  get authService(): AuthService {
    if (!this._authService) {
      this._authService = new AuthService(
        this.userRepo,
        this.refreshTokenRepo,
        this.staffRepo,
        this.emailService,
        process.env.JWT_ACCESS_SECRET!,
        process.env.JWT_REFRESH_SECRET!,
        process.env.ACCESS_TOKEN_EXPIRY || "15m",
        process.env.REFRESH_TOKEN_EXPIRY || "7d",
      );
    }
    return this._authService;
  }

  get funeralHomeService(): FuneralHomeService {
    if (!this._funeralHomeService) {
      this._funeralHomeService = new FuneralHomeService(
        this.userRepo,
        this.funeralHomeRepo,
        this.staffRepo,
        this.emailService,
      );
    }
    return this._funeralHomeService;
  }

  get caseService(): CaseService {
    if (!this._caseService) {
      const baseUrl = process.env.BASE_URL || "yourplatform.com";
      const expiryDays = parseInt(process.env.LINK_EXPIRY_DAYS || "30");

      const linkGenerator = new DefaultLinkGenerator(baseUrl, expiryDays);
      const emailTemplate = new FamilyLinkTemplate();

      this._caseService = new CaseService(
        this.caseRepo,
        this.funeralHomeRepo,
        this.emailService,
        linkGenerator,
        emailTemplate,
      );
    }
    return this._caseService;
  }

  get paymentGateway(): IPaymentGateway {
    if (!this._paymentGateway) {
      this._paymentGateway = new PayFastGateway({
        merchantId: process.env.PAYFAST_MERCHANT_ID!,
        merchantKey: process.env.PAYFAST_MERCHANT_KEY!,
        passphrase: process.env.PAYFAST_PASSPHRASE,
        sandbox: process.env.PAYFAST_SANDBOX === "true",
      });
    }
    return this._paymentGateway;
  }

  get webhookHandler(): IWebhookHandler {
    if (!this._webhookHandler) {
      this._webhookHandler = new PayFastWebhookHandler(
        this.paymentRepo,
        this.caseRepo,
      );
    }
    return this._webhookHandler;
  }

  get paymentService(): PaymentService {
    if (!this._paymentService) {
      this._paymentService = new PaymentService(
        this.paymentRepo,
        this.caseRepo,
        this.paymentGateway,
        this.webhookHandler,
      );
    }
    return this._paymentService;
  }

  get dashboardService(): DashboardService {
    if (!this._dashboardService) {
      this._dashboardService = new DashboardService();
    }
    return this._dashboardService;
  }
}

export const createContainer = (prisma: PrismaClient): Container => {
  const userRepo = new UserRepository(prisma);
  const refreshTokenRepo = new RefreshTokenRepository(prisma);
  const funeralHomeRepo = new FuneralHomeRepository(prisma);
  const staffRepo = new StaffRepository(prisma);
  const caseRepo = new CaseRepository(prisma);
  const paymentRepo = new PaymentRepository(prisma);

  return new Container(
    userRepo,
    refreshTokenRepo,
    funeralHomeRepo,
    staffRepo,
    caseRepo,
    paymentRepo,
  );
};
