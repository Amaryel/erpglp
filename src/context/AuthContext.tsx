import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppUser, UserRole } from '../types';
import { getSupabaseClient, mapDbUser, normalizeUsername, usernameToLoginEmail } from '../lib/supabase';
import { hasPendingSync, getSyncStatus } from '../lib/offlineSync';

type ActionResult = { success: boolean; error?: string };

interface AuthContextType {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Mensagem exibida na tela de login quando a sessão é encerrada pelo sistema (ex.: bloqueio). */
  sessionMessage: string | null;
  users: AppUser[];
  login: (username: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  createUser: (userData: { username: string; name: string; role: UserRole; password: string }) => Promise<ActionResult>;
  updateUser: (id: string, updates: { name: string; role: UserRole }) => Promise<ActionResult>;
  toggleBlockUser: (id: string) => Promise<ActionResult>;
  resetUserPassword: (id: string, newPassword: string) => Promise<ActionResult>;
  deleteUser: (id: string) => Promise<ActionResult>;
  reloadUsers: () => Promise<void>;
}

export const MIN_PASSWORD_LENGTH = 8;

// Chaves da versão antiga: guardavam a lista de usuários e hashes de senha no navegador.
const LEGACY_AUTH_KEYS = [
  'erpglp_auth_session_v1',
  'erpglp_auth_session_v2',
  'erpglp_auth_users_v1',
  'erpglp_auth_users_v2',
];

const USER_COLUMNS = 'id, username, name, role, status, has_defined_password, last_login_at, created_at, updated_at';

const NO_DB_ERROR = 'Banco de dados online não configurado. Entre em contato com o administrador do sistema.';

/** Converte erros do Supabase em mensagens claras para o operador. */
function friendlyError(err: { message?: string; code?: string } | null | undefined, fallback: string): string {
  if (!err) return fallback;
  const msg = err.message || '';
  if (/invalid login credentials/i.test(msg)) return 'Usuário ou senha incorretos.';
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
  if (/failed to fetch|network/i.test(msg)) return 'Sem conexão com o servidor. Verifique sua internet.';
  if (/could not find the function|PGRST202/i.test(msg + (err.code || ''))) {
    return 'O banco ainda não foi atualizado com o script de segurança. Peça ao Superadmin para executá-lo no Supabase.';
  }
  // Mensagens de negócio vindas das funções erp_* já estão em português
  return msg || fallback;
}

function clearLegacyAuthStorage() {
  try {
    LEGACY_AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Armazenamento indisponível (aba anônima/bloqueada): nada a limpar
  }
}

// ---------- acesso offline ----------
// Guarda o perfil do último login neste aparelho para abrir o sistema sem internet.
const PROFILE_CACHE_KEY = 'erpglp_profile_cache_v1';

function storedAuthUserId(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (/^sb-.*-auth-token$/.test(key)) {
        const parsed = JSON.parse(localStorage.getItem(key) || 'null');
        return parsed?.user?.id || null;
      }
    }
  } catch {
    /* armazenamento indisponível */
  }
  return null;
}

function saveProfileCache(authUserId: string, profile: AppUser) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ authUserId, profile, savedAt: new Date().toISOString() }));
  } catch {
    /* ignore */
  }
}

function readProfileCache(): { authUserId: string; profile: AppUser } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || 'null');
    return parsed?.authUserId && parsed?.profile ? parsed : null;
  } catch {
    return null;
  }
}

function clearProfileCache() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

const isNetworkFailure = (msg?: string) => /failed to fetch|network|load failed|fetch/i.test(msg || '');

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const currentUserRef = useRef<AppUser | null>(null);
  currentUserRef.current = currentUser;

  const clearSessionState = useCallback(() => {
    setCurrentUser(null);
    setUsers([]);
  }, []);

  /** Carrega o perfil do usuário autenticado. Encerra a sessão se não houver acesso liberado. */
  const loadProfile = useCallback(async (): Promise<ActionResult> => {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: NO_DB_ERROR };

    const { data, error } = await supabase.rpc('erp_me');
    if ((error && isNetworkFailure(error.message)) || (error && !navigator.onLine)) {
      // Queda de internet não deve derrubar quem já está trabalhando
      if (currentUserRef.current) return { success: true };
      // Sem internet ao abrir: usa o último perfil que entrou neste aparelho
      const cache = readProfileCache();
      if (cache && cache.authUserId === storedAuthUserId() && cache.profile.status === 'ativo') {
        setCurrentUser(cache.profile);
        return { success: true };
      }
      return {
        success: false,
        error: 'Sem internet. O primeiro acesso neste aparelho precisa de conexão.',
      };
    }
    if (error) {
      await supabase.auth.signOut({ scope: 'local' });
      clearSessionState();
      return { success: false, error: friendlyError(error, 'Não foi possível carregar seu perfil.') };
    }
    if (!data) {
      await supabase.auth.signOut({ scope: 'local' });
      clearSessionState();
      return { success: false, error: 'Este login não está vinculado a um usuário do sistema.' };
    }

    const profile = mapDbUser(data);
    if (profile.status !== 'ativo') {
      await supabase.auth.signOut({ scope: 'local' });
      clearSessionState();
      return { success: false, error: 'Este usuário está BLOQUEADO. Entre em contato com o Superadmin.' };
    }

    setCurrentUser(profile);
    if (data.auth_user_id) saveProfileCache(data.auth_user_id, profile);
    return { success: true };
  }, [clearSessionState]);

  const reloadUsers = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentUserRef.current) return;

    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar usuários:', error.message);
      return;
    }

    const mapped = (data || []).map(mapDbUser);
    setUsers(mapped);

    // Reflete alterações feitas por outro administrador (cargo, nome ou bloqueio)
    const me = currentUserRef.current;
    const fresh = mapped.find((u) => u.id === me?.id);
    if (me && !fresh) {
      // Usuário bloqueado deixa de enxergar a tabela: valida pelo servidor
      const res = await loadProfile();
      if (!res.success) setSessionMessage(res.error || null);
    } else if (fresh) {
      setCurrentUser(fresh);
    }
  }, [loadProfile]);

  // Sessão inicial + escuta de login/logout/expiração
  useEffect(() => {
    clearLegacyAuthStorage();

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let active = true;

    // Offline, a renovação do token pode demorar: não deixa a tela de carregamento esperar
    const sessionCheck: Promise<{ data: { session: unknown } }> = navigator.onLine
      ? Promise.race([
          supabase.auth.getSession() as Promise<{ data: { session: unknown } }>,
          new Promise<{ data: { session: unknown } }>((resolve) =>
            setTimeout(() => resolve({ data: { session: null } }), 6000)
          ),
        ])
      : Promise.resolve({ data: { session: null } });

    sessionCheck.then(async ({ data }) => {
      // Sem internet a sessão salva não consegue ser renovada; ainda assim o aparelho
      // continua conectado à conta (o perfil vem do cache em loadProfile).
      if (data.session || storedAuthUserId()) {
        const res = await loadProfile();
        if (!res.success && active) setSessionMessage(res.error || null);
      }
      if (active) setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Só encerra quando a conta realmente saiu (logout ou acesso revogado no servidor).
      // Falha de renovação por falta de internet não derruba quem está trabalhando offline.
      if (event === 'SIGNED_OUT') {
        clearProfileCache();
        clearSessionState();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, clearSessionState]);

  // Lista de usuários + tempo real somente enquanto houver alguém autenticado
  const currentUserId = currentUser?.id;
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentUserId) return;

    reloadUsers();
    const channel = supabase
      .channel('public:users_auth')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        reloadUsers();
      })
      .subscribe();

    // O tempo real respeita o RLS: um usuário recém-bloqueado não recebe mais eventos.
    // Por isso o status é revalidado periodicamente e ao voltar para a aba.
    const verifyAccess = async () => {
      const res = await loadProfile();
      if (!res.success) setSessionMessage(res.error || null);
    };
    const interval = window.setInterval(verifyAccess, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') verifyAccess();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUserId, reloadUsers, loadProfile]);

  const login = async (usernameInput: string, passwordInput: string): Promise<ActionResult> => {
    setSessionMessage(null);
    const username = normalizeUsername(usernameInput);
    if (!username) return { success: false, error: 'Informe seu nome de usuário.' };
    if (!passwordInput) return { success: false, error: 'Digite sua senha de acesso.' };

    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: NO_DB_ERROR };

    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToLoginEmail(username),
      password: passwordInput,
    });
    if (error) {
      return { success: false, error: friendlyError(error, 'Falha ao autenticar.') };
    }

    const res = await loadProfile();
    if (res.success) {
      supabase.rpc('erp_touch_login').then(({ error: touchErr }) => {
        if (touchErr) console.warn('Não foi possível registrar o último acesso:', touchErr.message);
      });
    }
    return res;
  };

  const logout = async () => {
    const pending = getSyncStatus().pending;
    if (
      hasPendingSync() &&
      !window.confirm(
        `Há ${pending} lançamento(s) deste aparelho ainda não enviados para a nuvem.\n\n` +
          'Se sair agora, eles continuam guardados aqui e serão enviados quando você entrar de novo com internet.\n\nSair mesmo assim?'
      )
    ) {
      return;
    }
    const supabase = getSupabaseClient();
    clearProfileCache();
    clearSessionState();
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    if (supabase) {
      await supabase.auth.signOut({ scope: 'local' });
    }
  };

  /** Executa uma função administrativa no servidor e atualiza a lista. */
  const runAdminRpc = async (fn: string, args: Record<string, unknown>, fallback: string): Promise<ActionResult> => {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: NO_DB_ERROR };
    const { error } = await supabase.rpc(fn, args);
    if (error) return { success: false, error: friendlyError(error, fallback) };
    await reloadUsers();
    return { success: true };
  };

  const createUser = async ({
    username,
    name,
    role,
    password,
  }: {
    username: string;
    name: string;
    role: UserRole;
    password: string;
  }): Promise<ActionResult> => {
    if (!normalizeUsername(username)) return { success: false, error: 'Informe o nome de usuário.' };
    if (!name.trim()) return { success: false, error: 'Informe o nome completo.' };
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return { success: false, error: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` };
    }
    return runAdminRpc(
      'erp_admin_create_user',
      { p_username: normalizeUsername(username), p_name: name.trim(), p_role: role, p_password: password },
      'Erro ao criar usuário.'
    );
  };

  const updateUser = async (id: string, updates: { name: string; role: UserRole }): Promise<ActionResult> => {
    if (!updates.name.trim()) return { success: false, error: 'Informe o nome completo.' };
    return runAdminRpc(
      'erp_admin_update_user',
      { p_id: id, p_name: updates.name.trim(), p_role: updates.role },
      'Erro ao atualizar usuário.'
    );
  };

  const toggleBlockUser = async (id: string): Promise<ActionResult> => {
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };
    return runAdminRpc(
      'erp_admin_set_status',
      { p_id: id, p_status: user.status === 'ativo' ? 'bloqueado' : 'ativo' },
      'Erro ao alterar status.'
    );
  };

  const resetUserPassword = async (id: string, newPassword: string): Promise<ActionResult> => {
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return { success: false, error: `A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.` };
    }
    return runAdminRpc('erp_admin_set_password', { p_id: id, p_password: newPassword }, 'Erro ao redefinir senha.');
  };

  const deleteUser = async (id: string): Promise<ActionResult> => {
    return runAdminRpc('erp_admin_delete_user', { p_id: id }, 'Erro ao excluir usuário.');
  };

  const isAuthenticated = Boolean(currentUser && currentUser.status === 'ativo');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        sessionMessage,
        users,
        login,
        logout,
        createUser,
        updateUser,
        toggleBlockUser,
        resetUserPassword,
        deleteUser,
        reloadUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
