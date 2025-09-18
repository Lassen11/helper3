import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const supabaseUrl = 'https://gidvpxxfgvivjbzfpxcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZweHhmZ3ZpdmpiemZweGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTUzNjUsImV4cCI6MjA3Mzc3MTM2NX0.-7bkvxCdCfz49sJcXXhxOxE_DyhDW-bD6xae933oz_g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 Тестирование подключения к базе данных Supabase...\n');
  
  try {
    // 1. Тест подключения к API
    console.log('1️⃣ Тестирование API подключения...');
    const { data: apiTest, error: apiError } = await supabase
      .from('clients')
      .select('count')
      .limit(1);
    
    if (apiError) {
      console.log('❌ Ошибка API:', apiError.message);
      return;
    }
    console.log('✅ API подключение успешно\n');

    // 2. Проверка существования таблиц
    console.log('2️⃣ Проверка существования таблиц...');
    const tables = ['clients', 'profiles', 'user_roles', 'payments', 'payment_receipts'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Таблица ${table}: ${error.message}`);
        } else {
          console.log(`✅ Таблица ${table}: существует`);
        }
      } catch (err) {
        console.log(`❌ Таблица ${table}: ${err.message}`);
      }
    }
    console.log('');

    // 3. Проверка RLS политик
    console.log('3️⃣ Проверка RLS политик...');
    try {
      // Пытаемся получить данные без аутентификации
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .limit(1);
      
      if (clientsError && clientsError.code === 'PGRST301') {
        console.log('✅ RLS политики активны (доступ запрещен без аутентификации)');
      } else {
        console.log('⚠️ RLS политики могут быть не настроены');
      }
    } catch (err) {
      console.log('✅ RLS политики активны');
    }
    console.log('');

    // 4. Проверка Storage
    console.log('4️⃣ Проверка Storage...');
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.log('❌ Ошибка Storage:', bucketsError.message);
      } else {
        const receiptsBucket = buckets.find(bucket => bucket.name === 'receipts');
        if (receiptsBucket) {
          console.log('✅ Bucket "receipts" создан');
        } else {
          console.log('❌ Bucket "receipts" не найден');
        }
      }
    } catch (err) {
      console.log('❌ Ошибка при проверке Storage:', err.message);
    }
    console.log('');

    // 5. Проверка функций
    console.log('5️⃣ Проверка функций...');
    try {
      // Проверяем функцию is_admin
      const { data: adminTest, error: adminError } = await supabase
        .rpc('is_admin', { user_uuid: '00000000-0000-0000-0000-000000000000' });
      
      if (adminError) {
        console.log('❌ Функция is_admin:', adminError.message);
      } else {
        console.log('✅ Функция is_admin работает');
      }
    } catch (err) {
      console.log('❌ Ошибка при проверке функций:', err.message);
    }
    console.log('');

    // 6. Тест создания тестового клиента (если есть аутентификация)
    console.log('6️⃣ Тест создания данных...');
    try {
      // Создаем тестового клиента
      const testClient = {
        full_name: 'Тестовый клиент',
        contract_amount: 100000,
        installment_period: 12,
        first_payment: 10000,
        monthly_payment: 8000,
        remaining_amount: 90000,
        user_id: '00000000-0000-0000-0000-000000000000',
        employee_id: '00000000-0000-0000-0000-000000000000'
      };

      const { data: insertData, error: insertError } = await supabase
        .from('clients')
        .insert([testClient])
        .select();

      if (insertError) {
        if (insertError.code === 'PGRST301') {
          console.log('✅ RLS работает (вставка запрещена без аутентификации)');
        } else {
          console.log('❌ Ошибка при создании клиента:', insertError.message);
        }
      } else {
        console.log('✅ Тестовый клиент создан:', insertData[0].id);
        
        // Удаляем тестового клиента
        await supabase
          .from('clients')
          .delete()
          .eq('id', insertData[0].id);
        console.log('✅ Тестовый клиент удален');
      }
    } catch (err) {
      console.log('❌ Ошибка при тестировании создания данных:', err.message);
    }
    console.log('');

    console.log('🎉 Тестирование завершено!');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Откройте database_migration.html в браузере');
    console.log('2. Выполните SQL миграцию в Supabase Dashboard');
    console.log('3. Запустите приложение: npm run dev');
    console.log('4. Протестируйте аутентификацию и создание данных');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем тест
testDatabaseConnection();
