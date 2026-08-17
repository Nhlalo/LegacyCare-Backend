import { IEmailTemplate } from "../../interfaces/IEmailTemplate";

export class VerificationEmailTemplate implements IEmailTemplate {
  constructor(private frontendUrl: string) {}

  subject = "Verify Your Email Address";

  html(data: { email: string; token: string }): string {
    const verificationLink = `${this.frontendUrl}/verify-email?token=${data.token}`;
    return `
      <h1>Verify Your Email</h1>
      <p>Welcome ${data.email}!</p>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationLink}">${verificationLink}</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `;
  }
}
