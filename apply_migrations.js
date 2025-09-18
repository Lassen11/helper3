const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Конфигурация Supabase
const supabaseUrl = 'https://gidvpxxfgvivjbzfpxcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZweHhmZ3ZpdmpiemZweGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTUzNjUsImV4cCI6MjA3Mzc3MTM2NX0.-7bkvxCdCfz49sJcXXhxOxE_DyhDW-bD6xae933oz_g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  try {
    console.log('Начинаем применение миграций...');
    
    // Читаем SQL файл
    const sqlContent = fs.readFileSync('complete_schema.sql', 'utf8');
    
    // Разбиваем на отдельные запросы
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));
    
    console.log(`Найдено ${queries.length} SQL запросов для выполнения`);
    
    // Выполняем каждый запрос
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.trim()) {
        try {
          console.log(`Выполняем запрос ${i + 1}/${queries.length}...`);
          
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql_query: query 
          });
          
          if (error) {
            console.error(`Ошибка в запросе ${i + 1}:`, error);
            // Продолжаем выполнение других запросов
          } else {
            console.log(`Запрос ${i + 1} выполнен успешно`);
          }
        } catch (err) {
          console.error(`Ошибка выполнения запроса ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('Миграции применены!');
    
    // Проверяем, что таблицы созданы
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Ошибка при проверке таблиц:', tablesError);
    } else {
      console.log('Созданные таблицы:', tables.map(t => t.table_name));
    }
    
  } catch (error) {
    console.error('Ошибка при применении миграций:', error);
  }
}

applyMigrations();
