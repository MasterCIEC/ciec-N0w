
-- Roles
INSERT INTO public.roles (id, name) VALUES
(1, 'SuperAdmin'),
(3, 'Usuario'),
(4, 'Administración'),
(5, 'Eventos')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Permissions
INSERT INTO public.permissions (id, action, subject) VALUES
(1, 'create', 'Meeting'),
(2, 'read', 'Meeting'),
(3, 'update', 'Meeting'),
(4, 'delete', 'Meeting'),
(5, 'create', 'Participant'),
(6, 'read', 'Participant'),
(7, 'update', 'Participant'),
(8, 'delete', 'Participant'),
(9, 'manage', 'Users'),
(10, 'create', 'Commission'),
(11, 'read', 'Commission'),
(12, 'update', 'Commission'),
(13, 'delete', 'Commission'),
(14, 'create', 'EventCategory'),
(15, 'read', 'EventCategory'),
(16, 'update', 'EventCategory'),
(17, 'delete', 'EventCategory'),
(18, 'create', 'Event'),
(19, 'read', 'Event'),
(20, 'update', 'Event'),
(21, 'delete', 'Event'),
(31, 'create', 'Task'),
(32, 'read', 'Task'),
(33, 'update', 'Task'),
(34, 'delete', 'Task'),
(35, 'create', 'Department'),
(36, 'read', 'Department'),
(37, 'update', 'Department'),
(38, 'delete', 'Department'),
(39, 'create', 'Users'),
(40, 'read', 'Users'),
(41, 'update', 'Users'),
(42, 'delete', 'Users'),
(43, 'manage', 'Roles')
ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action, subject = EXCLUDED.subject;

-- Role Permissions
-- SuperAdmin (1)
INSERT INTO public.rolepermissions (role_id, permission_id) VALUES
(1, 10), (1, 11), (1, 12), (1, 13), (1, 14), (1, 15), (1, 16), (1, 17), (1, 18), (1, 19), (1, 20), (1, 21),
-- Usuario (3)
(3, 1), (3, 2), (3, 3), (3, 5), (3, 6), (3, 7), (3, 11), (3, 15), (3, 19),
-- Administración (4)
(4, 1), (4, 2), (4, 3), (4, 5), (4, 6), (4, 7), (4, 10), (4, 11), (4, 12), (4, 31), (4, 32), (4, 33), (4, 34),
-- Eventos (5)
(5, 1), (5, 2), (5, 3), (5, 4), (5, 5), (5, 6), (5, 7), (5, 8), (5, 10), (5, 11), (5, 12), (5, 14), (5, 15), (5, 16), (5, 18), (5, 19), (5, 20), (5, 21), (5, 31), (5, 32), (5, 33), (5, 34)
ON CONFLICT (role_id, permission_id) DO NOTHING;
