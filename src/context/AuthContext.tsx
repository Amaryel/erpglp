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

const STORAGE_SESSION_KEY = 'erpglp_auth_session_v1';
const STORAGE_USERS_KEY = 'erpglp_auth_users_v1';

// Initial default Superadmin User
const DEFAULT_SUPERADMIN: AppUser = {
  id: 'usr-superadmin-01',
  username: 'amaryel',
  name: 'Amaryel Costa (Superadmin)',
  role: 'superadmin',
  status: 'ativo',
  hasDefinedPassword: false,
  createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      return saved ? JSON.parse(saved) : [DEFAULT_SUPERADMIN];
    } catch {
      return [DEFAULT_SUPERADMIN];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync users from Supabase or localStorage
  const reloadUsers = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          const mappedUsers = data.map(mapDbUser);
          setUsers(mappedUsers);
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(mappedUsers));

          // If current user was updated/blocked in database, update local session
          if (currentUser) {
            const freshCurrentUser = mappedUsers.find((u) => u.id === currentUser.id);
            if (freshCurrentUser) {
              if (freshCurrentUser.status === 'bloqueado') {
                setCurrentUser(null);
                localStorage.removeItem(STORAGE_SESSION_KEY);
              } else {
                setCurrentUser(freshCurrentUser);
                localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(freshCurrentUser));
              }
            }
          }
          return;
        } else if (!error && data && data.length === 0) {
          // If table exists but is empty, seed default superadmin
          await supabase.from('users').insert(mapUserToDb(DEFAULT_SUPERADMIN));
        }
      } catch (err) {
        console.error('Error fetching users from Supabase:', err);
      }
    }
  }, [currentUser]);

  // Initial load
  useEffect(() => {
    reloadUsers().finally(() => setIsLoading(false));

    // Listen to real-time user changes (e.g. if superadmin blocks a user on another device)
    const supabase = getSupabaseClient();
    if (supabase) {
      const userChannel = supabase
        .channel('public:users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
          reloadUsers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(userChannel);
      };
    }
  }, [reloadUsers]);

  // Save users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users to localStorage:', e);
    }
  }, [users]);

  // Login handler
  const login = async (
    usernameInput: string,
    passwordInput?: string
  ): Promise<{ success: boolean; requiresPasswordSetup?: boolean; error?: string }> => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, error: 'Por favor, informe seu nome de usuário.' };
    }

    // Refresh user list first
    await reloadUsers();

    // Find user (case-insensitive)
    let user = users.find((u) => u.username.toLowerCase() === cleanUsername);

    // If superadmin doesn't exist locally or on DB yet, fallback to default
    if (!user && cleanUsername === 'amaryel') {
      user = DEFAULT_SUPERADMIN;
    }

    if (!user) {
      return { success: false, error: 'Usuário não encontrado. Verifique os dados digitados.' };
    }

    // Check if user is blocked
    if (user.status === 'bloqueado') {
      return {
        success: false,
        error: 'Este usuário está BLOQUEADO. Entre em contato com o superadministrador.',
      };
    }

    // Check first access password definition
    if (!user.hasDefinedPassword || !user.passwordHash) {
      return {
        success: false,
        requiresPasswordSetup: true,
        error: 'Primeiro acesso detectado. Defina sua senha de acesso agora.',
      };
    }

    // Verify password
    if (!passwordInput) {
      return { success: false, error: 'Por favor, digite sua senha.' };
    }

    const isValid = await verifyPassword(passwordInput, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Senha incorreta. Tente novamente.' };
    }

    // Login successful
    const updatedUser: AppUser = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));

    // Update in users list & database
    setUsers((prev) => prev.map((u) => (u.id === user?.id ? updatedUser : u)));
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('users').update({ last_login_at: updatedUser.lastLoginAt }).eq('id', user.id).then();
    }

    return { success: true };
  };

  // Define Password for First Access (e.g. Superadmin or new user)
  const defineFirstAccessPassword = async (
    usernameInput: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, error: 'Usuário não informado.' };
    }
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'A senha deve ter pelo menos 4 caracteres.' };
    }

    let user = users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (!user && cleanUsername === 'amaryel') {
      user = DEFAULT_SUPERADMIN;
    }

    if (!user) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    const passwordHash = await hashPassword(newPassword);
    const updatedUser: AppUser = {
      ...user,
      passwordHash,
      hasDefinedPassword: true,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => {
      const exists = prev.some((u) => u.id === updatedUser.id);
      if (exists) {
        return prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      }
      return [...prev, updatedUser];
    });

    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('users').upsert(mapUserToDb(updatedUser));
    }

    return { success: true };
  };

  // Logout handler
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_SESSION_KEY);
  };

  // Create new user (by Superadmin or Admin)
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
      return { success: false, error: 'Este nome de usuário já está em uso.' };
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

    setUsers((prev) => [...prev, newUser]);
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('users').insert(mapUserToDb(newUser));
    }

    return { success: true };
  };

  // Update existing user
  const updateUser = async (
    id: string,
    updates: Partial<AppUser>
  ): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };

    // Prevent changing superadmin username or role
    if (user.role === 'superadmin' && (updates.role && updates.role !== 'superadmin')) {
      return { success: false, error: 'Não é permitido alterar o nível do superadmin.' };
    }

    const updatedUser: AppUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
    if (currentUser?.id === id) {
      setCurrentUser(updatedUser);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('users').upsert(mapUserToDb(updatedUser));
    }

    return { success: true };
  };

  // Toggle user block / unblock
  const toggleBlockUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };

    // Superadmin cannot be blocked
    if (user.role === 'superadmin') {
      return { success: false, error: 'O Superadmin amaryel não pode ser bloqueado.' };
    }

    const newStatus: UserStatus = user.status === 'ativo' ? 'bloqueado' : 'ativo';
    const updatedUser: AppUser = {
      ...user,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));

    // If currently logged in user is the one blocked, log them out
    if (currentUser?.id === id && newStatus === 'bloqueado') {
      setCurrentUser(null);
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('users').update({ status: newStatus, updated_at: updatedUser.updatedAt }).eq('id', id);
    }

    return { success: true };
  };

  // Reset password for a user
  const resetUserPassword = async (
    id: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'A senha deve ter no mínimo 4 caracteres.' };
    }

    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };

    const passwordHash = await hashPassword(newPassword);
    const updatedUser: AppUser = {
      ...user,
      passwordHash,
      hasDefinedPassword: true,
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
    if (currentUser?.id === id) {
      setCurrentUser(updatedUser);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedUser));
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          has_defined_password: true,
          updated_at: updatedUser.updatedAt,
        })
        .eq('id', id);
    }

    return { success: true };
  };

  // Delete a user
  const deleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === id);
    if (!user) return { success: false, error: 'Usuário não encontrado.' };

    if (user.role === 'superadmin') {
      return { success: false, error: 'O usuário superadmin principal não pode ser excluído.' };
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('users').delete().eq('id', id);
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
