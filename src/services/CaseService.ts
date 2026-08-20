import { ICaseRepository } from "../interfaces/ICaseRepository";
import { IFuneralHomeRepository } from "../interfaces/IFuneralHomeRepository";
import { IEmailService } from "../interfaces/IEmailService";
import { ILinkGenerator } from "../interfaces/ILinkGenerator";
import { IFamilyLinkEmailTemplate } from "../interfaces/IEmailTemplate";
import logger from "../lib/logger";

export class CaseService {
  constructor(
    private caseRepo: ICaseRepository,
    private funeralHomeRepo: IFuneralHomeRepository,
    private emailService: IEmailService,
    private linkGenerator: ILinkGenerator,
    private emailTemplate: IFamilyLinkEmailTemplate,
  ) {}

  async createAtNeedCase(
    funeralHomeId: string,
    data: {
      familyName: string;
      deceasedName: string;
      serviceDate?: Date;
      serviceLocation?: string;
      totalAmount?: number;
    },
  ) {
    logger.info(
      { funeralHomeId, familyName: data.familyName },
      "Creating at-need case",
    );

    const caseData = await this.caseRepo.create({
      ...data,
      funeralHomeId,
      type: "AT_NEED",
      status: "OPEN",
      paidAmount: 0,
    });

    logger.info({ caseId: caseData.id }, "At-need case created");
    return caseData;
  }

  async createPreNeedCase(
    funeralHomeId: string,
    data: {
      familyName: string;
      monthlyPayment: number;
      totalAmount: number;
    },
  ) {
    logger.info(
      { funeralHomeId, familyName: data.familyName },
      "Creating pre-need case",
    );

    const caseData = await this.caseRepo.create({
      ...data,
      funeralHomeId,
      type: "PRE_NEED",
      status: "OPEN",
      paidAmount: 0,
    });

    logger.info({ caseId: caseData.id }, "Pre-need case created");
    return caseData;
  }

  async getCases(funeralHomeId: string) {
    return this.caseRepo.findByFuneralHome(funeralHomeId);
  }

  async getCase(caseId: string) {
    return this.caseRepo.findById(caseId);
  }

  async updateCase(
    caseId: string,
    data: {
      familyName?: string;
      deceasedName?: string;
      serviceDate?: Date;
      serviceLocation?: string;
      status?: "OPEN" | "IN_PROGRESS" | "READY" | "CLOSED";
      totalAmount?: number;
    },
  ) {
    const caseData = await this.caseRepo.update(caseId, data);
    logger.info({ caseId }, "Case updated");
    return caseData;
  }

  async generateFamilyLink(caseId: string): Promise<{
    token: string;
    link: string;
    expiresAt: Date;
  }> {
    const caseData = await this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error("Case not found");
    }

    const funeralHome = await this.funeralHomeRepo.findById(
      caseData.funeralHomeId,
    );
    if (!funeralHome) {
      throw new Error("Funeral home not found");
    }

    // Generate the link (pure function)
    const { token, link, expiresAt } = this.linkGenerator.generate(
      funeralHome.subdomain,
    );

    // Store token in database
    await this.caseRepo.update(caseId, {
      familyAccessToken: token,
      linkExpiresAt: expiresAt,
    });

    logger.info({ caseId, expiresAt }, "Family link generated");

    return { token, link, expiresAt };
  }

  async sendFamilyLink(caseId: string, email: string): Promise<void> {
    const caseData = await this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error("Case not found");
    }

    let token = caseData.familyAccessToken;
    let expiresAt = caseData.linkExpiresAt;

    if (!token) {
      const funeralHome = await this.funeralHomeRepo.findById(
        caseData.funeralHomeId,
      );
      if (!funeralHome) {
        throw new Error("Funeral home not found");
      }

      const result = this.linkGenerator.generate(funeralHome.subdomain);
      token = result.token;
      expiresAt = result.expiresAt;

      await this.caseRepo.update(caseId, {
        familyAccessToken: token,
        linkExpiresAt: expiresAt,
      });
    }

    const funeralHome = await this.funeralHomeRepo.findById(
      caseData.funeralHomeId,
    );
    const link = `https://${funeralHome?.subdomain}.yourplatform.com/case/${token}`;

    const deceasedName = caseData.deceasedName || "Your Loved One";

    const subject = this.emailTemplate.getSubject({ deceasedName });

    const html = this.emailTemplate.render({
      familyName: caseData.familyName,
      deceasedName,
      link,
      expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await this.emailService.sendEmail({
      to: email,
      subject,
      html,
    });

    logger.info({ caseId, email }, "Family link sent");
  }

  async getCaseByAccessToken(token: string) {
    return this.caseRepo.findByAccessToken(token);
  }

  async closeCase(caseId: string): Promise<void> {
    const caseData = await this.caseRepo.findById(caseId);
    if (!caseData) {
      throw new Error("Case not found");
    }

    if (caseData.status === "CLOSED") {
      throw new Error("Case is already closed");
    }

    await this.caseRepo.update(caseId, { status: "CLOSED" });
    logger.info({ caseId }, "Case closed");
  }
}
