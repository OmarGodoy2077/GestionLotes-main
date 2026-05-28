/// Stub para generación de boletas en PDF.
///
/// La implementación real se hará en Fase 3 con una librería como `pdfkit` o
/// `puppeteer`. Esta firma se conserva estable para no romper a los consumidores.

export type ReceiptData = {
  receiptNumber: string;
  paymentDate: Date;
  contractNumber: string;
  clientName: string;
  amountPaid: number | string;
  method: string;
};

/// Devuelve un Buffer con el PDF del recibo. Stub.
export async function generateReceiptPdf(_data: ReceiptData): Promise<Buffer> {
  throw new Error("generateReceiptPdf no está implementado todavía (Fase 3).");
}
