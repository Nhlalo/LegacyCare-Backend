import { IEmailService } from "../interfaces/IEmailService";
import {
  EmailTemplateFactory,
  EmailTemplateType,
} from "../templates/EmailTemplateFactory";
import logger from "../lib/logger";

export class EmailService implements IEmailService {
  constructor(
    private apiKey: string,
    private from: string,
    private templateFactory: EmailTemplateFactory,
  ) {}

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify({
          sender: { email: this.from },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message || "Failed to send email");
      }

      logger.info({ to: options.to, subject: options.subject }, "Email sent");
    } catch (error: any) {
      logger.error(
        { error: error.message, to: options.to },
        "Failed to send email",
      );
      throw new Error("Failed to send email");
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const template = this.templateFactory.createTemplate(
      EmailTemplateType.VERIFICATION,
    );
    const html = template.html({ email: to, token });
    await this.sendEmail({ to, subject: template.subject, html });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const template = this.templateFactory.createTemplate(
      EmailTemplateType.PASSWORD_RESET,
    );
    const html = template.html({ token });
    await this.sendEmail({ to, subject: template.subject, html });
  }
}
