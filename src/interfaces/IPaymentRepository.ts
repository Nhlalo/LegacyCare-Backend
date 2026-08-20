import { Payment } from "../../generated/prisma/client";

export interface IPaymentRepository {
  create(data: {
    caseId: string;
    amount: number;
    method: string;
    status: string;
    reference?: string;
    transactionId?: string;
  }): Promise<Payment>;

  findByCaseId(caseId: string): Promise<Payment[]>;

  findById(id: string): Promise<Payment | null>;

  update(id: string, data: Partial<Payment>): Promise<Payment>;

  getTotalPaid(caseId: string): Promise<number>;
}
