/**
 * Permissões por perfil de usuário (o que cada um vê no menu e pode abrir).
 *
 * A interface usa estas regras para esconder telas e informações; as regras que
 * protegem dados sensíveis também existem no banco (RLS, seção 29 do script SQL).
 */
import type { ActiveTab } from '../components/Navbar';
import type { UserRole } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  operador: 'Operador',
  entregador: 'Entregador',
  atendente: 'Atendente de caixa',
};

/** Descrição curta mostrada ao escolher o perfil de um usuário. */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  superadmin: 'Acesso total, incluindo o histórico de ações de todos os usuários',
  admin: 'Acesso total à operação e ao financeiro; cadastra usuários',
  operador: 'Vendas, entregas, estoque e financeiro do dia a dia',
  entregador: 'Rota de entregas e finalização dos pedidos',
  atendente: 'Só lança vendas e deliverys, abre e fecha o caixa. Sem acesso ao financeiro',
};

/** Telas liberadas para o atendente de caixa. */
const ATTENDANT_TABS: ActiveTab[] = ['dashboard', 'em_andamento', 'historico_vendas', 'caixa', 'clientes'];

export function canAccessTab(role: UserRole | undefined, tab: ActiveTab): boolean {
  if (!role) return tab === 'dashboard';
  if (tab === 'auditoria') return role === 'superadmin';
  if (tab === 'usuarios') return role === 'superadmin' || role === 'admin';
  if (role === 'atendente') return ATTENDANT_TABS.includes(tab);
  return true;
}

/** Pode ver custo, lucro, margem, contas a pagar e despesas. */
export function canSeeFinance(role: UserRole | undefined): boolean {
  return !!role && role !== 'atendente';
}
