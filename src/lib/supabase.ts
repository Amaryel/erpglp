import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Product,
  StockItem,
  StockMovement,
  StockAdjustment,
  Client,
  DeliveryPerson,
  Supplier,
  Sale,
  AccountReceivable,
  CashRegister,
  CashMovement,
  Expense,
  AccountPayable,
  AuditLog,
  StockConference,
  CashConference,
  AppSettings,
  AppUser,
} from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

// Configuração definitiva do Supabase para acesso online contínuo em qualquer dispositivo
export const EMBEDDED_SUPABASE_URL = 'https://vywafdtbjdcthwooyoqz.supabase.co';
export const EMBEDDED_SUPABASE_ANON_KEY = 'sb_publishable_rkAdGls-vJtdoboVBSyu6Q_EWa7YIUs';

const STORAGE_SUPABASE_KEY = 'erpglp_supabase_config_v1';

// O Supabase Auth trabalha com e-mail; o operador digita apenas o nome de usuário.
// Deve ser igual ao domínio usado em public.erp_login_email() no supabase/schema.sql.
export const LOGIN_EMAIL_DOMAIN = 'erpglp.app';

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function usernameToLoginEmail(username: string): string {
  return `${normalizeUsername(username)}@${LOGIN_EMAIL_DOMAIN}`;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = (metaEnv.VITE_SUPABASE_URL as string) || '';
  const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY as string) || '';

  let activeUrl = (envUrl || EMBEDDED_SUPABASE_URL).replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '').trim();
  let activeKey = (envKey || EMBEDDED_SUPABASE_ANON_KEY).trim();

  try {
    const saved = localStorage.getItem(STORAGE_SUPABASE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey && typeof parsed.url === 'string' && typeof parsed.anonKey === 'string') {
        const savedCleanUrl = parsed.url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '').trim();
        if (savedCleanUrl.startsWith('http')) {
          activeUrl = savedCleanUrl;
          activeKey = parsed.anonKey.trim();
        }
      }
    }
  } catch (e) {
    console.error('Error reading Supabase credentials from storage:', e);
  }

  return {
    url: activeUrl,
    anonKey: activeKey,
    isConfigured: Boolean(activeUrl && activeKey),
  };
}

/**
 * Impede que uma chave secreta (service_role / sb_secret_) seja salva no navegador:
 * ela ignora todas as regras de segurança do banco.
 */
export function getSupabaseKeyProblem(key: string): string | null {
  const clean = key.trim();
  if (!clean) return 'Informe a chave pública (anon / publishable) do Supabase.';
  if (clean.startsWith('sb_secret_')) {
    return 'Esta é uma chave SECRETA. Use apenas a chave pública (anon / publishable) no aplicativo.';
  }
  const parts = clean.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload?.role === 'service_role') {
        return 'Esta é a chave service_role (secreta). Use apenas a chave pública (anon) no aplicativo.';
      }
    } catch {
      // Não é um JWT legível: segue para o teste de conexão
    }
  }
  return null;
}

export function saveStoredSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '').trim();
  try {
    localStorage.setItem(
      STORAGE_SUPABASE_KEY,
      JSON.stringify({ url: cleanUrl, anonKey: anonKey.trim() })
    );
    cachedClient = null;
  } catch (e) {
    console.error('Error saving Supabase credentials to storage:', e);
  }
}

export function clearStoredSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_SUPABASE_KEY);
    cachedClient = null;
  } catch (e) {
    console.error('Error clearing Supabase credentials:', e);
  }
}

let cachedClient: SupabaseClient | null = null;
let lastClientKey: string = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.isConfigured || !config.url || !config.anonKey) {
    return null;
  }

  const keySignature = `${config.url}::${config.anonKey}`;
  if (cachedClient && lastClientKey === keySignature) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    lastClientKey = keySignature;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const config = getStoredSupabaseConfig();
  const url = customUrl || config.url;
  const anonKey = customKey || config.anonKey;

  if (!url || !anonKey) {
    return {
      success: false,
      message: 'Chave Anon ou URL do Supabase não configurados.',
    };
  }

  const startTime = Date.now();

  try {
    // Usa o cliente autenticado quando o teste é da conexão atual (RLS exige login)
    const isCurrent = url === config.url && anonKey === config.anonKey;
    const testClient = isCurrent
      ? getSupabaseClient() || createClient(url, anonKey, { auth: { persistSession: false } })
      : createClient(url, anonKey, { auth: { persistSession: false } });

    const { error: userError } = await testClient.from('app_settings').select('id').limit(1);

    const latencyMs = Date.now() - startTime;

    // Sem login, o banco protegido recusa a leitura: isso confirma que a URL/chave são válidas
    if (userError && (userError.code === '42501' || /permission denied/i.test(userError.message))) {
      return {
        success: true,
        message: 'Conexão estabelecida. O banco está protegido: os dados só são liberados após o login.',
        latencyMs,
      };
    }

    if (userError) {
      // If table does not exist
      if (userError.code === '42P01' || userError.message.includes('relation') || userError.message.includes('does not exist')) {
        return {
          success: false,
          message: 'Conectado ao Supabase! Porém as tabelas ainda não foram criadas. Execute o script SQL no SQL Editor do Supabase.',
          latencyMs,
        };
      }

      if (userError.code === 'PGRST301' || userError.message.includes('JWT') || userError.message.includes('apikey')) {
        return {
          success: false,
          message: 'Chave Anon ou URL inválida. Verifique as credenciais no painel do Supabase.',
        };
      }

      return {
        success: false,
        message: `Aviso na conexão: ${userError.message}`,
        latencyMs,
      };
    }

    return {
      success: true,
      message: 'Conexão com o Supabase online estabelecida com sucesso! Tabelas ativas e operacionais.',
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na conexão: ${err?.message || 'Verifique sua conexão com a internet.'}`,
    };
  }
}

// Script SQL completo e seguro (tabelas + RLS + funções de usuário), exibido no painel
// para o Superadmin copiar. Mantenha igual ao arquivo supabase/schema.sql.
export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- ERP GLP - SCRIPT SQL COMPLETO E SEGURO PARA O SUPABASE
-- Execute no "SQL Editor" do Supabase. É idempotente: pode rodar em um banco novo
-- ou em um banco que já usa a versão antiga (ele migra e fecha o acesso público).
--
-- Modelo de segurança:
--   * Login feito pelo Supabase Auth (senha com bcrypt no servidor).
--   * A chave pública (anon/publishable) NÃO lê nem grava nenhuma tabela.
--   * Só usuários ativos e autenticados acessam os dados (RLS).
--   * Gestão de usuários apenas via funções no servidor, com regras por perfil.
--
-- DEPOIS DE EXECUTAR, defina a senha do superadmin (troque a senha abaixo):
--   SELECT public.erp_bootstrap_superadmin('amaryel', 'Amaryel Costa (Superadmin)', 'SUA-SENHA-FORTE-AQUI');
-- ==============================================================================

-- 1. Tabela de Configurações da Empresa
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT NOT NULL DEFAULT 'ErpGLP Distribuidora e Revenda de Gás Ltda',
  trading_name TEXT NOT NULL DEFAULT 'ErpGLP Gás & Água',
  cnpj TEXT DEFAULT '12.345.678/0001-90',
  phone TEXT DEFAULT '(11) 98765-4321',
  address TEXT DEFAULT 'Av. das Nações, 1500',
  neighborhood TEXT DEFAULT 'Centro',
  city TEXT DEFAULT 'São Paulo - SP',
  pix_key TEXT DEFAULT 'financeiro@erpglp.com.br',
  default_min_stock NUMERIC DEFAULT 20,
  delivery_fee NUMERIC DEFAULT 0,
  delivery_time_minutes INTEGER DEFAULT 30,
  receipt_footer_message TEXT DEFAULT 'Agradecemos a sua preferência! ErpGLP - Qualidade, Segurança e Rapidez.',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Produtos & Vasilhames
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  min_stock NUMERIC DEFAULT 0,
  description TEXT,
  unit TEXT DEFAULT 'UN',
  is_active BOOLEAN DEFAULT true,
  is_cylinder BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Estoque Atual (Cheios / Vazios)
CREATE TABLE IF NOT EXISTS public.stock (
  product_id TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  full_quantity NUMERIC NOT NULL DEFAULT 0,
  empty_quantity NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  stock_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  type TEXT NOT NULL,
  origin TEXT NOT NULL,
  related_sale_id TEXT,
  notes TEXT,
  previous_qty NUMERIC DEFAULT 0,
  new_qty NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Ajustes Manuais de Estoque
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  previous_full NUMERIC DEFAULT 0,
  new_full NUMERIC DEFAULT 0,
  diff_full NUMERIC DEFAULT 0,
  previous_empty NUMERIC DEFAULT 0,
  new_empty NUMERIC DEFAULT 0,
  diff_empty NUMERIC DEFAULT 0,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  neighborhood TEXT,
  reference TEXT,
  document TEXT,
  credit_limit NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Entregadores
CREATE TABLE IF NOT EXISTS public.delivery_persons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  vehicle TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela de Vendas (Balcão & Delivery)
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  sale_number BIGINT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  client_id TEXT,
  client_name TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_neighborhood TEXT,
  delivery_person_id TEXT,
  delivery_person_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  gross_profit NUMERIC NOT NULL DEFAULT 0,
  profit_margin NUMERIC NOT NULL DEFAULT 0,
  dispatched_cylinders NUMERIC DEFAULT 0,
  returned_cylinders NUMERIC DEFAULT 0,
  payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  paid_amount NUMERIC DEFAULT 0,
  fiado_amount NUMERIC DEFAULT 0,
  notes TEXT,
  cancellation_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela de Contas a Receber (Fiados)
CREATE TABLE IF NOT EXISTS public.receivables (
  id TEXT PRIMARY KEY,
  sale_id TEXT,
  sale_number BIGINT,
  client_id TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'aberto',
  payment_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabela de Caixas
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id TEXT PRIMARY KEY,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto',
  physical_counted NUMERIC,
  difference NUMERIC,
  close_notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Tabela de Movimentações de Caixa
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id TEXT PRIMARY KEY,
  cash_register_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT,
  payment_method TEXT,
  description TEXT NOT NULL,
  related_sale_id TEXT,
  related_receivable_id TEXT,
  related_expense_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Tabela de Despesas & Saídas
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT,
  payment_method TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  paid_from_cash BOOLEAN DEFAULT false,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Tabela de Contas a Pagar
CREATE TABLE IF NOT EXISTS public.payables (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  supplier_id TEXT,
  supplier_name TEXT,
  supplier TEXT,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Tabela de Auditoria e Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  details JSONB,
  sale_id TEXT,
  product_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Tabela de Conferência de Estoque
CREATE TABLE IF NOT EXISTS public.stock_conferences (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  system_full NUMERIC DEFAULT 0,
  physical_full NUMERIC DEFAULT 0,
  diff_full NUMERIC DEFAULT 0,
  system_empty NUMERIC DEFAULT 0,
  physical_empty NUMERIC DEFAULT 0,
  diff_empty NUMERIC DEFAULT 0,
  reason TEXT,
  adjusted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Tabela de Conferência de Caixa
CREATE TABLE IF NOT EXISTS public.cash_conferences (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  expected_balance NUMERIC DEFAULT 0,
  physical_counted NUMERIC DEFAULT 0,
  difference NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Tabela de Usuários do Sistema & Superadmin
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operador',
  status TEXT NOT NULL DEFAULT 'ativo',
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  has_defined_password BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 19. MIGRAÇÃO DE BANCOS ANTIGOS
-- ==============================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Os hashes antigos (SHA-256 gerado no navegador, sal fixo) estavam expostos publicamente
-- e não são compatíveis com o Supabase Auth: são apagados e a senha precisa ser redefinida.
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
UPDATE public.users SET has_defined_password = false WHERE auth_user_id IS NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin', 'admin', 'operador', 'entregador')) NOT VALID;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_status_check
  CHECK (status IN ('ativo', 'bloqueado')) NOT VALID;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_username_check;
ALTER TABLE public.users ADD CONSTRAINT users_username_check
  CHECK (username ~ '^[a-z0-9._-]{3,32}$') NOT VALID;

-- Rastreabilidade: quem gerou cada registro de auditoria (preenchido pelo servidor)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

-- ==============================================================================
-- 20. FUNÇÕES DE AUTORIZAÇÃO (usadas pelas políticas RLS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.erp_current_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT u.role FROM public.users u
  WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.erp_is_active()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.erp_current_role() IS NOT NULL $$;

CREATE OR REPLACE FUNCTION public.erp_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT COALESCE(public.erp_current_role() IN ('admin', 'superadmin'), false) $$;

CREATE OR REPLACE FUNCTION public.erp_is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT COALESCE(public.erp_current_role() = 'superadmin', false) $$;

-- E-mail técnico usado pelo Supabase Auth (o usuário digita apenas o nome de usuário).
-- Deve ser igual ao LOGIN_EMAIL_DOMAIN em src/lib/supabase.ts
CREATE OR REPLACE FUNCTION public.erp_login_email(p_username TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$ SELECT lower(trim(p_username)) || '@erpglp.app' $$;

-- ==============================================================================
-- 21. FUNÇÃO INTERNA: cria/atualiza a credencial no Supabase Auth (bcrypt)
-- Não pode ser chamada pelo app diretamente.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.erp__set_auth_password(p_user_id TEXT, p_password TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_auth UUID;
  v_email TEXT;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'A senha deve ter no mínimo 8 caracteres.' USING ERRCODE = '22023';
  END IF;

  v_email := public.erp_login_email(v_user.username);

  v_auth := v_user.auth_user_id;
  IF v_auth IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth) THEN
    SELECT id INTO v_auth FROM auth.users WHERE email = v_email LIMIT 1;
  END IF;

  IF v_auth IS NOT NULL THEN
    UPDATE auth.users
       SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           email = v_email,
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           banned_until = NULL,
           updated_at = now()
     WHERE id = v_auth;
    -- Encerra sessões abertas com a senha anterior
    DELETE FROM auth.sessions WHERE user_id = v_auth;
  ELSE
    v_auth := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_auth, 'authenticated', 'authenticated',
      v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', v_user.username, 'name', v_user.name),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_auth, v_auth::text, 'email',
      jsonb_build_object('sub', v_auth::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );
  END IF;

  UPDATE public.users
     SET auth_user_id = v_auth, has_defined_password = true, updated_at = now()
   WHERE id = p_user_id;

  RETURN v_auth;
END;
$$;

-- ==============================================================================
-- 22. FUNÇÕES CHAMADAS PELO APP (cada uma valida o perfil de quem chama)
-- ==============================================================================

-- Perfil do usuário logado (inclusive se estiver bloqueado, para exibir a mensagem correta)
CREATE OR REPLACE FUNCTION public.erp_me()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT to_jsonb(u) FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.erp_touch_login()
RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  UPDATE public.users SET last_login_at = now()
  WHERE auth_user_id = auth.uid() AND status = 'ativo'
$$;

CREATE OR REPLACE FUNCTION public.erp_admin_create_user(
  p_username TEXT, p_name TEXT, p_role TEXT, p_password TEXT
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_caller TEXT := public.erp_current_role();
  v_username TEXT := lower(trim(COALESCE(p_username, '')));
  v_name TEXT := trim(COALESCE(p_name, ''));
  v_id TEXT;
BEGIN
  IF v_caller IS NULL OR v_caller NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem cadastrar usuários.' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('superadmin', 'admin', 'operador', 'entregador') THEN
    RAISE EXCEPTION 'Nível de acesso inválido.' USING ERRCODE = '22023';
  END IF;
  IF p_role = 'superadmin' AND v_caller <> 'superadmin' THEN
    RAISE EXCEPTION 'Apenas o Superadmin pode criar usuários Superadmin.' USING ERRCODE = '42501';
  END IF;
  IF v_username !~ '^[a-z0-9._-]{3,32}$' THEN
    RAISE EXCEPTION 'Usuário inválido: use de 3 a 32 caracteres (letras minúsculas, números, ponto, hífen ou sublinhado).' USING ERRCODE = '22023';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Informe o nome completo.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE username = v_username) THEN
    RAISE EXCEPTION 'Este nome de usuário já está cadastrado.' USING ERRCODE = '23505';
  END IF;
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'A senha deve ter no mínimo 8 caracteres.' USING ERRCODE = '22023';
  END IF;

  v_id := 'usr-' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.users (id, username, name, role, status, has_defined_password, created_at, updated_at)
  VALUES (v_id, v_username, v_name, p_role, 'ativo', false, now(), now());

  PERFORM public.erp__set_auth_password(v_id, p_password);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_admin_update_user(p_id TEXT, p_name TEXT, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_caller TEXT := public.erp_current_role();
  v_target public.users%ROWTYPE;
  v_name TEXT := trim(COALESCE(p_name, ''));
BEGIN
  IF v_caller IS NULL OR v_caller NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target FROM public.users WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_target.role = 'superadmin' AND v_caller <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Superadmin pode alterar um Superadmin.' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('superadmin', 'admin', 'operador', 'entregador') THEN
    RAISE EXCEPTION 'Nível de acesso inválido.' USING ERRCODE = '22023';
  END IF;
  IF p_role = 'superadmin' AND v_caller <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Superadmin pode conceder o cargo de Superadmin.' USING ERRCODE = '42501';
  END IF;
  IF v_target.auth_user_id = auth.uid() AND p_role <> v_target.role THEN
    RAISE EXCEPTION 'Você não pode alterar o seu próprio nível de acesso.' USING ERRCODE = '42501';
  END IF;
  IF v_name = '' THEN
    RAISE EXCEPTION 'Informe o nome completo.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.users SET name = v_name, role = p_role, updated_at = now() WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_admin_set_status(p_id TEXT, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_target public.users%ROWTYPE;
BEGIN
  IF NOT public.erp_is_superadmin() THEN
    RAISE EXCEPTION 'Apenas o Superadmin pode bloquear ou desbloquear usuários.' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('ativo', 'bloqueado') THEN
    RAISE EXCEPTION 'Status inválido.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_target FROM public.users WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_target.role = 'superadmin' THEN
    RAISE EXCEPTION 'Usuários Superadmin não podem ser bloqueados.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.users SET status = p_status, updated_at = now() WHERE id = p_id;
  IF p_status = 'bloqueado' AND v_target.auth_user_id IS NOT NULL THEN
    DELETE FROM auth.sessions WHERE user_id = v_target.auth_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_admin_set_password(p_id TEXT, p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_caller TEXT := public.erp_current_role();
  v_target public.users%ROWTYPE;
BEGIN
  IF v_caller IS NULL OR v_caller NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target FROM public.users WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_target.role = 'superadmin' AND v_caller <> 'superadmin' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Superadmin pode redefinir a senha de um Superadmin.' USING ERRCODE = '42501';
  END IF;
  PERFORM public.erp__set_auth_password(p_id, p_password);
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_admin_delete_user(p_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_target public.users%ROWTYPE;
BEGIN
  IF NOT public.erp_is_superadmin() THEN
    RAISE EXCEPTION 'Apenas o Superadmin pode excluir usuários.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target FROM public.users WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_target.role = 'superadmin' THEN
    RAISE EXCEPTION 'Usuários Superadmin não podem ser excluídos.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.users WHERE id = p_id;
  IF v_target.auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_target.auth_user_id;
  END IF;
END;
$$;

-- Executada somente no SQL Editor (dono do banco) para criar/recuperar o Superadmin
CREATE OR REPLACE FUNCTION public.erp_bootstrap_superadmin(p_username TEXT, p_name TEXT, p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_username TEXT := lower(trim(p_username));
  v_id TEXT;
BEGIN
  IF p_password IS NULL OR length(p_password) < 10 THEN
    RAISE EXCEPTION 'Use uma senha de no mínimo 10 caracteres para o Superadmin.' USING ERRCODE = '22023';
  END IF;
  IF lower(p_password) LIKE '%sua-senha%' THEN
    RAISE EXCEPTION 'Troque a senha de exemplo por uma senha sua.' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_id FROM public.users WHERE username = v_username;
  IF v_id IS NULL THEN
    v_id := 'usr-' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.users (id, username, name, role, status, has_defined_password)
    VALUES (v_id, v_username, trim(p_name), 'superadmin', 'ativo', false);
  ELSE
    UPDATE public.users SET role = 'superadmin', status = 'ativo', updated_at = now() WHERE id = v_id;
  END IF;

  PERFORM public.erp__set_auth_password(v_id, p_password);
  RETURN v_id;
END;
$$;

-- Permissões de execução das funções
REVOKE ALL ON FUNCTION public.erp_current_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_is_active() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_is_superadmin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_me() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_touch_login() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_admin_create_user(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_admin_update_user(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_admin_set_status(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_admin_set_password(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_admin_delete_user(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp__set_auth_password(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_bootstrap_superadmin(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.erp_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_me() TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_touch_login() TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_admin_update_user(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_admin_set_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_admin_set_password(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_admin_delete_user(TEXT) TO authenticated;

-- ==============================================================================
-- 23. PERMISSÕES DAS TABELAS + ROW LEVEL SECURITY
-- ==============================================================================
-- Remove o acesso total concedido pela versão antiga (inclusive TRUNCATE, que ignora RLS)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
  all_tables TEXT[] := ARRAY[
    'app_settings', 'products', 'stock', 'stock_movements', 'stock_adjustments',
    'clients', 'delivery_persons', 'suppliers', 'sales', 'receivables',
    'cash_registers', 'cash_movements', 'expenses', 'payables', 'audit_logs',
    'stock_conferences', 'cash_conferences', 'users'
  ];
  -- Operação do dia a dia: qualquer usuário ativo lê, cria, altera e exclui
  daily_tables TEXT[] := ARRAY['products', 'stock', 'expenses', 'payables', 'cash_movements'];
  -- Cadastros: usuário ativo cria/altera; exclusão só administradores
  admin_delete_tables TEXT[] := ARRAY['clients', 'delivery_persons', 'suppliers'];
  -- Histórico financeiro/estoque: usuário ativo cria/altera; exclusão só Superadmin
  super_delete_tables TEXT[] := ARRAY[
    'sales', 'receivables', 'cash_registers', 'stock_movements', 'stock_adjustments',
    'stock_conferences', 'cash_conferences'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;

  FOREACH tbl IN ARRAY daily_tables || admin_delete_tables || super_delete_tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('CREATE POLICY erp_select ON public.%I FOR SELECT TO authenticated USING ((SELECT public.erp_is_active()))', tbl);
    EXECUTE format('CREATE POLICY erp_insert ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.erp_is_active()))', tbl);
    EXECUTE format('CREATE POLICY erp_update ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.erp_is_active())) WITH CHECK ((SELECT public.erp_is_active()))', tbl);
  END LOOP;

  FOREACH tbl IN ARRAY daily_tables LOOP
    EXECUTE format('CREATE POLICY erp_delete ON public.%I FOR DELETE TO authenticated USING ((SELECT public.erp_is_active()))', tbl);
  END LOOP;
  FOREACH tbl IN ARRAY admin_delete_tables LOOP
    EXECUTE format('CREATE POLICY erp_delete ON public.%I FOR DELETE TO authenticated USING ((SELECT public.erp_is_admin()))', tbl);
  END LOOP;
  FOREACH tbl IN ARRAY super_delete_tables LOOP
    EXECUTE format('CREATE POLICY erp_delete ON public.%I FOR DELETE TO authenticated USING ((SELECT public.erp_is_superadmin()))', tbl);
  END LOOP;
END $$;

-- Configurações da empresa (inclui chave PIX): todos leem, só administradores alteram
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
CREATE POLICY erp_select ON public.app_settings FOR SELECT TO authenticated
  USING ((SELECT public.erp_is_active()));
CREATE POLICY erp_insert ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.erp_is_admin()));
CREATE POLICY erp_update ON public.app_settings FOR UPDATE TO authenticated
  USING ((SELECT public.erp_is_admin())) WITH CHECK ((SELECT public.erp_is_admin()));

-- Auditoria: registro só de inclusão; apenas o Superadmin altera/exclui (restauração de backup)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
CREATE POLICY erp_select ON public.audit_logs FOR SELECT TO authenticated
  USING ((SELECT public.erp_is_active()));
CREATE POLICY erp_insert ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.erp_is_active()));
CREATE POLICY erp_update ON public.audit_logs FOR UPDATE TO authenticated
  USING ((SELECT public.erp_is_superadmin())) WITH CHECK ((SELECT public.erp_is_superadmin()));
CREATE POLICY erp_delete ON public.audit_logs FOR DELETE TO authenticated
  USING ((SELECT public.erp_is_superadmin()));

-- Usuários: leitura para usuários ativos; alterações somente pelas funções erp_admin_*
GRANT SELECT ON public.users TO authenticated;
CREATE POLICY erp_select ON public.users FOR SELECT TO authenticated
  USING ((SELECT public.erp_is_active()));

-- ==============================================================================
-- 24. REALTIME MULTI-DISPOSITIVOS (respeita as políticas RLS acima)
-- ==============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE
    public.app_settings, public.products, public.stock, public.stock_movements,
    public.stock_adjustments, public.clients, public.delivery_persons, public.suppliers,
    public.sales, public.receivables, public.cash_registers, public.cash_movements,
    public.expenses, public.payables, public.audit_logs, public.stock_conferences,
    public.cash_conferences, public.users;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

-- ==============================================================================
-- 25. DADOS INICIAIS
-- ==============================================================================
INSERT INTO public.app_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
`;

// Helper conversion functions
export function mapDbProduct(row: any): Product {
  return {
    id: row.id,
    code: row.code || '',
    name: row.name,
    costPrice: Number(row.cost_price) || 0,
    sellPrice: Number(row.sell_price) || 0,
    category: row.category || undefined,
    minStock: row.min_stock !== null ? Number(row.min_stock) : undefined,
    description: row.description || undefined,
    unit: row.unit || 'UN',
    isActive: Boolean(row.is_active),
    isCylinder: Boolean(row.is_cylinder),
  };
}

export function mapProductToDb(p: Product): any {
  return {
    id: p.id,
    code: p.code || '',
    name: p.name,
    cost_price: p.costPrice,
    sell_price: p.sellPrice,
    category: p.category || null,
    min_stock: p.minStock || 0,
    description: p.description || null,
    unit: p.unit || 'UN',
    is_active: p.isActive,
    is_cylinder: p.isCylinder,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbStock(row: any): StockItem {
  return {
    productId: row.product_id,
    fullQuantity: Number(row.full_quantity) || 0,
    emptyQuantity: Number(row.empty_quantity) || 0,
    lastUpdated: row.last_updated || new Date().toISOString(),
  };
}

export function mapStockToDb(s: StockItem): any {
  return {
    product_id: s.productId,
    full_quantity: s.fullQuantity,
    empty_quantity: s.emptyQuantity,
    last_updated: s.lastUpdated || new Date().toISOString(),
  };
}

export function mapDbStockMovement(row: any): StockMovement {
  return {
    id: row.id,
    timestamp: row.timestamp,
    productId: row.product_id,
    productName: row.product_name,
    quantity: Number(row.quantity) || 0,
    stockType: row.stock_type,
    direction: row.direction,
    type: row.type,
    origin: row.origin,
    relatedSaleId: row.related_sale_id || undefined,
    notes: row.notes || undefined,
    previousQty: row.previous_qty !== null ? Number(row.previous_qty) : undefined,
    newQty: row.new_qty !== null ? Number(row.new_qty) : undefined,
  };
}

export function mapStockMovementToDb(m: StockMovement): any {
  return {
    id: m.id,
    timestamp: m.timestamp,
    product_id: m.productId,
    product_name: m.productName,
    quantity: m.quantity,
    stock_type: m.stockType,
    direction: m.direction,
    type: m.type,
    origin: m.origin,
    related_sale_id: m.relatedSaleId || null,
    notes: m.notes || null,
    previous_qty: m.previousQty ?? 0,
    new_qty: m.newQty ?? 0,
  };
}

export function mapDbStockAdjustment(row: any): StockAdjustment {
  return {
    id: row.id,
    timestamp: row.timestamp,
    productId: row.product_id,
    productName: row.product_name,
    previousFull: Number(row.previous_full) || 0,
    newFull: Number(row.new_full) || 0,
    diffFull: Number(row.diff_full) || 0,
    previousEmpty: Number(row.previous_empty) || 0,
    newEmpty: Number(row.new_empty) || 0,
    diffEmpty: Number(row.diff_empty) || 0,
    reason: row.reason || '',
    notes: row.notes || undefined,
  };
}

export function mapStockAdjustmentToDb(a: StockAdjustment): any {
  return {
    id: a.id,
    timestamp: a.timestamp,
    product_id: a.productId,
    product_name: a.productName,
    previous_full: a.previousFull,
    new_full: a.newFull,
    diff_full: a.diffFull,
    previous_empty: a.previousEmpty,
    new_empty: a.newEmpty,
    diff_empty: a.diffEmpty,
    reason: a.reason,
    notes: a.notes || null,
  };
}

export function mapDbClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    address: row.address || '',
    neighborhood: row.neighborhood || '',
    reference: row.reference || undefined,
    document: row.document || undefined,
    creditLimit: row.credit_limit !== null ? Number(row.credit_limit) : undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapClientToDb(c: Client): any {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    address: c.address || '',
    neighborhood: c.neighborhood || '',
    reference: c.reference || null,
    document: c.document || null,
    credit_limit: c.creditLimit || 0,
    notes: c.notes || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbDeliveryPerson(row: any): DeliveryPerson {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    vehicle: row.vehicle || undefined,
    isActive: Boolean(row.is_active),
  };
}

export function mapDeliveryPersonToDb(d: DeliveryPerson): any {
  return {
    id: d.id,
    name: d.name,
    phone: d.phone || '',
    vehicle: d.vehicle || null,
    is_active: d.isActive,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    document: row.document || undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    notes: row.notes || undefined,
  };
}

export function mapSupplierToDb(s: Supplier): any {
  return {
    id: s.id,
    name: s.name,
    document: s.document || null,
    phone: s.phone || null,
    address: s.address || null,
    notes: s.notes || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbSale(row: any): Sale {
  return {
    id: row.id,
    saleNumber: Number(row.sale_number) || 0,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
    finalizedAt: row.finalized_at || undefined,
    clientId: row.client_id || undefined,
    clientName: row.client_name || undefined,
    clientPhone: row.client_phone || undefined,
    clientAddress: row.client_address || undefined,
    clientNeighborhood: row.client_neighborhood || undefined,
    deliveryPersonId: row.delivery_person_id || undefined,
    deliveryPersonName: row.delivery_person_name || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    totalAmount: Number(row.total_amount) || 0,
    totalCost: Number(row.total_cost) || 0,
    grossProfit: Number(row.gross_profit) || 0,
    profitMargin: Number(row.profit_margin) || 0,
    dispatchedCylinders: Number(row.dispatched_cylinders) || 0,
    returnedCylinders: Number(row.returned_cylinders) || 0,
    payments: Array.isArray(row.payments) ? row.payments : [],
    paidAmount: Number(row.paid_amount) || 0,
    fiadoAmount: Number(row.fiado_amount) || 0,
    notes: row.notes || undefined,
    cancellationReason: row.cancellation_reason || undefined,
  };
}

export function mapSaleToDb(s: Sale): any {
  return {
    id: s.id,
    sale_number: s.saleNumber,
    type: s.type,
    status: s.status,
    created_at: s.createdAt,
    finalized_at: s.finalizedAt || null,
    client_id: s.clientId || null,
    client_name: s.clientName || null,
    client_phone: s.clientPhone || null,
    client_address: s.clientAddress || null,
    client_neighborhood: s.clientNeighborhood || null,
    delivery_person_id: s.deliveryPersonId || null,
    delivery_person_name: s.deliveryPersonName || null,
    items: s.items,
    total_amount: s.totalAmount,
    total_cost: s.totalCost,
    gross_profit: s.grossProfit,
    profit_margin: s.profitMargin,
    dispatched_cylinders: s.dispatchedCylinders || 0,
    returned_cylinders: s.returnedCylinders || 0,
    payments: s.payments,
    paid_amount: s.paidAmount || 0,
    fiado_amount: s.fiadoAmount || 0,
    notes: s.notes || null,
    cancellation_reason: s.cancellationReason || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbReceivable(row: any): AccountReceivable {
  return {
    id: row.id,
    saleId: row.sale_id || '',
    saleNumber: Number(row.sale_number) || 0,
    clientId: row.client_id || undefined,
    clientName: row.client_name,
    clientPhone: row.client_phone || undefined,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    remainingAmount: Number(row.remaining_amount) || 0,
    createdAt: row.created_at,
    dueDate: row.due_date || undefined,
    status: row.status,
    paymentHistory: Array.isArray(row.payment_history) ? row.payment_history : [],
  };
}

export function mapReceivableToDb(r: AccountReceivable): any {
  return {
    id: r.id,
    sale_id: r.saleId || null,
    sale_number: r.saleNumber,
    client_id: r.clientId || null,
    client_name: r.clientName,
    client_phone: r.clientPhone || null,
    total_amount: r.totalAmount,
    paid_amount: r.paidAmount,
    remaining_amount: r.remainingAmount,
    created_at: r.createdAt,
    due_date: r.dueDate || null,
    status: r.status,
    payment_history: r.paymentHistory,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbCashRegister(row: any): CashRegister {
  return {
    id: row.id,
    openedAt: row.opened_at,
    closedAt: row.closed_at || undefined,
    initialBalance: Number(row.initial_balance) || 0,
    currentBalance: Number(row.current_balance) || 0,
    status: row.status,
    physicalCounted: row.physical_counted !== null ? Number(row.physical_counted) : undefined,
    difference: row.difference !== null ? Number(row.difference) : undefined,
    closeNotes: row.close_notes || undefined,
  };
}

export function mapCashRegisterToDb(c: CashRegister): any {
  return {
    id: c.id,
    opened_at: c.openedAt,
    closed_at: c.closedAt || null,
    initial_balance: c.initialBalance,
    current_balance: c.currentBalance,
    status: c.status,
    physical_counted: c.physicalCounted ?? null,
    difference: c.difference ?? null,
    close_notes: c.closeNotes || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbCashMovement(row: any): CashMovement {
  return {
    id: row.id,
    cashRegisterId: row.cash_register_id,
    timestamp: row.timestamp,
    type: row.type,
    amount: Number(row.amount) || 0,
    method: row.method || undefined,
    paymentMethod: row.payment_method || undefined,
    description: row.description,
    relatedSaleId: row.related_sale_id || undefined,
    relatedReceivableId: row.related_receivable_id || undefined,
    relatedExpenseId: row.related_expense_id || undefined,
  };
}

export function mapCashMovementToDb(m: CashMovement): any {
  return {
    id: m.id,
    cash_register_id: m.cashRegisterId,
    timestamp: m.timestamp,
    type: m.type,
    amount: m.amount,
    method: m.method || null,
    payment_method: m.paymentMethod || null,
    description: m.description,
    related_sale_id: m.relatedSaleId || null,
    related_receivable_id: m.relatedReceivableId || null,
    related_expense_id: m.relatedExpenseId || null,
  };
}

export function mapDbExpense(row: any): Expense {
  return {
    id: row.id,
    description: row.description,
    category: row.category,
    amount: Number(row.amount) || 0,
    method: row.method || undefined,
    paymentMethod: row.payment_method || undefined,
    date: row.date,
    paidFromCash: Boolean(row.paid_from_cash),
    supplier: row.supplier || undefined,
    notes: row.notes || undefined,
  };
}

export function mapExpenseToDb(e: Expense): any {
  return {
    id: e.id,
    description: e.description,
    category: e.category,
    amount: e.amount,
    method: e.method || null,
    payment_method: e.paymentMethod || null,
    date: e.date,
    paid_from_cash: e.paidFromCash,
    supplier: e.supplier || null,
    notes: e.notes || null,
  };
}

export function mapDbPayable(row: any): AccountPayable {
  return {
    id: row.id,
    description: row.description,
    supplierId: row.supplier_id || undefined,
    supplierName: row.supplier_name || undefined,
    supplier: row.supplier || undefined,
    category: row.category,
    amount: Number(row.amount) || 0,
    dueDate: row.due_date,
    paidAt: row.paid_at || undefined,
    paymentMethod: row.payment_method || undefined,
    status: row.status,
    notes: row.notes || undefined,
  };
}

export function mapPayableToDb(p: AccountPayable): any {
  return {
    id: p.id,
    description: p.description,
    supplier_id: p.supplierId || null,
    supplier_name: p.supplierName || null,
    supplier: p.supplier || null,
    category: p.category,
    amount: p.amount,
    due_date: p.dueDate,
    paid_at: p.paidAt || null,
    payment_method: p.paymentMethod || null,
    status: p.status,
    notes: p.notes || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    action: row.action,
    category: row.category,
    description: row.description || '',
    details: row.details || undefined,
    saleId: row.sale_id || undefined,
    productId: row.product_id || undefined,
  };
}

export function mapAuditLogToDb(a: AuditLog): any {
  return {
    id: a.id,
    timestamp: a.timestamp,
    action: a.action,
    category: a.category,
    description: a.description,
    details: a.details || null,
    sale_id: a.saleId || null,
    product_id: a.productId || null,
  };
}

export function mapDbStockConference(row: any): StockConference {
  return {
    id: row.id,
    timestamp: row.timestamp,
    productId: row.product_id,
    productName: row.product_name,
    systemFull: Number(row.system_full) || 0,
    physicalFull: Number(row.physical_full) || 0,
    diffFull: Number(row.diff_full) || 0,
    systemEmpty: Number(row.system_empty) || 0,
    physicalEmpty: Number(row.physical_empty) || 0,
    diffEmpty: Number(row.diff_empty) || 0,
    reason: row.reason || undefined,
    adjusted: Boolean(row.adjusted),
  };
}

export function mapStockConferenceToDb(s: StockConference): any {
  return {
    id: s.id,
    timestamp: s.timestamp,
    product_id: s.productId,
    product_name: s.productName,
    system_full: s.systemFull,
    physical_full: s.physicalFull,
    diff_full: s.diffFull,
    system_empty: s.systemEmpty,
    physical_empty: s.physicalEmpty,
    diff_empty: s.diffEmpty,
    reason: s.reason || null,
    adjusted: s.adjusted,
  };
}

export function mapDbCashConference(row: any): CashConference {
  return {
    id: row.id,
    timestamp: row.timestamp,
    expectedBalance: Number(row.expected_balance) || 0,
    physicalCounted: Number(row.physical_counted) || 0,
    difference: Number(row.difference) || 0,
    notes: row.notes || undefined,
  };
}

export function mapCashConferenceToDb(c: CashConference): any {
  return {
    id: c.id,
    timestamp: c.timestamp,
    expected_balance: c.expectedBalance,
    physical_counted: c.physicalCounted,
    difference: c.difference,
    notes: c.notes || null,
  };
}

export function mapDbAppSettings(row: any): AppSettings {
  return {
    companyName: row.company_name || 'ErpGLP Distribuidora e Revenda de Gás Ltda',
    tradingName: row.trading_name || 'ErpGLP Gás & Água',
    cnpj: row.cnpj || '12.345.678/0001-90',
    phone: row.phone || '(11) 98765-4321',
    address: row.address || 'Av. das Nações, 1500',
    neighborhood: row.neighborhood || 'Centro',
    city: row.city || 'São Paulo - SP',
    pixKey: row.pix_key || 'financeiro@erpglp.com.br',
    defaultMinStock: Number(row.default_min_stock) || 20,
    deliveryFee: Number(row.delivery_fee) || 0,
    deliveryTimeMinutes: Number(row.delivery_time_minutes) || 30,
    receiptFooterMessage:
      row.receipt_footer_message ||
      'Agradecemos a sua preferência! ErpGLP - Qualidade, Segurança e Rapidez.',
  };
}

export function mapAppSettingsToDb(settings: AppSettings): any {
  return {
    id: 'default',
    company_name: settings.companyName,
    trading_name: settings.tradingName,
    cnpj: settings.cnpj,
    phone: settings.phone,
    address: settings.address,
    neighborhood: settings.neighborhood,
    city: settings.city,
    pix_key: settings.pixKey,
    default_min_stock: settings.defaultMinStock,
    delivery_fee: settings.deliveryFee,
    delivery_time_minutes: settings.deliveryTimeMinutes,
    receipt_footer_message: settings.receiptFooterMessage,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbUser(row: any): AppUser {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role || 'operador',
    status: row.status || 'ativo',
    hasDefinedPassword: Boolean(row.has_defined_password),
    lastLoginAt: row.last_login_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
  };
}
