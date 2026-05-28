import { Prisma } from "@prisma/client";

/// Funciones financieras usadas por el módulo de contratos/pagos.
///
/// IMPORTANTE: Todos los cálculos monetarios usan `Prisma.Decimal` para evitar
/// errores de precisión propios del `number` de JavaScript. Nunca convertir a
/// `Number` excepto al final, en el límite de la respuesta JSON.

export type PaymentScheduleEntry = {
  installmentNumber: number;
  dueDate: Date;
  principalAmount: Prisma.Decimal;
  interestAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
};

export type ApplicationResult = {
  appliedToLateFee: Prisma.Decimal;
  appliedToInterest: Prisma.Decimal;
  appliedToPrincipal: Prisma.Decimal;
  remaining: Prisma.Decimal;
};

const ZERO = new Prisma.Decimal(0);
const ONE = new Prisma.Decimal(1);
const TWELVE = new Prisma.Decimal(12);
const ONE_HUNDRED = new Prisma.Decimal(100);

/// Cuota nivelada (anualidad ordinaria).
///   c = P * (i / (1 - (1 + i)^-n))
/// Donde:
///   P = principal
///   i = tasa periódica (mensual) = anualRate / 12
///   n = número de cuotas mensuales
///
/// `annualRate` se recibe como porcentaje (ej: 12.5 = 12.5%).
/// Si la tasa es 0 → cuota = P / n (sin interés).
export function calculateNivelatedPayment(
  principal: Prisma.Decimal | number | string,
  annualRatePct: Prisma.Decimal | number | string,
  months: number
): Prisma.Decimal {
  const P = new Prisma.Decimal(principal);
  const rate = new Prisma.Decimal(annualRatePct).div(ONE_HUNDRED);
  const n = new Prisma.Decimal(months);

  if (rate.isZero()) {
    return P.div(n).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  const i = rate.div(TWELVE);
  // (1 + i)^-n  →  1 / (1+i)^n
  const onePlusI = ONE.plus(i);
  const onePlusIToN = onePlusI.pow(n.toNumber());
  const denom = ONE.minus(ONE.div(onePlusIToN));
  const payment = P.mul(i).div(denom);

  return payment.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/// Mora simple sobre un monto vencido.
///   fee = amount * dailyRatePct/100 * daysPastDue
export function calculateLatePaymentFee(
  amount: Prisma.Decimal | number | string,
  daysPastDue: number,
  dailyRatePct: Prisma.Decimal | number | string
): Prisma.Decimal {
  if (daysPastDue <= 0) return ZERO;
  const A = new Prisma.Decimal(amount);
  const r = new Prisma.Decimal(dailyRatePct).div(ONE_HUNDRED);
  return A.mul(r).mul(daysPastDue).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/// Genera la tabla de amortización a sistema francés (cuota nivelada).
/// Calcula interés sobre saldo y reparte capital + interés en cada cuota.
export function calculateAmortizationSchedule(
  principal: Prisma.Decimal | number | string,
  annualRatePct: Prisma.Decimal | number | string,
  months: number,
  firstDueDate: Date
): PaymentScheduleEntry[] {
  const P = new Prisma.Decimal(principal);
  const annual = new Prisma.Decimal(annualRatePct).div(ONE_HUNDRED);
  const monthlyRate = annual.div(TWELVE);
  const payment = calculateNivelatedPayment(P, annualRatePct, months);

  const schedule: PaymentScheduleEntry[] = [];
  let balance = P;

  for (let k = 1; k <= months; k++) {
    const interest = monthlyRate.isZero()
      ? ZERO
      : balance.mul(monthlyRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    let principalPart = payment.minus(interest);
    // En la última cuota se ajusta el capital al saldo restante para evitar
    // residuos por redondeo.
    if (k === months) {
      principalPart = balance;
    }

    const total = principalPart.plus(interest);
    balance = balance.minus(principalPart);

    schedule.push({
      installmentNumber: k,
      dueDate: addMonths(firstDueDate, k - 1),
      principalAmount: principalPart,
      interestAmount: interest,
      totalAmount: total,
    });
  }

  return schedule;
}

/// Aplica un monto pagado en el orden: mora → interés → capital.
/// Devuelve el desglose y lo que sobra (saldo a favor).
export function applyPaymentWaterfall(
  amountPaid: Prisma.Decimal | number | string,
  due: {
    lateFee: Prisma.Decimal | number | string;
    interest: Prisma.Decimal | number | string;
    principal: Prisma.Decimal | number | string;
  }
): ApplicationResult {
  let remaining = new Prisma.Decimal(amountPaid);

  const consume = (target: Prisma.Decimal): Prisma.Decimal => {
    if (remaining.lte(ZERO)) return ZERO;
    const applied = Prisma.Decimal.min(remaining, target);
    remaining = remaining.minus(applied);
    return applied;
  };

  const appliedToLateFee = consume(new Prisma.Decimal(due.lateFee));
  const appliedToInterest = consume(new Prisma.Decimal(due.interest));
  const appliedToPrincipal = consume(new Prisma.Decimal(due.principal));

  return {
    appliedToLateFee,
    appliedToInterest,
    appliedToPrincipal,
    remaining,
  };
}

/// Suma `n` meses calendario a una fecha respetando el último día del mes.
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  const targetMonth = d.getMonth() + n;
  d.setMonth(targetMonth);
  // Si el día se desbordó (ej: 31 enero + 1 mes), retroceder al último día del mes esperado.
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0);
  }
  return d;
}
