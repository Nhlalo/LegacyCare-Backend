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
export interface IInvitationLinkEmailTemplate {
  getSubject(funeralHomeName: string): string;
  html(data: {
    email: string;
    token: string;
    role: string;
    tempPassword?: string;
    funeralHomeName: string;
  }): string;
}
