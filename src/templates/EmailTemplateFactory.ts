import { IEmailTemplate } from "../interfaces/IEmailTemplate";
import { VerificationEmailTemplate } from "./email/VerificationEmailTemplate";
import { PasswordResetEmailTemplate } from "./email/PasswordResetEmailTemplate";

export enum EmailTemplateType {
  VERIFICATION = "verification",
  PASSWORD_RESET = "password_reset",
}

export class EmailTemplateFactory {
  constructor(private frontendUrl: string) {}

  createTemplate(type: EmailTemplateType): IEmailTemplate {
    switch (type) {
      case EmailTemplateType.VERIFICATION:
        return new VerificationEmailTemplate(this.frontendUrl);
      case EmailTemplateType.PASSWORD_RESET:
        return new PasswordResetEmailTemplate(this.frontendUrl);
      default:
        throw new Error(`Unknown email template type: ${type}`);
    }
  }
}
