export function formatCurrency(value: number): string {
  if (isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getElapsedTime(dateString: string): string {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffMinutes = Math.floor((now.getTime() - past.getTime()) / 60000);

  if (diffMinutes < 1) return 'Agora mesmo';
  if (diffMinutes === 1) return 'Há 1 minuto';
  if (diffMinutes < 60) return `Há ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return 'Há 1 hora';
  if (diffHours < 24) return `Há ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Há 1 dia';
  return `Há ${diffDays} dias`;
}

export function generateNextCode(prefix: string, existingCodes: string[]): string {
  const numbers = existingCodes
    .map((code) => {
      const match = code.match(/(\d+)/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNum = max + 1;
  return `${prefix}-${nextNum.toString().padStart(6, '0')}`;
}

export function formatPaymentMethod(method: string | undefined): string {
  if (!method) return 'Outro';
  switch (method.toLowerCase()) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'pix':
      return 'PIX';
    case 'cartao_debito':
    case 'debito':
      return 'Cartão de Débito';
    case 'cartao_credito':
    case 'credito':
      return 'Cartão de Crédito';
    case 'fiado':
    case 'a_prazo':
      return 'Fiado (A Prazo)';
    case 'transferencia':
      return 'Transferência';
    case 'boleto':
      return 'Boleto';
    default:
      return method.charAt(0).toUpperCase() + method.slice(1);
  }
}
