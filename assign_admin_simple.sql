-- =====================================================
-- НАЗНАЧЕНИЕ ПОЛЬЗОВАТЕЛЯ АДМИНИСТРАТОРОМ
-- Пользователь ID: c47f5023-e037-468c-91d9-c7ae417d5289
-- =====================================================

-- 1. Проверяем, существует ли пользователь в auth.users
SELECT 
    id, 
    email, 
    created_at,
    'Пользователь найден' as status
FROM auth.users 
WHERE id = 'c47f5023-e037-468c-91d9-c7ae417d5289';

-- 2. Проверяем текущую роль пользователя
SELECT 
    ur.user_id,
    ur.role,
    ur.created_at,
    ur.updated_at,
    'Текущая роль' as status
FROM public.user_roles ur
WHERE ur.user_id = 'c47f5023-e037-468c-91d9-c7ae417d5289';

-- 3. Назначаем роль администратора
-- Если роль уже существует, обновляем её
-- Если не существует, создаём новую
INSERT INTO public.user_roles (user_id, role, created_by, created_at, updated_at)
VALUES (
    'c47f5023-e037-468c-91d9-c7ae417d5289', 
    'admin'::app_role, 
    'c47f5023-e037-468c-91d9-c7ae417d5289',
    NOW(),
    NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET 
    role = 'admin'::app_role,
    updated_at = NOW(),
    created_by = 'c47f5023-e037-468c-91d9-c7ae417d5289';

-- 4. Проверяем результат назначения
SELECT 
    ur.user_id,
    ur.role,
    u.email,
    ur.created_at,
    ur.updated_at,
    'Роль назначена' as status
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.user_id = 'c47f5023-e037-468c-91d9-c7ae417d5289';

-- 5. Тестируем функцию is_admin
SELECT 
    public.is_admin('c47f5023-e037-468c-91d9-c7ae417d5289') as is_admin_result,
    'Функция is_admin работает' as status;

-- 6. Показываем все роли в системе
SELECT 
    ur.user_id,
    ur.role,
    u.email,
    ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
ORDER BY ur.created_at DESC;

-- =====================================================
-- ИНСТРУКЦИИ:
-- 1. Скопируйте весь этот код
-- 2. Вставьте в Supabase Dashboard → SQL Editor
-- 3. Выполните запрос (Ctrl+Enter)
-- 4. Проверьте результаты в выводе
-- =====================================================
