import { AuthService } from "./services/AuthService";
import { EmailService } from "./services/EmailService";
import { EmailTemplateFactory } from "./templates/EmailTemplateFactory";
import { UserRepository } from "./repositories/UserRepository";
import { RefreshTokenRepository } from "./repositories/RefreshTokenRepository";

export class Container {
  private static instance: Container;
  private _authService?: AuthService;
  private _emailService?: EmailService;

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
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
      const userRepo = new UserRepository();
      const refreshTokenRepo = new RefreshTokenRepository();

      this._authService = new AuthService(
        userRepo,
        refreshTokenRepo,
        this.emailService,
        process.env.JWT_ACCESS_SECRET!,
        process.env.JWT_REFRESH_SECRET!,
        process.env.ACCESS_TOKEN_EXPIRY || "15m",
        process.env.REFRESH_TOKEN_EXPIRY || "7d",
      );
    }
    return this._authService;
  }
}

export const container = Container.getInstance();
