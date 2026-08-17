import { IEmailTemplate } from "../../interfaces/IEmailTemplate";

export class PasswordResetEmailTemplate implements IEmailTemplate {
  constructor(private frontendUrl: string) {}

  subject = "Reset Your Password";

  html(data: { token: string }): string {
    const resetLink = `${this.frontendUrl}/reset-password?token=${data.token}`;
    return `
      <h1>Reset Your Password</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
  }
}
