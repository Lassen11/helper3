import { createClient } from '@supabase/supabase-js';

// Конфигурация Supabase
const supabaseUrl = 'https://gidvpxxfgvivjbzfpxcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHZweHhmZ3ZpdmpiemZweGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTUzNjUsImV4cCI6MjA3Mzc3MTM2NX0.-7bkvxCdCfz49sJcXXhxOxE_DyhDW-bD6xae933oz_g';

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'c47f5023-e037-468c-91d9-c7ae417d5289';

async function assignAdminRole() {
  console.log('🔍 Назначение пользователя администратором...\n');
  console.log(`👤 Пользователь ID: ${userId}\n`);

  try {
    // 1. Проверяем, существует ли пользователь
    console.log('1️⃣ Проверка существования пользователя...');
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .eq('id', userId)
      .single();

    if (userError) {
      console.log('❌ Пользователь не найден:', userError.message);
      return;
    }
    console.log('✅ Пользователь найден:', user.email);

    // 2. Проверяем текущую роль
    console.log('\n2️⃣ Проверка текущей роли...');
    const { data: currentRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.log('❌ Ошибка при проверке роли:', roleError.message);
      return;
    }

    if (currentRole) {
      console.log(`📋 Текущая роль: ${currentRole.role}`);
      if (currentRole.role === 'admin') {
        console.log('✅ Пользователь уже является администратором!');
        return;
      }
    } else {
      console.log('📋 Роль не назначена');
    }

    // 3. Назначаем роль администратора
    console.log('\n3️⃣ Назначение роли администратора...');
    const { data: insertData, error: insertError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin',
        created_by: userId,
        updated_at: new Date().toISOString()
      })
      .select();

    if (insertError) {
      console.log('❌ Ошибка при назначении роли:', insertError.message);
      return;
    }
    console.log('✅ Роль администратора назначена успешно!');

    // 4. Проверяем результат
    console.log('\n4️⃣ Проверка результата...');
    const { data: finalRole, error: finalError } = await supabase
      .from('user_roles')
      .select('role, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (finalError) {
      console.log('❌ Ошибка при проверке результата:', finalError.message);
      return;
    }

    console.log('✅ Финальная проверка:');
    console.log(`   Роль: ${finalRole.role}`);
    console.log(`   Назначена: ${finalRole.created_at}`);
    console.log(`   Обновлена: ${finalRole.updated_at}`);

    // 5. Тестируем функцию is_admin
    console.log('\n5️⃣ Тестирование функции is_admin...');
    const { data: isAdminResult, error: isAdminError } = await supabase
      .rpc('is_admin', { user_uuid: userId });

    if (isAdminError) {
      console.log('❌ Ошибка при тестировании is_admin:', isAdminError.message);
    } else {
      console.log(`✅ is_admin(${userId}): ${isAdminResult}`);
    }

    console.log('\n🎉 Пользователь успешно назначен администратором!');
    console.log('\n📋 Права администратора:');
    console.log('   • Просмотр всех клиентов');
    console.log('   • Создание и редактирование клиентов');
    console.log('   • Управление пользователями и ролями');
    console.log('   • Просмотр всех платежей и чеков');
    console.log('   • Доступ к админской панели');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

// Запускаем назначение роли
assignAdminRole();
