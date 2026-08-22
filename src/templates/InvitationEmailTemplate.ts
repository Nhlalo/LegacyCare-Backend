import { IInvitationLinkEmailTemplate } from "../interfaces/IEmailTemplate";

export class InvitationEmailTemplate implements IInvitationLinkEmailTemplate {
  constructor(private frontendUrl: string) {}

  getSubject(funeralHomeName: string): string {
    return `Invitation to join ${funeralHomeName}`;
  }

  html(data: {
    email: string;
    token: string;
    role: string;
    tempPassword?: string;
    funeralHomeName: string;
  }): string {
    const acceptLink = `${this.frontendUrl}/accept-invite?token=${data.token}`;
    return `
  <h1>You've Been Invited!</h1>
        <p>You have been invited to join <strong>${data.funeralHomeName}</strong> on the Legacy Care platform.</p>
        <p><strong>Role:</strong> ${data.role}</p>
       ${data.tempPassword ? `<p><strong>Temporary Password:</strong> ${data.tempPassword}</p>` : ""}
        <p>Click the link below to accept your invitation and set up your account:</p>
        <p><a href="${acceptLink}" style="display: inline-block; padding: 12px 24px; background-color: #1a3a5c; color: white; text-decoration: none; border-radius: 4px;">Accept Invitation</a></p>
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, please ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Legacy Care - Funeral Home Management Platform</p>
    `;
  }
}
