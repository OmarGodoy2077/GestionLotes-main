import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./payments.service";

export const listPaymentsByContractController = asyncHandler(async (req, res) => {
  res.json(await service.listPaymentsByContract(req.params.contractId));
});

export const createPaymentController = asyncHandler(async (req, res) => {
  const payment = await service.createPayment(
    req.params.contractId,
    req.body,
    req.user?.id
  );
  res.status(201).json(payment);
});

export const getPaymentController = asyncHandler(async (req, res) => {
  res.json(await service.getPaymentById(req.params.id));
});

export const generateReceiptController = asyncHandler(async (req, res) => {
  const pdf = await service.generateReceipt(req.params.id);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="receipt-${req.params.id}.pdf"`
  );
  res.send(pdf);
});

export const searchPaymentsController = asyncHandler(async (req, res) => {
  res.json(await service.searchPayments(req.query as never));
});
