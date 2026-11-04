import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  X,
  User,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';
import { useAuth, MIN_PASSWORD_LENGTH } from '../context/AuthContext';
import { AppUser, UserRole, UserStatus } from '../types';
import { formatDate } from '../utils/formatters';

export const UsersManagementView: React.FC = () => {
  const {
    users,
    currentUser,
    createUser,
    updateUser,
    toggleBlockUser,
    resetUserPassword,
    deleteUser,
  } = useAuth();

  const isSuperadmin = currentUser?.role === 'superadmin';

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Create form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operador');
  const [newPassword, setNewPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('operador');

  // Reset password state
  const [resetPasswordValue, setResetPasswordValue] = useState('');

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setActionFeedback(null);
    try {
      const res = await createUser({
        username: newUsername,
        name: newName,
        role: newRole,
        password: newPassword,
      });
      if (res.success) {
        setIsCreateOpen(false);
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        setNewRole('operador');
        setActionFeedback({
          type: 'success',
          text: `Usuário "${newUsername}" criado com sucesso!`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          text: res.error || 'Erro ao criar usuário.',
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    setActionFeedback(null);
    try {
      const res = await updateUser(selectedUser.id, {
        name: editName.trim(),
        role: editRole,
      });
      if (res.success) {
        setIsEditOpen(false);
        setSelectedUser(null);
        setActionFeedback({
          type: 'success',
          text: 'Usuário atualizado com sucesso!',
        });
      } else {
        setActionFeedback({
          type: 'error',
          text: res.error || 'Erro ao atualizar usuário.',
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    setActionFeedback(null);
    try {
      const res = await resetUserPassword(selectedUser.id, resetPasswordValue);
      if (res.success) {
        setIsResetPasswordOpen(false);
        setResetPasswordValue('');
        setSelectedUser(null);
        setActionFeedback({
          type: 'success',
          text: `Senha do usuário "${selectedUser.username}" redefinida com sucesso!`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          text: res.error || 'Erro ao redefinir senha.',
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleBlock = async (user: AppUser) => {
    const actionName = user.status === 'ativo' ? 'bloquear' : 'desbloquear';
    if (window.confirm(`Deseja realmente ${actionName} o usuário "${user.name}" (${user.username})?`)) {
      const res = await toggleBlockUser(user.id);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          text: `Usuário ${user.username} ${user.status === 'ativo' ? 'bloqueado' : 'desbloqueado'} com sucesso!`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          text: res.error || 'Erro ao alterar status.',
        });
      }
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    setActionFeedback(null);
    try {
      const res = await deleteUser(selectedUser.id);
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          text: 'Usuário excluído com sucesso!',
        });
      } else {
        setActionFeedback({
          type: 'error',
          text: res.error || 'Erro ao excluir usuário.',
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const roleLabel = (role: UserRole) =>
    role === 'superadmin' ? 'Superadmin' : role === 'admin' ? 'Administrador' : role === 'entregador' ? 'Entregador' : 'Operador';

  const renderIdentity = (u: AppUser) => {
    const isSuper = u.role === 'superadmin';
    const isMe = currentUser?.id === u.id;
    return (
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isSuper ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {isSuper ? <Shield className="w-4 h-4 text-amber-600" /> : <User className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm md:text-xs text-slate-900 flex items-center gap-1.5">
            <span className="truncate">{u.name}</span>
            {isMe && (
              <span className="text-[10px] font-bold px-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded shrink-0">
                Você
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-500 truncate">@{u.username}</div>
        </div>
      </div>
    );
  };

  const renderRole = (u: AppUser) => (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
        u.role === 'superadmin'
          ? 'bg-amber-100 text-amber-900 border border-amber-300'
          : u.role === 'admin'
          ? 'bg-blue-100 text-blue-900 border border-blue-200'
          : 'bg-slate-100 text-slate-700 border border-slate-200'
      }`}
    >
      {roleLabel(u.role)}
    </span>
  );

  const renderStatus = (u: AppUser) => {
    const isBlocked = u.status === 'bloqueado';
    return (
      <div className="flex flex-col items-end md:items-start gap-1 shrink-0">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
            isBlocked ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isBlocked ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <span>{isBlocked ? 'Bloqueado' : 'Ativo'}</span>
        </span>
        {!u.hasDefinedPassword && (
          <span className="text-[10px] font-bold text-amber-700" title="Defina uma senha para liberar o acesso">
            Senha pendente
          </span>
        )}
      </div>
    );
  };

  const renderLastAccess = (u: AppUser) =>
    u.lastLoginAt ? (
      <span className="inline-flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>{formatDate(u.lastLoginAt)}</span>
      </span>
    ) : (
      <span className="text-slate-400 italic">Nunca acessou</span>
    );

  /** Ações permitidas: as mesmas regras são validadas novamente no servidor. */
  const renderActions = (u: AppUser, mobile: boolean) => {
    const isSuper = u.role === 'superadmin';
    const isBlocked = u.status === 'bloqueado';
    const base = mobile
      ? 'h-10 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors'
      : 'h-8 min-w-8 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-colors';

    if (isSuper && !isSuperadmin) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
          <Lock className="w-3 h-3 text-amber-600" />
          <span>Protegido (Superadmin)</span>
        </span>
      );
    }

    return (
      <>
        {isSuperadmin && !isSuper && (
          <button
            onClick={() => handleToggleBlock(u)}
            title={isBlocked ? 'Desbloquear Usuário' : 'Bloquear Usuário'}
            className={`${base} ${
              isBlocked
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
            }`}
          >
            {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span className={mobile ? '' : 'hidden lg:inline'}>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
          </button>
        )}

        <button
          onClick={() => {
            setSelectedUser(u);
            setResetPasswordValue('');
            setIsResetPasswordOpen(true);
          }}
          title="Redefinir Senha"
          aria-label={`Redefinir senha de ${u.name}`}
          className={`${base} bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          {mobile && <span>Senha</span>}
        </button>

        <button
          onClick={() => {
            setSelectedUser(u);
            setEditName(u.name);
            setEditRole(u.role);
            setIsEditOpen(true);
          }}
          title="Editar Usuário"
          aria-label={`Editar ${u.name}`}
          className={`${base} bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200`}
        >
          <Edit2 className="w-3.5 h-3.5" />
          {mobile && <span>Editar</span>}
        </button>

        {isSuperadmin && !isSuper && (
          <button
            onClick={() => {
              setSelectedUser(u);
              setIsDeleteConfirmOpen(true);
            }}
            title="Excluir Usuário"
            aria-label={`Excluir ${u.name}`}
            className={`${base} bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {mobile && <span>Excluir</span>}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-inner">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                Gerenciamento de Usuários
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                Controle de Acesso
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cadastre operadores, defina senhas e bloqueie/desbloqueie acessos de outros aparelhos
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all self-stretch sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Usuário</span>
        </button>
      </div>

      {/* Action message banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-medium ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs font-bold underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, usuário ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
        </span>
      </div>

      {/* Lista de usuários: cartões no celular, tabela a partir do tablet */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Nenhum usuário encontrado para essa busca.
        </div>
      ) : (
        <>
          <ul className="md:hidden space-y-3">
            {filteredUsers.map((u) => (
              <li key={u.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  {renderIdentity(u)}
                  {renderStatus(u)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  {renderRole(u)}
                  {renderLastAccess(u)}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  {renderActions(u, true)}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Usuário & Nome</th>
                    <th className="p-3.5">Nível / Cargo</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Último Acesso</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">{renderIdentity(u)}</td>
                      <td className="p-3.5">{renderRole(u)}</td>
                      <td className="p-3.5">{renderStatus(u)}</td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{renderLastAccess(u)}</td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-end gap-1.5">{renderActions(u, false)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: CADASTRAR NOVO USUÁRIO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Cadastrar Novo Usuário
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nome de Usuário (Login) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: carloseduardo"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nível de Acesso *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium bg-white"
                >
                  <option value="operador">Operador (Vendas, Estoque, Entregas)</option>
                  <option value="admin">Administrador (Controle Total de Operações)</option>
                  <option value="entregador">Entregador (Apenas Rota e Entregas)</option>
                  {isSuperadmin && (
                    <option value="superadmin">Superadmin (Acesso Irrestrito & Banco de Dados)</option>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="new-user-password" className="font-bold text-slate-700 block mb-1">
                  Senha Inicial *
                </label>
                <input
                  id="new-user-password"
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Informe a senha ao usuário pessoalmente. Ela é criptografada no servidor e não pode ser consultada depois.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {formLoading ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR USUÁRIO */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Editar Usuário @{selectedUser.username}
                </h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              {selectedUser.role !== 'superadmin' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nível de Acesso *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-medium bg-white"
                  >
                    <option value="operador">Operador (Vendas, Estoque, Entregas)</option>
                    <option value="admin">Administrador (Controle Total)</option>
                    <option value="entregador">Entregador</option>
                    {isSuperadmin && (
                      <option value="superadmin">Superadmin (Acesso Irrestrito & Banco de Dados)</option>
                    )}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {formLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REDEFINIR SENHA */}
      {isResetPasswordOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Redefinir Senha de {selectedUser.name}
                </h3>
              </div>
              <button
                onClick={() => setIsResetPasswordOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nova Senha *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {formLoading ? 'Salvando...' : 'Confirmar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMAR EXCLUSÃO */}
      {isDeleteConfirmOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excluir Usuário?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tem certeza que deseja excluir permanentemente o usuário <strong>{selectedUser.name}</strong> (@{selectedUser.username})?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={formLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
              >
                {formLoading ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
