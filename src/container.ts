import { AuthService } from "./services/AuthService";
import { FuneralHomeService } from "./services/FuneralHomeService";
import { CaseService } from "./services/CaseService";
import { EmailService } from "./services/EmailService";
import { EmailTemplateFactory } from "./templates/EmailTemplateFactory";
import { FamilyLinkTemplate } from "./templates/FamilyLinkTemplate";
import { DefaultLinkGenerator } from "./lib/DefaultLinkGenerator";
import { UserRepository } from "./repositories/UserRepository";
import { RefreshTokenRepository } from "./repositories/RefreshTokenRepository";
import { FuneralHomeRepository } from "./repositories/FuneralHomeRepository";
import { StaffRepository } from "./repositories/StaffRepository";
import { CaseRepository } from "./repositories/CaseRepository";
import { PrismaClient } from "../generated/prisma/client";
import { RequestHandler } from "express";
import { createAuthMiddleware } from "./middleware/auth.middleware";

export class Container {
  private static instance: Container;
  private _authService?: AuthService;
  private _funeralHomeService?: FuneralHomeService;
  private _caseService?: CaseService;
  private _emailService?: EmailService;
  private _authMiddleware?: RequestHandler;

  constructor(
    private userRepo: UserRepository,
    private refreshTokenRepo: RefreshTokenRepository,
    private funeralHomeRepo: FuneralHomeRepository,
    private staffRepo: StaffRepository,
    private caseRepo: CaseRepository,
  ) {}

  static getInstance(
    userRepo: UserRepository,
    refreshTokenRepo: RefreshTokenRepository,
    funeralHomeRepo: FuneralHomeRepository,
    staffRepo: StaffRepository,
    caseRepo: CaseRepository,
  ): Container {
    if (!Container.instance) {
      Container.instance = new Container(
        userRepo,
        refreshTokenRepo,
        funeralHomeRepo,
        staffRepo,
        caseRepo,
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
}

export const createContainer = (prisma: PrismaClient): Container => {
  const userRepo = new UserRepository(prisma);
  const refreshTokenRepo = new RefreshTokenRepository(prisma);
  const funeralHomeRepo = new FuneralHomeRepository(prisma);
  const staffRepo = new StaffRepository(prisma);
  const caseRepo = new CaseRepository(prisma);

  return new Container(
    userRepo,
    refreshTokenRepo,
    funeralHomeRepo,
    staffRepo,
    caseRepo,
  );
};
