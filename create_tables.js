const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'https://gidvpxxfgvivjbzfpxcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZweHhmZ3ZpdmpiemZweGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTUzNjUsImV4cCI6MjA3Mzc3MTM2NX0.-7bkvxCdCfz49sJcXXhxOxE_DyhDW-bD6xae933oz_g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Создаем таблицы через Supabase API...');
    
    // Создаем таблицу clients
    const createClientsTable = `
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
    `;
    
    // Создаем таблицу profiles
    const createProfilesTable = `
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `;
    
    // Создаем enum для ролей
    const createRoleEnum = `
      CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'employee');
    `;
    
    // Создаем таблицу ролей
    const createUserRolesTable = `
      CREATE TABLE IF NOT EXISTS public.user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        role app_role NOT NULL DEFAULT 'employee',
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        created_by uuid REFERENCES auth.users(id),
        UNIQUE (user_id)
      );
    `;
    
    // Создаем таблицу платежей
    const createPaymentsTable = `
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
    `;
    
    // Создаем таблицу чеков
    const createReceiptsTable = `
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
    `;
    
    // Выполняем создание таблиц
    const queries = [
      createRoleEnum,
      createClientsTable,
      createProfilesTable,
      createUserRolesTable,
      createPaymentsTable,
      createReceiptsTable
    ];
    
    for (let i = 0; i < queries.length; i++) {
      try {
        console.log(`Выполняем запрос ${i + 1}/${queries.length}...`);
        
        // Используем rpc функцию для выполнения SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: queries[i] 
        });
        
        if (error) {
          console.error(`Ошибка в запросе ${i + 1}:`, error);
        } else {
          console.log(`Запрос ${i + 1} выполнен успешно`);
        }
      } catch (err) {
        console.error(`Ошибка выполнения запроса ${i + 1}:`, err.message);
      }
    }
    
    console.log('Таблицы созданы!');
    
  } catch (error) {
    console.error('Ошибка при создании таблиц:', error);
  }
}

createTables();
