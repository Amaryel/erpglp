import React, { useEffect, useRef, useState } from 'react';

type NumberFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min'> & {
  value: number;
  onValueChange: (value: number) => void;
  /** Aceita casas decimais (vírgula ou ponto). Padrão: true. */
  decimal?: boolean;
  /** Permite números negativos. Padrão: false. */
  allowNegative?: boolean;
  /** Mostra o campo vazio quando o valor é 0 (útil para valores em dinheiro). */
  emptyWhenZero?: boolean;
  /** Mantido por compatibilidade com o antigo input numérico. */
  min?: number | string;
};

const format = (value: number, decimal: boolean, emptyWhenZero: boolean) => {
  if (!Number.isFinite(value)) return '';
  if (value === 0 && emptyWhenZero) return '';
  return decimal ? String(value).replace('.', ',') : String(Math.trunc(value));
};

/** Converte o texto digitado ("1.234,50", "12,5", "12.5") em número. */
export function parseNumberInput(text: string, decimal = true, allowNegative = false): number {
  let clean = text.trim();
  if (!clean) return 0;
  const negative = allowNegative && clean.startsWith('-');
  clean = clean.replace(/[^\d,.]/g, '');
  if (decimal) {
    clean = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  } else {
    clean = clean.replace(/[,.]/g, '');
  }
  const n = decimal ? parseFloat(clean) : parseInt(clean, 10);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

/**
 * Campo numérico que pode ser apagado por completo enquanto se digita
 * (o input numérico antigo voltava para "0" e não deixava limpar).
 * Usa teclado numérico no celular e aceita vírgula decimal.
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onValueChange,
  decimal = true,
  allowNegative = false,
  emptyWhenZero = false,
  min: _min,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [draft, setDraft] = useState(() => format(value, decimal, emptyWhenZero));
  const focused = useRef(false);

  // Atualiza o texto quando o valor muda por fora (ex.: botões + e −), sem atrapalhar a digitação
  useEffect(() => {
    if (!focused.current) setDraft(format(value, decimal, emptyWhenZero));
  }, [value, decimal, emptyWhenZero]);

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setDraft(format(value, decimal, emptyWhenZero));
        onBlur?.(e);
      }}
      onChange={(e) => {
        const allowed = decimal ? /[^\d,.-]/g : /[^\d-]/g;
        let text = e.target.value.replace(allowed, '');
        if (!allowNegative) text = text.replace(/-/g, '');
        setDraft(text);
        onValueChange(parseNumberInput(text, decimal, allowNegative));
      }}
    />
  );
};
