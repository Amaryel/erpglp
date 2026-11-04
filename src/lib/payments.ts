import { PaymentMethod, PaymentSplit } from '../types';

/** Rótulos curtos usados na interface e nos registros de caixa. */
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  debito: 'Débito',
  credito: 'Crédito',
  fiado: 'Fiado',
  outro: 'Outro',
};

export const round2 = (value: number): number => Math.round((Number(value) || 0) * 100) / 100;

/**
 * Junta formas de pagamento repetidas (ex.: duas linhas de PIX), remove linhas zeradas
 * e arredonda para centavos. É o formato gravado na venda e usado no caixa.
 */
export function normalizePayments(payments: PaymentSplit[]): PaymentSplit[] {
  const totals = new Map<PaymentMethod, number>();
  for (const p of payments) {
    const amount = round2(p.amount);
    if (amount <= 0) continue;
    totals.set(p.method, round2((totals.get(p.method) || 0) + amount));
  }
  return [...totals.entries()].map(([method, amount]) => ({ method, amount }));
}

/** Resumo de uma lista de pagamentos em relação ao total da venda. */
export function summarizePayments(payments: PaymentSplit[], total: number) {
  const normalized = normalizePayments(payments);
  const fiado = round2(normalized.filter((p) => p.method === 'fiado').reduce((s, p) => s + p.amount, 0));
  const paid = round2(normalized.filter((p) => p.method !== 'fiado').reduce((s, p) => s + p.amount, 0));
  const covered = round2(paid + fiado);
  const remaining = round2(total - covered);
  return {
    normalized,
    paid,
    fiado,
    covered,
    remaining,
    /** Diferença de até 1 centavo é tolerada (arredondamentos). */
    isBalanced: Math.abs(remaining) <= 0.01,
  };
}

/** Texto amigável: "Dinheiro R$ 50,00 + PIX R$ 60,00". */
export function describePayments(payments: PaymentSplit[], format: (v: number) => string): string {
  const normalized = normalizePayments(payments);
  if (normalized.length === 0) return 'A combinar';
  return normalized.map((p) => `${PAYMENT_LABELS[p.method]} ${format(p.amount)}`).join(' + ');
}
