export interface IEmailTemplate {
  subject: string;
  html(data: Record<string, any>): string;
}

export interface IFamilyLinkEmailTemplate extends IEmailTemplate {
  getSubject(data: { deceasedName: string }): string;
  render(data: {
    familyName: string;
    deceasedName: string;
    link: string;
    expiresAt: Date;
  }): string;
}
