
import React, { useState } from 'react';
import { Department } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/Modal';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PlusIcon from '../components/icons/PlusIcon';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
// Hooks
import { useDepartments, useDepartmentMutations } from '../hooks/useDepartments';

interface DepartmentsViewProps {
  onNavigateBack?: () => void;
}

const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  onNavigateBack,
}) => {
  const { can } = useAuth();
  const { notify } = useNotification();

  // Data & Mutations
  const { data: departments = [], isLoading } = useDepartments();
  const { createDepartment, updateDepartment, deleteDepartment } = useDepartmentMutations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState<Omit<Department, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>({
    name: '',
    description: '',
    is_active: true,
  });
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({ name: '', description: '', is_active: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setModalMode('edit');
    setSelectedDepartment(dept);
    setFormData({ name: dept.name, description: dept.description || '', is_active: dept.is_active });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notify.error('El nombre del departamento es obligatorio.');
      return;
    }

    if (modalMode === 'add') {
      createDepartment.mutate(formData, {
        onSuccess: () => {
          notify.success('Departamento creado exitosamente.');
          setIsModalOpen(false);
        },
        onError: (err) => notify.error(`Error al crear departamento: ${err.message}`)
      });
    } else if (modalMode === 'edit' && selectedDepartment) {
      updateDepartment.mutate({ ...selectedDepartment, ...formData }, {
        onSuccess: () => {
          notify.success('Departamento actualizado exitosamente.');
          setIsModalOpen(false);
        },
        onError: (err) => notify.error(`Error al actualizar departamento: ${err.message}`)
      });
    }
  };

  const handleDeleteConfirmed = () => {
    if (departmentToDelete) {
      deleteDepartment.mutate(departmentToDelete.id, {
        onSuccess: () => {
          notify.success('Departamento eliminado.');
          setDepartmentToDelete(null);
        },
        onError: (err) => notify.error(`Error al eliminar departamento: ${err.message}`)
      });
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Cargando departamentos...</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Departamentos</h1>
        <div className="flex space-x-2">
          {can('create', 'Department') && (
            <Button onClick={handleOpenAdd} variant="primary"><PlusIcon className="w-5 h-5 mr-2" /> Nuevo Departamento</Button>
          )}
          {onNavigateBack && <Button onClick={onNavigateBack} variant="secondary">Volver</Button>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Departamentos</CardTitle>
          <CardDescription>Gestione la estructura organizativa de la institución.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                {departments.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No hay departamentos registrados.</td></tr>
                ) : (
                  departments.map(dept => (
                    <tr key={dept.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{dept.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{dept.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${dept.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {dept.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center space-x-2">
                          {can('update', 'Department') && (
                            <Button variant="accent" size="sm" onClick={() => handleOpenEdit(dept)} className="font-bold">
                              <EditIcon className="w-4 h-4 mr-1.5" /> Editar
                            </Button>
                          )}
                          {can('delete', 'Department') && (
                            <Button variant="danger" size="sm" onClick={() => setDepartmentToDelete(dept)} className="font-bold">
                              <TrashIcon className="w-4 h-4 mr-1.5" /> Eliminar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'add' ? 'Añadir Departamento' : 'Editar Departamento'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
            disabled={modalMode === 'edit' && !can('update', 'Department')}
          />
          <Textarea
            label="Descripción"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            disabled={modalMode === 'edit' && !can('update', 'Department')}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              disabled={modalMode === 'edit' && !can('update', 'Department')}
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">Activo</label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            {((modalMode === 'add' && can('create', 'Department')) || (modalMode === 'edit' && can('update', 'Department'))) && (
              <Button type="submit" variant="primary">Guardar</Button>
            )}
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!departmentToDelete} onClose={() => setDepartmentToDelete(null)} title="Eliminar Departamento">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">¿Está seguro que desea eliminar el departamento <strong>{departmentToDelete?.name}</strong>? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setDepartmentToDelete(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteConfirmed}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepartmentsView;
