export interface IEmailTemplate {
  subject: string;
  html(data: Record<string, any>): string;
}
