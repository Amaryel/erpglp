import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppUser, UserRole, UserStatus } from '../types';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { getSupabaseClient, mapDbUser, mapUserToDb } from '../lib/supabase';

interface AuthContextType {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  users: AppUser[];
  login: (username: string, password?: string) => Promise<{ success: boolean; requiresPasswordSetup?: boolean; error?: string }>;
  defineFirstAccessPassword: (username: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (userData: { username: string; name: string; role: UserRole; password?: string }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, updates: Partial<AppUser>) => Promise<{ success: boolean; error?: string }>;
  toggleBlockUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (id: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  reloadUsers: () => Promise<void>;
}

const STORAGE_SESSION_KEY = 'erpglp_auth_session_v2';
const STORAGE_USERS_KEY = 'erpglp_auth_users_v2';

// Usuário padrão inicial Superadmin (nome de usuário amaryel)
export const DEFAULT_SUPERADMIN: AppUser = {
  id: 'usr-superadmin-01',
  username: 'amaryel',
  name: 'Amaryel Costa (Superadmin)',
  role: 'superadmin',
  status: 'ativo',
  hasDefinedPassword: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.username && parsed.status === 'ativo') {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return [DEFAULT_SUPERADMIN];
    } catch {
      return [DEFAULT_SUPERADMIN];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Carrega e sincroniza usuários diretamente do Supabase Online
  const reloadUsers = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        if (data.length > 0) {
          const mappedUsers = data.map(mapDbUser);
          setUsers(mappedUsers);
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(mappedUsers));

          // Se o usuário logado atualmente sofreu alteração no banco (ex: bloqueado por superadmin)
          const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
          if (savedSession) {
            try {
              const parsedSession = JSON.parse(savedSession);
              const freshCurrentUser = mappedUsers.find((u) => u.id === parsedSession.id);
              if (freshCurrentUser) {
                if (freshCurrentUser.status === 'bloqueado') {
                  setCurrentUser(null);
                  localStorage.removeItem(STORAGE_SESSION_KEY);
                } else {
                  setCurrentUser(freshCurrentUser);
                  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(freshCurrentUser));
                }
              }
            } catch {
              // Ignore parse error
            }
          }
        } else {
          // Se a tabela existe mas está vazia, insere o superadmin padrão
          const { error: insertErr } = await supabase
            .from('users')
            .insert(mapUserToDb(DEFAULT_SUPERADMIN));
          if (!insertErr) {
            setUsers([DEFAULT_SUPERADMIN]);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar usuários do Supabase:', err);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    reloadUsers().finally(() => setIsLoading(false));

    // Realtime Supabase: sincroniza usuários entre todos os dispositivos instantaneamente
    const supabase = getSupabaseClient();
    if (supabase) {
      const userChannel = supabase
        .channel('public:users_auth')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
          reloadUsers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(userChannel);
      };
    }
  }, [reloadUsers]);

  // Login com validação direta online no Supabase
  const login = async (
    usernameInput: string,
    passwordInput?: string
  ): Promise<{ success: boolean; requiresPasswordSetup?: boolean; error?: string }> => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, error: 'Por favor, informe seu nome de usuário.' };
    }

    const supabase = getSupabaseClient();
    let userRow: any = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (!error && data) {
          userRow = data;
        }
      } catch (err) {
        console.error('Erro ao consultar usuário no Supabase:', err);
      }
    }

    // Se não encontrou no Supabase, tenta buscar na lista local
    let user: AppUser | undefined = userRow ? mapDbUser(userRow) : users.find((u) => u.username.toLowerCase() === cleanUsername);

    // Fallback: Se for amaryel e ainda não existir registro no Supabase
    if (!user && cleanUsername === 'amaryel') {
      user = DEFAULT_SUPERADMIN;
    }

    if (!user) {
      return { success: false, error: 'Usuário não encontrado no sistema. Verifique os dados digitados.' };
    }

    // 1. Validação de bloqueio
    if (user.status === 'bloqueado') {
      return {
        success: false,
        error: 'Este usuário está BLOQUEADO. Entre em contato com o superadministrador.',
      };
    }

    // 2. Primeiro Acesso: Senha ainda não definida
    if (!user.hasDefinedPassword || !user.passwordHash) {
      return {
        success: false,
        requiresPasswordSetup: true,
        error: 'Primeiro acesso detectado. Por favor, defina sua senha de segurança.',
      };
    }

    // 3. Usuário já tem senha definida -> A senha é estritamente OBRIGATÓRIA
    if (!passwordInput || !passwordInput.trim()) {
      return { success: false, error: 'Por favor, digite sua senha de acesso.' };
    }

    // Validação criptográfica do hash SHA-256
    const isValid = await verifyPassword(passwordInput, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Senha incorreta. Verifique e tente novamente.' };
    }

    // Login autorizado com sucesso
    const updatedUser: AppUser = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));

    // Atualiza data de último login no Supabase
    if (supabase) {
      supabase
        .from('users')
        .update({ last_login_at: updatedUser.lastLoginAt })
        .eq('id', user.id)
        .then();
    }

    return { success: true };
  };

  // Define a senha de primeiro acesso e grava no Supabase Online
  const defineFirstAccessPassword = async (
    usernameInput: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, error: 'Usuário não informado.' };
    }
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    const supabase = getSupabaseClient();

    // Consulta direta no Supabase para garantir que ninguém definiu a senha em outro navegador
    let existingDbUser: any = null;
    if (supabase) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('username', cleanUsername)
        .maybeSingle();
      existingDbUser = data;
    }

    // Trava de segurança: se a senha já foi definida no banco, impede sobrescrita
    if (existingDbUser && existingDbUser.has_defined_password && existingDbUser.password_hash) {
      return {
        success: false,
        error: 'A senha deste usuário já foi definida anteriormente no banco online. Faça login normal com sua senha.',
      };
    }

    const passwordHash = await hashPassword(newPassword);
    const userId = existingDbUser?.id || (cleanUsername === 'amaryel' ? DEFAULT_SUPERADMIN.id : `usr-${Date.now()}`);
    const userName = existingDbUser?.name || (cleanUsername === 'amaryel' ? DEFAULT_SUPERADMIN.name : cleanUsername);
    const userRole = existingDbUser?.role || (cleanUsername === 'amaryel' ? 'superadmin' : 'operador');

    const updatedUser: AppUser = {
      id: userId,
      username: cleanUsername,
      name: userName,
      role: userRole,
      status: 'ativo',
      passwordHash,
      hasDefinedPassword: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: existingDbUser?.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Grava diretamente no Supabase Online
    if (supabase) {
      const dbPayload = mapUserToDb(updatedUser);
      const { error: upsertErr } = await supabase
        .from('users')
        .upsert(dbPayload, { onConflict: 'username' });

      if (upsertErr) {
        console.error('Erro ao gravar senha no Supabase:', upsertErr);
        return {
          success: false,
          error: `Erro ao salvar senha no Supabase: ${upsertErr.message}. Certifique-se de que executou o script SQL das tabelas no Supabase.`,
        };
      }
    }

    // Atualiza estado local e sessão
    setUsers((prev) => {
      const exists = prev.some((u) => u.username.toLowerCase() === cleanUsername);
      if (exists) {
        return prev.map((u) => (u.username.toLowerCase() === cleanUsername ? updatedUser : u));
      }
      return [...prev, updatedUser];
    });

    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([...users.filter((u) => u.id !== updatedUser.id), updatedUser]));

    return { success: true };
  };

  // Logout
  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      localStorage.removeItem('erpglp_auth_session_v1');
      sessionStorage.clear();
    } catch (e) {
      console.error('Error clearing session:', e);
    }
  };

  // Criar novo usuário (Superadmin ou Admin)
  const createUser = async ({
    username,
    name,
    role,
    password,
  }: {
    username: string;
    name: string;
    role: UserRole;
    password?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) return { success: false, error: 'Informe o nome de usuário.' };
    if (!name.trim()) return { success: false, error: 'Informe o nome completo.' };

    const exists = users.some((u) => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      return { success: false, error: 'Este nome de usuário já está cadastrado no sistema.' };
    }

    let passwordHash: string | undefined = undefined;
    let hasDefinedPassword = false;

    if (password && password.trim().length >= 4) {
      passwordHash = await hashPassword(password.trim());
      hasDefinedPassword = true;
    }

    const newUser: AppUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      username: cleanUsername,
      name: name.trim(),
      role,
      status: 'ativo',
      passwordHash,
      hasDefinedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('users').insert(mapUserToDb(newUser));
      if (error) {
        return { success: false, error: `Erro no Supabase: ${error.message}` };
      }
    }

    setUsers((prev) => [...prev, newUser]);
    return { success: true };
  };

  // Atualizar usuário
  const updateUser = async (
    id: string,
    updates: Partial<AppUser>
  ): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };

    const updatedUser: AppUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('users')
        .update(mapUserToDb(updatedUser))
        .eq('id', id);

      if (error) {
        return { success: false, error: `Erro ao atualizar no Supabase: ${error.message}` };
      }
    }

    setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
    if (currentUser?.id === id) {
      setCurrentUser(updatedUser);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));
    }

    return { success: true };
  };

  // Bloquear / Desbloquear usuário (Superadmin)
  const toggleBlockUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };

    // Proteção absoluta: O superadmin amaryel NUNCA pode ser bloqueado
    if (user.username.toLowerCase() === 'amaryel' || user.role === 'superadmin') {
      return {
        success: false,
        error: 'O usuário superadmin (amaryel) possui proteção de segurança e não pode ser bloqueado.',
      };
    }

    const newStatus: UserStatus = user.status === 'ativo' ? 'bloqueado' : 'ativo';
    return updateUser(id, { status: newStatus });
  };

  // Redefinir senha de um usuário
  const resetUserPassword = async (
    id: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres.' };
    }

    const passwordHash = await hashPassword(newPassword);
    return updateUser(id, {
      passwordHash,
      hasDefinedPassword: true,
    });
  };

  // Excluir usuário
  const deleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };

    // Proteção: O superadmin não pode ser excluído
    if (user.username.toLowerCase() === 'amaryel' || user.role === 'superadmin') {
      return { success: false, error: 'O usuário superadmin principal não pode ser excluído.' };
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) {
        return { success: false, error: `Erro ao excluir no Supabase: ${error.message}` };
      }
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
    return { success: true };
  };

  const isAuthenticated = Boolean(currentUser && currentUser.status === 'ativo');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        users,
        login,
        defineFirstAccessPassword,
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
