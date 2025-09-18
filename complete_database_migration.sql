-- =====================================================
-- ПОЛНЫЙ ПЕРЕНОС БАЗЫ ДАННЫХ В SUPABASE
-- Система управления клиентами банкротства
-- =====================================================

-- 1. СОЗДАНИЕ ENUM ДЛЯ РОЛЕЙ
-- =====================================================
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'employee');

-- 2. СОЗДАНИЕ ОСНОВНЫХ ТАБЛИЦ
-- =====================================================

-- Таблица клиентов банкротства
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  contract_amount DECIMAL(12,2) NOT NULL CHECK (contract_amount > 0),
  installment_period INTEGER NOT NULL CHECK (installment_period > 0),
  first_payment DECIMAL(12,2) NOT NULL CHECK (first_payment >= 0),
  monthly_payment DECIMAL(12,2) NOT NULL CHECK (monthly_payment >= 0),
  remaining_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
  total_paid NUMERIC DEFAULT 0,
  deposit_paid NUMERIC DEFAULT 0,
  deposit_target NUMERIC DEFAULT 50000,
  payment_day INTEGER NOT NULL DEFAULT 1 CHECK (payment_day >= 1 AND payment_day <= 31),
  contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Таблица ролей пользователей
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'employee',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    UNIQUE (user_id)
);

-- Таблица платежей
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  original_amount NUMERIC NOT NULL,
  custom_amount NUMERIC,
  due_date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  payment_type TEXT NOT NULL DEFAULT 'monthly',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(client_id, payment_number)
);

-- Таблица чеков и документов
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  payment_id UUID NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- =====================================================

-- Индекс для поиска по имени клиента (русский язык)
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON public.clients USING gin(to_tsvector('russian', full_name));

-- Индекс для поиска по сотруднику
CREATE INDEX IF NOT EXISTS idx_clients_employee_id ON public.clients(employee_id);

-- Индексы для таблицы платежей
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);

-- 4. СОЗДАНИЕ ФУНКЦИЙ
-- =====================================================

-- Функция для обновления timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Функция для проверки роли пользователя
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = user_uuid;
$$;

-- Функция для проверки является ли пользователь админом
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
    );
$$;

-- Функция для автоматического создания профиля и роли пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Создаем профиль пользователя
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Создаем роль пользователя (по умолчанию сотрудник)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee'::app_role)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Функция для создания первого админа
CREATE OR REPLACE FUNCTION public.create_first_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Проверяем, есть ли уже админы
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
        -- Создаем первого админа из первого зарегистрированного пользователя
        INSERT INTO public.user_roles (user_id, role)
        SELECT id, 'admin'::app_role 
        FROM auth.users 
        ORDER BY created_at ASC 
        LIMIT 1
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END;
$$;

-- 5. СОЗДАНИЕ ТРИГГЕРОВ
-- =====================================================

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_receipts_updated_at
BEFORE UPDATE ON public.payment_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Триггер для автоматического создания профиля при регистрации
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ВКЛЮЧЕНИЕ ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- 7. СОЗДАНИЕ RLS ПОЛИТИК
-- =====================================================

-- RLS политики для profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS политики для user_roles
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (public.is_admin());

-- RLS политики для clients (с поддержкой employee_id)
CREATE POLICY "Users can view their assigned clients or admins can view all" 
ON public.clients 
FOR SELECT 
USING ((auth.uid() = employee_id) OR is_admin());

CREATE POLICY "Admins can create clients and assign employees" 
ON public.clients 
FOR INSERT 
WITH CHECK (is_admin() OR (auth.uid() = employee_id));

CREATE POLICY "Users can update their assigned clients or admins can update all" 
ON public.clients 
FOR UPDATE 
USING ((auth.uid() = employee_id) OR is_admin())
WITH CHECK ((auth.uid() = employee_id) OR is_admin());

CREATE POLICY "Admins can delete any clients, users can delete their assigned clients" 
ON public.clients 
FOR DELETE 
USING ((auth.uid() = employee_id) OR is_admin());

-- RLS политики для payments
CREATE POLICY "Users can view their own payments or admins can view all" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments or admins can update all" 
ON public.payments 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own payments or admins can delete all" 
ON public.payments 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_admin());

-- RLS политики для payment_receipts
CREATE POLICY "Users can view their own receipts or admins can view all" 
ON public.payment_receipts 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own receipts" 
ON public.payment_receipts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts or admins can update all" 
ON public.payment_receipts 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own receipts or admins can delete all" 
ON public.payment_receipts 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_admin());

-- 8. НАСТРОЙКА STORAGE ДЛЯ ФАЙЛОВ
-- =====================================================

-- Создание storage bucket для чеков
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT (id) DO NOTHING;

-- Storage политики для чеков
CREATE POLICY "Users can view their own receipt files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own receipt files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipt files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipt files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 9. ДОБАВЛЕНИЕ КОММЕНТАРИЕВ ДЛЯ ДОКУМЕНТАЦИИ
-- =====================================================

COMMENT ON TABLE public.clients IS 'Таблица клиентов банкротства физических лиц';
COMMENT ON COLUMN public.clients.full_name IS 'Полное имя клиента (ФИО)';
COMMENT ON COLUMN public.clients.contract_amount IS 'Сумма договора в рублях';
COMMENT ON COLUMN public.clients.installment_period IS 'Срок рассрочки в месяцах';
COMMENT ON COLUMN public.clients.first_payment IS 'Размер первого платежа в рублях';
COMMENT ON COLUMN public.clients.monthly_payment IS 'Размер ежемесячного платежа в рублях';
COMMENT ON COLUMN public.clients.remaining_amount IS 'Остаток к оплате в рублях';
COMMENT ON COLUMN public.clients.contract_date IS 'Дата заключения договора';
COMMENT ON COLUMN public.clients.employee_id IS 'ID сотрудника, ответственного за клиента';

COMMENT ON TABLE public.profiles IS 'Профили пользователей системы';
COMMENT ON TABLE public.user_roles IS 'Роли пользователей (admin, employee)';
COMMENT ON TABLE public.payments IS 'График платежей клиентов';
COMMENT ON TABLE public.payment_receipts IS 'Загруженные чеки и документы';

-- 10. СОЗДАНИЕ ПЕРВОГО АДМИНА
-- =====================================================

-- Создаем первого админа из существующего пользователя, если админов еще нет
SELECT public.create_first_admin();

-- =====================================================
-- МИГРАЦИЯ ЗАВЕРШЕНА
-- =====================================================
-- 
-- Все таблицы, функции, триггеры и политики безопасности
-- успешно созданы в Supabase.
-- 
-- Система готова к работе с аутентификацией и авторизацией!
-- =====================================================
