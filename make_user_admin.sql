-- Назначение пользователя администратором
-- Пользователь ID: c47f5023-e037-468c-91d9-c7ae417d5289

-- Проверяем, существует ли пользователь
SELECT 
    id, 
    email, 
    created_at 
FROM auth.users 
WHERE id = 'c47f5023-e037-468c-91d9-c7ae417d5289';

-- Создаем или обновляем роль пользователя на admin
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES (
    'c47f5023-e037-468c-91d9-c7ae417d5289', 
    'admin'::app_role, 
    'c47f5023-e037-468c-91d9-c7ae417d5289'
)
ON CONFLICT (user_id) 
DO UPDATE SET 
    role = 'admin'::app_role,
    updated_at = NOW();

-- Проверяем результат
SELECT 
    ur.user_id,
    ur.role,
    u.email,
    ur.created_at,
    ur.updated_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.user_id = 'c47f5023-e037-468c-91d9-c7ae417d5289';

-- Проверяем, что функция is_admin работает для этого пользователя
SELECT public.is_admin('c47f5023-e037-468c-91d9-c7ae417d5289') as is_admin;
