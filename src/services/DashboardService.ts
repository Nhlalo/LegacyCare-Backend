import { prisma } from "../lib/prisma";

export class DashboardService {
  async getOverview(funeralHomeId: string) {
    const caseStats = await prisma.case.groupBy({
      by: ["status", "type"],
      where: { funeralHomeId },
      _count: {
        id: true,
      },
    });

    const revenueResult = await prisma.payment.aggregate({
      where: {
        case: {
          funeralHomeId: funeralHomeId,
        },
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
    });

    const staffCount = await prisma.staff.count({
      where: { funeralHomeId },
    });

    // Calculate totals from grouped results
    let totalCases = 0;
    let openCases = 0;
    let preNeedCases = 0;
    let atNeedCases = 0;

    for (const stat of caseStats) {
      totalCases += stat._count.id;
      if (stat.status !== "CLOSED") {
        openCases += stat._count.id;
      }
      if (stat.type === "PRE_NEED") {
        preNeedCases += stat._count.id;
      }
      if (stat.type === "AT_NEED") {
        atNeedCases += stat._count.id;
      }
    }

    return {
      totalCases,
      openCases,
      preNeedCases,
      atNeedCases,
      totalRevenue: revenueResult._sum.amount || 0,
      staffCount,
    };
  }

  async getRevenueReport(
    funeralHomeId: string,
    period: "monthly" | "yearly" = "monthly",
  ) {
    const payments = await prisma.payment.groupBy({
      by: ["createdAt"],
      where: {
        case: {
          funeralHomeId: funeralHomeId,
        },
        status: "COMPLETED",
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const revenueByPeriod: Record<string, number> = {};

    for (const payment of payments) {
      const date = new Date(payment.createdAt);
      let key: string;
      if (period === "monthly") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = String(date.getFullYear());
      }
      revenueByPeriod[key] =
        (revenueByPeriod[key] || 0) + (payment._sum.amount || 0);
    }

    return revenueByPeriod;
  }
}
