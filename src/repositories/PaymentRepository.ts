import { IPaymentRepository } from "../interfaces/IPaymentRepository";
import { prisma } from "../lib/prisma";
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from "../../generated/prisma/client";

export class PaymentRepository implements IPaymentRepository {
  async create(data: {
    caseId: string;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    reference?: string;
    transactionId?: string;
  }): Promise<Payment> {
    return prisma.payment.create({
      data,
    });
  }

  async findByCaseId(caseId: string): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Partial<Payment>): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data,
    });
  }

  async getTotalPaid(caseId: string): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: {
        caseId,
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount || 0;
  }
}
