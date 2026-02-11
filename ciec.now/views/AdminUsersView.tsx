import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, Role, Department, Permission } from '../types';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Select from '../components/ui/Select';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Modal from '../components/Modal';
import Input from '../components/ui/Input';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import EditIcon from '../components/icons/EditIcon';
import AdminIcon from '../components/icons/AdminIcon';
import RefreshIcon from '../components/icons/CalendarSyncIcon';

// Hooks
import { useUsers, useUserMutations } from '../hooks/useUsers';
import { useRoles, usePermissions, useRolePermissions, useRoleMutations } from '../hooks/useRoles';
import { useDepartments } from '../hooks/useDepartments';
import { useUserDepartments, useUserDepartmentMutations } from '../hooks/useUserDepartments';

interface EditingUserState {
  role_id: number | null;
  is_approved: boolean;
  department_ids: string[];
}

// Configuración de traducciones y orden de secciones
const SECTION_ORDER = [
  { key: 'Meeting', label: 'Reuniones' },
  { key: 'Task', label: 'Tareas' },
  { key: 'Department', label: 'Departamentos' },
  { key: 'Event', label: 'Eventos' },
  { key: 'Participant', label: 'Participantes' },
  { key: 'Commission', label: 'Comisiones' },
  { key: 'EventCategory', label: 'Categorías de Eventos' },
  { key: 'Users', label: 'Gestión de Usuarios' },
  { key: 'Roles', label: 'Roles y Permisos' },
];

const ACTION_LABELS: Record<string, string> = {
  create: 'Crear',
  read: 'Leer / Ver',
  update: 'Editar',
  delete: 'Eliminar',
  manage: 'Gestionar Todo'
};

const AdminUsersView: React.FC = () => {
  const { can } = useAuth();
  const { notify } = useNotification();

  // Data Hooks
  const { data: users = [], refetch: refetchUsers } = useUsers();
  const { data: roles = [], refetch: refetchRoles } = useRoles();
  const { data: departments = [] } = useDepartments();
  const { data: userDepartments = [], refetch: refetchUserDepartments } = useUserDepartments();
  const { data: permissions = [] } = usePermissions();
  const { data: rolePermissions = [], refetch: refetchRolePermissions } = useRolePermissions();

  // Mutations
  const { updateUserProfile, deleteUser: deleteUserMutation } = useUserMutations();
  const { updateUserDepartments } = useUserDepartmentMutations();
  const { createRole, deleteRole, updateRolePermissions } = useRoleMutations();

  const [editingUsers, setEditingUsers] = useState<Record<string, EditingUserState>>({});
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Department Modal State
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [userForDepartmentEdit, setUserForDepartmentEdit] = useState<UserProfile | null>(null);
  const [tempSelectedDeptIds, setTempSelectedDeptIds] = useState<string[]>([]);

  // Roles Management Modal State
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<Role | null>(null);
  const [roleNameInput, setRoleNameInput] = useState('');
  const [rolePermissionsState, setRolePermissionsState] = useState<Set<number>>(new Set());

  const handleRefreshData = () => {
    refetchUsers();
    refetchRoles();
    refetchUserDepartments();
    refetchRolePermissions();
  };

  const handleEditClick = (user: UserProfile) => {
    const currentDepts = userDepartments.filter(ud => ud.user_id === user.id).map(ud => ud.department_id);
    setEditingUsers(prev => ({
      ...prev,
      [user.id]: {
        role_id: user.role_id,
        is_approved: user.is_approved,
        department_ids: currentDepts
      }
    }));
  };

  const handleFieldChange = (userId: string, field: keyof EditingUserState, value: any) => {
    setEditingUsers(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleSaveUser = async (userId: string) => {
    const changes = editingUsers[userId];
    if (!changes) return;

    try {
      await updateUserProfile.mutateAsync({
        id: userId,
        updates: { role_id: changes.role_id, is_approved: changes.is_approved }
      });
      await updateUserDepartments.mutateAsync({ userId, departmentIds: changes.department_ids });

      notify.success('Usuario actualizado con éxito.');
      setEditingUsers(prev => {
        const newEditing = { ...prev };
        delete newEditing[userId];
        return newEditing;
      });
    } catch (error: any) {
      notify.error(`Error al actualizar el usuario: ${error.message}`);
    }
  };

  const handleCancelEdit = (userId: string) => {
    setEditingUsers(prev => {
      const newEditing = { ...prev };
      delete newEditing[userId];
      return newEditing;
    });
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email: inviteEmail },
    });

    if (error) {
      notify.error(`Error al invitar: ${error.message}`);
    } else {
      notify.success(`Invitación enviada a ${inviteEmail}.`);
      setInviteEmail('');
      setIsInviteModalOpen(false);
      refetchUsers();
    }
    setInviteLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Note: deleteUserMutation only deletes from DB (userprofiles). 
    // The previous logic also called 'delete-user' function for Auth user deletion.
    // We should probably keep that logic here or move it to the hook.
    // For now, I will keep the complex logic here but use the mutation for the DB part if desired, 
    // OR just stick to manual like before since mutations in hook might just be DB.
    // Let's use the manual approach for the Auth part and Mutation for DB part?
    // Actually, useUserMutations probably deletes from userprofiles.

    // Let's copy the logic from before but use mutation for profile delete
    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);

      const { error: authError } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id },
      });

      if (authError) {
        console.error(`Error al eliminar el usuario de la autenticación: ${authError.message}`);
        notify.warning('Perfil eliminado, pero hubo un error al eliminar el inicio de sesión.');
      } else {
        notify.success('Usuario eliminado con éxito.');
      }
    } catch (error: any) {
      notify.error(`Error al eliminar: ${error.message}`);
    } finally {
      setUserToDelete(null);
    }
  };

  const openDepartmentModal = (user: UserProfile) => {
    const isEditing = !!editingUsers[user.id];
    const currentDepts = isEditing
      ? editingUsers[user.id].department_ids
      : userDepartments.filter(ud => ud.user_id === user.id).map(ud => ud.department_id);

    setUserForDepartmentEdit(user);
    setTempSelectedDeptIds(currentDepts);
    setIsDepartmentModalOpen(true);
  };

  const handleDepartmentModalSave = () => {
    if (userForDepartmentEdit) {
      if (editingUsers[userForDepartmentEdit.id]) {
        handleFieldChange(userForDepartmentEdit.id, 'department_ids', tempSelectedDeptIds);
      } else {
        // Immediate update if not in edit mode
        updateUserDepartments.mutate({ userId: userForDepartmentEdit.id, departmentIds: tempSelectedDeptIds }, {
          onSuccess: () => notify.success('Departamentos actualizados')
        });
      }
    }
    setIsDepartmentModalOpen(false);
  };

  // --- Roles Management Logic ---

  const handleOpenRolesModal = () => {
    refetchRoles();
    refetchRolePermissions();
    setIsRolesModalOpen(true);
    setSelectedRoleForPermissions(null);
    setRolePermissionsState(new Set());
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRoleForPermissions(role);
    const perms = rolePermissions
      .filter(rp => rp.role_id == role.id)
      .map(rp => rp.permission_id);
    setRolePermissionsState(new Set(perms));
  };

  const handleAddRole = () => {
    if (!roleNameInput.trim()) return;
    createRole.mutate(roleNameInput.trim(), {
      onSuccess: () => {
        setRoleNameInput('');
        notify.success('Rol creado.');
      },
      onError: (e) => notify.error(e.message)
    });
  };

  const handleDeleteRole = (roleId: number) => {
    if (!window.confirm("¿Está seguro de eliminar este rol?")) return;
    deleteRole.mutate(roleId, {
      onSuccess: () => {
        notify.success('Rol eliminado.');
        if (selectedRoleForPermissions?.id === roleId) setSelectedRoleForPermissions(null);
      },
      onError: (e) => notify.error(e.message)
    });
  };

  const handleTogglePermission = (permissionId: number) => {
    setRolePermissionsState(prev => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const handleSavePermissions = () => {
    if (!selectedRoleForPermissions) return;

    updateRolePermissions.mutate({
      roleId: selectedRoleForPermissions.id,
      permissionIds: Array.from(rolePermissionsState)
    }, {
      onSuccess: () => notify.success('Permisos actualizados correctamente.'),
      onError: (e) => notify.error(e.message)
    });
  };

  // Group permissions logic
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    if (!permissions) return groups;
    permissions.forEach(p => {
      if (!groups[p.subject]) groups[p.subject] = [];
      groups[p.subject].push(p);
    });
    return groups;
  }, [permissions]);

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return (users as UserProfile[]).filter(user =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const roleOptions = useMemo(() => roles.map(r => ({ value: r.id, label: r.name })), [roles]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gestionar Usuarios</h1>
        <div className="flex space-x-2">
          {can('manage', 'Roles') && (
            <Button onClick={handleOpenRolesModal} variant="accent"><AdminIcon className="w-5 h-5 mr-2" /> Gestionar Roles y Permisos</Button>
          )}
          {can('create', 'Users') && (
            <Button onClick={() => { setIsInviteModalOpen(true); setInviteEmail(''); }} variant="primary"><PlusIcon className="w-5 h-5 mr-2" /> Invitar Usuario</Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>Aprobar nuevos usuarios, asignar roles y departamentos.</CardDescription>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              containerClassName="flex-grow"
            />
            <Button onClick={handleRefreshData} variant="outline" title="Recargar datos"><RefreshIcon className="w-5 h-5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamentos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aprobado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {filteredUsers.length > 0 ? filteredUsers.map(user => {
                const isEditing = !!editingUsers[user.id];
                const currentRoleId = isEditing ? editingUsers[user.id].role_id : user.role_id;
                const isApproved = isEditing ? editingUsers[user.id].is_approved : user.is_approved;

                const userDeptIds = isEditing ? editingUsers[user.id].department_ids : userDepartments.filter(ud => ud.user_id === user.id).map(ud => ud.department_id);
                const userDeptNames = departments.filter(d => userDeptIds.includes(d.id)).map(d => d.name).join(', ');

                return (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.full_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <Select
                          options={roleOptions}
                          value={currentRoleId ?? ''}
                          onChange={(e) => handleFieldChange(user.id, 'role_id', parseInt(e.target.value))}
                          className="w-40"
                        />
                      ) : (
                        roles.find(r => r.id === currentRoleId)?.name || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                      <div className="flex items-center justify-between max-w-xs">
                        <span className="truncate mr-2" title={userDeptNames}>{userDeptNames || 'Ninguno'}</span>
                        <Button variant="ghost" size="sm" onClick={() => openDepartmentModal(user)} className="!p-1">
                          <PlusIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <input
                        type="checkbox"
                        checked={isApproved}
                        onChange={(e) => isEditing ? handleFieldChange(user.id, 'is_approved', e.target.checked) : null}
                        className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <Button onClick={() => handleSaveUser(user.id)} size="sm">Guardar</Button>
                            <Button onClick={() => handleCancelEdit(user.id)} variant="secondary" size="sm">Cancelar</Button>
                          </>
                        ) : (
                          <Button onClick={() => handleEditClick(user)} disabled={!can('manage', 'Users')} variant="accent" size="sm">
                            <EditIcon className="w-4 h-4 mr-1.5" /> Editar
                          </Button>
                        )}
                        <Button onClick={() => setUserToDelete(user)} disabled={!can('delete', 'Users')} variant="danger" size="sm">
                          <TrashIcon className="w-4 h-4 mr-1.5" /> Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invitar Nuevo Usuario">
        <form onSubmit={handleInviteUser} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Se enviará una invitación por correo electrónico al usuario para que se una a la plataforma.</p>
          <Input
            label="Correo Electrónico del Usuario"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end pt-4 space-x-2">
            <Button type="button" variant="secondary" onClick={() => setIsInviteModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={inviteLoading}>{inviteLoading ? 'Enviando...' : 'Enviar Invitación'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Modal */}
      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Confirmar Eliminación">
        {userToDelete && (
          <div className="text-sm">
            <p className="mb-4">¿Está seguro de que desea eliminar al usuario <strong>"{userToDelete.full_name}"</strong> ({userToDelete.id})?</p>
            <p className="font-bold text-red-600">Esta acción es irreversible y eliminará permanentemente al usuario y su acceso.</p>
            <div className="flex justify-end mt-6 space-x-2">
              <Button variant="secondary" onClick={() => setUserToDelete(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDeleteUser} disabled={false}>
                Sí, Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Department Selection Modal */}
      <Modal isOpen={isDepartmentModalOpen} onClose={() => setIsDepartmentModalOpen(false)} title={`Departamentos de ${userForDepartmentEdit?.full_name || 'Usuario'}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">Seleccione los departamentos a los que pertenece este usuario.</p>
          <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-1 bg-white dark:bg-gray-700">
            {departments.length > 0 ? departments.map(dept => (
              <div key={dept.id} className="flex items-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
                <input
                  type="checkbox"
                  id={`dept-modal-${dept.id}`}
                  checked={tempSelectedDeptIds.includes(dept.id)}
                  onChange={(e) => {
                    if (e.target.checked) setTempSelectedDeptIds(prev => [...prev, dept.id]);
                    else setTempSelectedDeptIds(prev => prev.filter(id => id !== dept.id));
                  }}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor={`dept-modal-${dept.id}`} className="ml-2 text-sm text-gray-800 dark:text-gray-200 w-full cursor-pointer select-none">
                  {dept.name}
                </label>
              </div>
            )) : <p className="text-sm text-gray-500">No hay departamentos disponibles.</p>}
          </div>
          <div className="flex justify-end pt-4 space-x-2">
            <Button variant="secondary" onClick={() => setIsDepartmentModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleDepartmentModalSave}>Guardar Selección</Button>
          </div>
        </div>
      </Modal>

      {/* Roles & Permissions Modal */}
      <Modal isOpen={isRolesModalOpen} onClose={() => setIsRolesModalOpen(false)} title="Gestión de Roles y Permisos" size="xl">
        <div className="flex flex-col md:flex-row h-[70vh]">
          {/* Left Panel: Roles */}
          <div className="w-full md:w-1/4 border-r dark:border-gray-700 pr-4 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Roles</h3>
              <Button variant="ghost" size="sm" onClick={handleRefreshData} className="!p-1" title="Recargar Roles">
                <RefreshIcon className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
              {roles.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No se encontraron roles.</div>
              ) : (
                roles.map(role => (
                  <div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${selectedRoleForPermissions?.id === role.id ? 'bg-primary-100 dark:bg-primary-800 border-l-4 border-primary-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-200">{role.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!p-1 text-red-500 hover:text-red-700"
                      onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                      title="Eliminar Rol"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t dark:border-gray-700">
              <div className="flex gap-2">
                <Input
                  placeholder="Nuevo Rol"
                  value={roleNameInput}
                  onChange={(e) => setRoleNameInput(e.target.value)}
                  className="!py-1"
                />
                <Button onClick={handleAddRole} size="sm" variant="primary">Añadir</Button>
              </div>
            </div>
          </div>

          {/* Right Panel: Permissions */}
          <div className="w-full md:w-3/4 pl-4 flex flex-col pt-4 md:pt-0">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
              {selectedRoleForPermissions ? `Permisos: ${selectedRoleForPermissions.name}` : 'Seleccione un Rol'}
            </h3>

            {selectedRoleForPermissions ? (
              <>
                <div className="flex-1 overflow-y-auto pr-2 bg-gray-50 dark:bg-gray-800 rounded p-3 border dark:border-gray-700 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SECTION_ORDER.map(section => {
                      const sectionPermissions = groupedPermissions[section.key];
                      if (!sectionPermissions || sectionPermissions.length === 0) return null;

                      return (
                        <div key={section.key} className="bg-white dark:bg-slate-700/50 rounded-lg p-3 border border-gray-200 dark:border-slate-600 shadow-sm">
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 border-b dark:border-slate-600 pb-1">
                            {section.label}
                          </h4>
                          <div className="grid grid-cols-1 gap-1">
                            {sectionPermissions.map(perm => (
                              <div key={perm.id} className="flex items-center p-1 rounded hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
                                <input
                                  type="checkbox"
                                  id={`perm-${perm.id}`}
                                  checked={rolePermissionsState.has(perm.id)}
                                  onChange={() => handleTogglePermission(perm.id)}
                                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                                />
                                <label htmlFor={`perm-${perm.id}`} className="ml-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none w-full">
                                  {ACTION_LABELS[perm.action] || perm.action}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {/* Fallback for unmapped subjects */}
                    {Object.keys(groupedPermissions).filter(key => !SECTION_ORDER.some(s => s.key === key)).map(key => (
                      <div key={key} className="bg-white dark:bg-slate-700/50 rounded-lg p-3 border border-gray-200 dark:border-slate-600 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 border-b dark:border-slate-600 pb-1">
                          {key} (Sin Clasificar)
                        </h4>
                        <div className="grid grid-cols-1 gap-1">
                          {groupedPermissions[key].map(perm => (
                            <div key={perm.id} className="flex items-center p-1">
                              <input
                                type="checkbox"
                                id={`perm-${perm.id}`}
                                checked={rolePermissionsState.has(perm.id)}
                                onChange={() => handleTogglePermission(perm.id)}
                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <label htmlFor={`perm-${perm.id}`} className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                                {ACTION_LABELS[perm.action] || perm.action}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex justify-end pt-3 border-t dark:border-gray-700">
                  <Button onClick={handleSavePermissions} variant="primary">Guardar Permisos</Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-full mb-3">
                  <AdminIcon className="w-12 h-12 opacity-50" />
                </div>
                <p>Haga clic en un rol de la izquierda para ver y editar sus permisos.</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsersView;
