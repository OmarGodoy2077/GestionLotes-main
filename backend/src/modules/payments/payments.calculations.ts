/// Re-export de las funciones financieras centrales para tenerlas cerca del
/// módulo que más las usa. La fuente única vive en `utils/calculations.ts`.
export {
  calculateNivelatedPayment,
  calculateLatePaymentFee,
  calculateAmortizationSchedule,
  applyPaymentWaterfall,
  addMonths,
} from "../../utils/calculations";
export type {
  PaymentScheduleEntry,
  ApplicationResult,
} from "../../utils/calculations";
