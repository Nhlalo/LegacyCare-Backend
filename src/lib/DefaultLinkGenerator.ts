import crypto from "crypto";
import { ILinkGenerator } from "../interfaces/ILinkGenerator";

export class DefaultLinkGenerator implements ILinkGenerator {
  constructor(
    private baseUrl: string,
    private expiryDays: number = 30,
  ) {}

  generate(subdomain: string): {
    token: string;
    link: string;
    expiresAt: Date;
  } {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.expiryDays);

    const link = `https://${subdomain}.${this.baseUrl}/case/${token}`;

    return { token, link, expiresAt };
  }
}
