import type { Payment, PaymentApplication } from "@prisma/client";

export type PaymentDto = Payment;
export type PaymentWithApplications = Payment & {
  applications: PaymentApplication[];
};
