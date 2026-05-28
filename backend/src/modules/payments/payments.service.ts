import * as repo from "./payments.repository";
import { NotFoundError } from "../../utils/apiError";
import type {
  CreatePaymentInput,
  PaymentSearchInput,
} from "./payments.validators";

export async function listPaymentsByContract(contractId: string) {
  return repo.findPaymentsByContract(contractId);
}

export async function getPaymentById(id: string) {
  const payment = await repo.findPaymentById(id);
  if (!payment) throw new NotFoundError("Pago no encontrado");
  return payment;
}

export async function createPayment(
  _contractId: string,
  _input: CreatePaymentInput,
  _registeredById?: string
) {
  throw new Error("payments.service.createPayment no implementado (Fase 3).");
}

export async function generateReceipt(_paymentId: string): Promise<Buffer> {
  throw new Error("payments.service.generateReceipt no implementado (Fase 3).");
}

export async function searchPayments(_filter: PaymentSearchInput) {
  throw new Error("payments.service.searchPayments no implementado (Fase 3).");
}
