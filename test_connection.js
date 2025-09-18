import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const supabaseUrl = 'https://gidvpxxfgvivjbzfpxcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZweHhmZ3ZpdmpiemZweGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTUzNjUsImV4cCI6MjA3Mzc3MTM2NX0.-7bkvxCdCfz49sJcXXhxOxE_DyhDW-bD6xae933oz_g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Тестируем подключение к Supabase...');
    
    // Проверяем подключение к API
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Ошибка при подключении:', error.message);
    } else {
      console.log('Подключение успешно!');
      console.log('Данные миграций:', data);
    }
    
    // Проверяем доступные таблицы
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Ошибка при получении списка таблиц:', tablesError.message);
    } else {
      console.log('Доступные таблицы:', tables.map(t => t.table_name));
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testConnection();
