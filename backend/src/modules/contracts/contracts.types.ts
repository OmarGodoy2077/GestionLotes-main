import type {
  Contract,
  ContractLot,
  PaymentSchedule,
  DownPaymentInstallment,
} from "@prisma/client";

export type ContractDto = Contract;

export type ContractFull = Contract & {
  contractLots: ContractLot[];
  paymentSchedule: PaymentSchedule[];
  downPaymentInstallmentsList: DownPaymentInstallment[];
};
