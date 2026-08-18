import { AuthService } from "./services/AuthService";
import { FuneralHomeService } from "./services/FuneralHomeService";
import { EmailService } from "./services/EmailService";
import { EmailTemplateFactory } from "./templates/EmailTemplateFactory";
import { UserRepository } from "./repositories/UserRepository";
import { RefreshTokenRepository } from "./repositories/RefreshTokenRepository";
import { FuneralHomeRepository } from "./repositories/FuneralHomeRepository";
import { StaffRepository } from "./repositories/StaffRepository";
import { PrismaClient } from "../generated/prisma/client";

export class Container {
  private static instance: Container;
  private _authService?: AuthService;
  private _funeralHomeService?: FuneralHomeService;
  private _emailService?: EmailService;

  private userRepo: UserRepository;
  private refreshTokenRepo: RefreshTokenRepository;
  private funeralHomeRepo: FuneralHomeRepository;
  private staffRepo: StaffRepository;

  constructor(prisma: PrismaClient) {
    this.userRepo = new UserRepository(prisma);
    this.refreshTokenRepo = new RefreshTokenRepository(prisma);
    this.funeralHomeRepo = new FuneralHomeRepository(prisma);
    this.staffRepo = new StaffRepository(prisma);
  }

  static getInstance(prisma: PrismaClient): Container {
    if (!Container.instance) {
      Container.instance = new Container(prisma);
    }
    return Container.instance;
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
}

export const createContainer = (prisma: PrismaClient): Container => {
  return new Container(prisma);
};
