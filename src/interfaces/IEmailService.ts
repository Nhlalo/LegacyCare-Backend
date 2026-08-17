export interface IEmailService {
  sendEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void>;
  sendVerificationEmail(to: string, token: string): Promise<void>;
  sendPasswordResetEmail(to: string, token: string): Promise<void>;
}
