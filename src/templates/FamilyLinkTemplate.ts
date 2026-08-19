import { IFamilyLinkEmailTemplate } from "../interfaces/IEmailTemplate";

export class FamilyLinkTemplate implements IFamilyLinkEmailTemplate {
  subject: string = "Funeral Arrangements";

  html(data: Record<string, any>): string {
    return this.render(data as any);
  }

  getSubject(data: { deceasedName: string }): string {
    return `Funeral Arrangements for ${data.deceasedName || "Your Loved One"}`;
  }

  render(data: {
    familyName: string;
    deceasedName: string;
    link: string;
    expiresAt: Date;
  }): string {
    return `
      <h1>${data.deceasedName || "Funeral"} Arrangements</h1>
      <p>Dear ${data.familyName} family,</p>
      <p>You can view and manage all arrangements here:</p>
      <a href="${data.link}">${data.link}</a>
      <p>This link will expire on ${data.expiresAt.toLocaleDateString()}.</p>
      <p>If you have any questions, please contact us.</p>
    `;
  }
}
