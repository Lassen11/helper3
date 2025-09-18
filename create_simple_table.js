import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const supabaseUrl = 'https://gidvpxxfgvivjbzfpxcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZweHhmZ3ZpdmpiemZweGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTUzNjUsImV4cCI6MjA3Mzc3MTM2NX0.-7bkvxCdCfz49sJcXXhxOxE_DyhDW-bD6xae933oz_g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSimpleTable() {
  try {
    console.log('Создаем простую таблицу...');
    
    // Попробуем создать таблицу через rpc функцию
    const { data, error } = await supabase.rpc('create_table', {
      table_name: 'test_table',
      columns: [
        { name: 'id', type: 'SERIAL', primary_key: true },
        { name: 'name', type: 'TEXT' }
      ]
    });
    
    if (error) {
      console.log('Ошибка при создании таблицы:', error.message);
    } else {
      console.log('Таблица создана успешно!');
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

createSimpleTable();
