
// views/TasksView.tsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Task, TaskSchedule } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import ParticipantSelectorModal, { SelectorParticipant } from '../components/ParticipantSelectorModal';
import { useAuth } from '../contexts/AuthContext';
import { usePeriod } from '../contexts/PeriodContext';
import { useNotification } from '../contexts/NotificationContext';

// Hooks
import { useTasks, useTaskAssignments, useTaskUserAssignments, useTaskSchedules, useTaskMutations } from '../hooks/useTasks';
import { useDepartments } from '../hooks/useDepartments';
import { useParticipants } from '../hooks/useParticipants';
import { useUsers } from '../hooks/useUsers';
import { useUserDepartments } from '../hooks/useUserDepartments';
import { useMeetingCategories } from '../hooks/useMeetingCategories';
import { useParticipantMeetingCategories } from '../hooks/useParticipantMeetingCategories';

interface TasksViewProps {
    onNavigateBack?: () => void;
    initialTaskToEdit?: Task | null;
    onClearEditingTask?: () => void;
}

const formatTo12Hour = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${minutes} ${ampm}`;
};

const calculateDuration = (start: string, end: string) => {
    const s = new Date(`1970-01-01T${start}`);
    const e = new Date(`1970-01-01T${end}`);
    const diffMs = e.getTime() - s.getTime();
    if (diffMs <= 0) return '';
    const diffHrs = diffMs / (1000 * 60 * 60);
    return `${diffHrs.toFixed(1)} hrs`;
}

const priorityTranslations: Record<string, string> = {
    high: 'ALTA',
    medium: 'MEDIA',
    low: 'BAJA'
};

const TasksView: React.FC<TasksViewProps> = ({
    onNavigateBack,
    initialTaskToEdit,
    onClearEditingTask
}) => {
    const { can } = useAuth();
    const { isInCurrentPeriod } = usePeriod();
    const { notify } = useNotification();

    // Data Hooks
    const { data: tasks = [] } = useTasks();
    const { data: taskAssignments = [] } = useTaskAssignments();
    const { data: taskUserAssignments = [] } = useTaskUserAssignments();
    const { data: taskSchedules = [] } = useTaskSchedules();
    const { data: departments = [] } = useDepartments();
    const { data: participants = [] } = useParticipants();
    const { data: users = [] } = useUsers();
    const { data: userDepartments = [] } = useUserDepartments();
    const { data: meetingCategories = [] } = useMeetingCategories();
    const { data: participantMeetingCategories = [] } = useParticipantMeetingCategories();

    // Mutations
    const { createTask, updateTask, deleteTask } = useTaskMutations();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [formData, setFormData] = useState<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'created_by' | 'lastUpdated'>>({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        department_id: '',
    });

    // Assignment State
    const [assignedParticipantIds, setAssignedParticipantIds] = useState<string[]>([]);
    const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);

    // Schedule State
    const [currentSchedules, setCurrentSchedules] = useState<Omit<TaskSchedule, 'id' | 'task_id'>[]>([]);
    const [scheduleInput, setScheduleInput] = useState({ date: '', endDate: '', startTime: '', endTime: '' });
    const [isDateRange, setIsDateRange] = useState(false);

    // Modals
    const [isParticipantSelectorOpen, setIsParticipantSelectorOpen] = useState(false);
    const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false);

    // Filters
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');

    const handleOpenAdd = () => {
        setModalMode('add');
        setFormData({
            title: '',
            description: '',
            status: 'pending',
            priority: 'medium',
            department_id: '',
        });
        setAssignedParticipantIds([]);
        setAssignedUserIds([]);
        setCurrentSchedules([]);
        setScheduleInput({ date: '', endDate: '', startTime: '', endTime: '' });
        setIsDateRange(false);
        setIsModalOpen(true);
        if (onClearEditingTask) onClearEditingTask();
    };

    const handleOpenEdit = useCallback((task: Task) => {
        setModalMode('edit');
        setSelectedTask(task);
        setFormData({
            title: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.priority,
            department_id: task.department_id || '',
        });

        // Load Assignments
        const currentParticipantAssignments = taskAssignments.filter(ta => ta.task_id === task.id).map(ta => ta.participant_id);
        setAssignedParticipantIds(currentParticipantAssignments);

        const currentUserAssignments = taskUserAssignments.filter(tua => tua.task_id === task.id).map(tua => tua.user_id);
        setAssignedUserIds(currentUserAssignments);

        // Load Schedules
        const taskSpecificSchedules = taskSchedules.filter(ts => ts.task_id === task.id).map(({ id, task_id, ...rest }) => rest);
        setCurrentSchedules(taskSpecificSchedules);
        setScheduleInput({ date: '', endDate: '', startTime: '', endTime: '' });
        setIsDateRange(false);
        setIsModalOpen(true);
    }, [taskAssignments, taskUserAssignments, taskSchedules]);

    useEffect(() => {
        if (initialTaskToEdit) {
            handleOpenEdit(initialTaskToEdit);
            if (onClearEditingTask) onClearEditingTask();
        }
    }, [initialTaskToEdit, handleOpenEdit, onClearEditingTask]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            notify.error("El título es obligatorio");
            return;
        }

        const taskPayload = {
            participantIds: assignedParticipantIds,
            userIds: assignedUserIds,
            schedules: currentSchedules
        };

        if (modalMode === 'add') {
            createTask.mutate({ task: formData, ...taskPayload }, {
                onSuccess: () => { notify.success('Tarea creada'); setIsModalOpen(false); },
                onError: (err) => notify.error(`Error creando tarea: ${err.message}`)
            });
        } else if (modalMode === 'edit' && selectedTask) {
            updateTask.mutate({ task: { ...selectedTask, ...formData }, ...taskPayload }, {
                onSuccess: () => { notify.success('Tarea actualizada'); setIsModalOpen(false); },
                onError: (err) => notify.error(`Error actualizando tarea: ${err.message}`)
            });
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm("¿Está seguro de eliminar esta tarea?")) {
            deleteTask.mutate(id, {
                onSuccess: () => notify.success("Tarea eliminada"),
                onError: (err) => notify.error(`Error eliminando tarea: ${err.message}`)
            });
        }
    };

    const addSchedule = () => {
        if (!scheduleInput.startTime || !scheduleInput.endTime) {
            alert('Debe especificar la hora de inicio y fin.');
            return;
        }
        if (scheduleInput.endTime <= scheduleInput.startTime) {
            alert('La hora de fin debe ser posterior a la de inicio.');
            return;
        }

        const newSchedules: Omit<TaskSchedule, 'id' | 'task_id'>[] = [];

        if (isDateRange) {
            if (!scheduleInput.date || !scheduleInput.endDate) {
                alert('Debe especificar la fecha de inicio y fin del rango.');
                return;
            }
            if (scheduleInput.endDate < scheduleInput.date) {
                alert('La fecha final debe ser igual o posterior a la inicial.');
                return;
            }

            const current = new Date(scheduleInput.date + 'T00:00:00');
            const end = new Date(scheduleInput.endDate + 'T00:00:00');

            while (current <= end) {
                newSchedules.push({
                    date: current.toISOString().split('T')[0],
                    start_time: scheduleInput.startTime,
                    end_time: scheduleInput.endTime
                });
                current.setDate(current.getDate() + 1);
            }

        } else {
            if (!scheduleInput.date) {
                alert('Debe especificar una fecha.');
                return;
            }
            newSchedules.push({
                date: scheduleInput.date,
                start_time: scheduleInput.startTime,
                end_time: scheduleInput.endTime
            });
        }

        setCurrentSchedules(prev => [...prev, ...newSchedules].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setScheduleInput(prev => ({ ...prev, date: '', endDate: '' }));
    };

    const removeSchedule = (index: number) => {
        setCurrentSchedules(currentSchedules.filter((_, i) => i !== index));
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
            case 'low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500 text-white';
            case 'in_progress': return 'bg-blue-500 text-white';
            case 'pending': return 'bg-gray-400 text-white';
            default: return 'bg-gray-400';
        }
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
            const matchesDept = filterDepartment === 'all' || task.department_id === filterDepartment;

            // Filter by fiscal period
            const taskSpecificSchedules = taskSchedules.filter(ts => ts.task_id === task.id);
            const hasSchedulesInPeriod = taskSpecificSchedules.some(ts => isInCurrentPeriod(ts.date));
            const hasNoSchedules = taskSpecificSchedules.length === 0;
            const matchesPeriod = hasSchedulesInPeriod || hasNoSchedules;

            return matchesStatus && matchesDept && matchesPeriod;
        });
    }, [tasks, filterStatus, filterDepartment, taskSchedules, isInCurrentPeriod]);

    // Derived list of users for the selected department
    const usersInSelectedDepartment = useMemo(() => {
        if (!formData.department_id) return [];
        const userIds = userDepartments.filter(ud => ud.department_id === formData.department_id).map(ud => ud.user_id);
        return users.filter(u => userIds.includes(u.id)).map(u => ({ id: u.id, name: u.full_name || 'Sin Nombre' }));
    }, [formData.department_id, userDepartments, users]);

    // Participants prepared for selector with grouping by multiple commissions
    const availableParticipantsForSelector = useMemo((): SelectorParticipant[] => {
        const result: SelectorParticipant[] = [];

        participants.forEach(p => {
            const commIds = participantMeetingCategories
                .filter(pmc => pmc.participant_id === p.id)
                .map(pmc => pmc.meeting_category_id);

            const isDisabled = assignedParticipantIds.includes(p.id);

            if (commIds.length === 0) {
                result.push({ id: p.id, name: p.name, group: 'Sin Comisión', isDisabled });
            } else {
                // Create an entry for EACH commission the participant belongs to
                commIds.forEach(cId => {
                    const cName = meetingCategories.find(mc => mc.id === cId)?.name || 'Desconocida';
                    result.push({ id: p.id, name: p.name, group: cName, isDisabled });
                });
            }
        });

        return result;
    }, [participants, participantMeetingCategories, meetingCategories, assignedParticipantIds]);

    const isReadOnly = modalMode === 'edit' && !can('update', 'Task');

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gestión de Tareas</h1>
                <div className="flex space-x-2">
                    {can('create', 'Task') && (
                        <Button onClick={handleOpenAdd} variant="primary"><PlusIcon className="w-5 h-5 mr-2" /> Nueva Tarea</Button>
                    )}
                    {onNavigateBack && <Button onClick={onNavigateBack} variant="secondary">Volver</Button>}
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="w-48">
                    <Select
                        label="Filtrar por Estado"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        options={[
                            { value: 'all', label: 'Todos' },
                            { value: 'pending', label: 'Pendiente' },
                            { value: 'in_progress', label: 'En Progreso' },
                            { value: 'completed', label: 'Completada' }
                        ]}
                    />
                </div>
                <div className="w-48">
                    <Select
                        label="Filtrar por Dept."
                        value={filterDepartment}
                        onChange={e => setFilterDepartment(e.target.value)}
                        options={[
                            { value: 'all', label: 'Todos' },
                            ...departments.map(d => ({ value: d.id, label: d.name }))
                        ]}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.length === 0 ? (
                    <p className="text-gray-500 col-span-full text-center py-10">No hay tareas que mostrar para el periodo seleccionado.</p>
                ) : (
                    filteredTasks.map(task => {
                        const assignedParticipants = taskAssignments.filter(ta => ta.task_id === task.id);
                        const assignedUsers = taskUserAssignments.filter(tua => tua.task_id === task.id);
                        const departmentName = departments.find(d => d.id === task.department_id)?.name || 'Sin Dept.';
                        const schedules = taskSchedules.filter(ts => ts.task_id === task.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        const nextSchedule = schedules.find(s => new Date(s.date) >= new Date(new Date().setHours(0, 0, 0, 0)));

                        return (
                            <Card key={task.id} className="border-l-4" style={{ borderLeftColor: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#eab308' : '#22c55e' }}>
                                <CardHeader className="pb-2 flex flex-row justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg">{task.title}</CardTitle>
                                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${getPriorityColor(task.priority)} border font-bold`}>
                                            {priorityTranslations[task.priority] || task.priority.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        {can('update', 'Task') && (
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(task)} className="h-8 w-8 !p-0 rounded-full flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30" title="Editar">
                                                <EditIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            </Button>
                                        )}
                                        {can('delete', 'Task') && (
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)} className="h-8 w-8 !p-0 rounded-full flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30" title="Eliminar">
                                                <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-600 dark:text-gray-200 mb-3 line-clamp-2">{task.description}</p>
                                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-300 mb-2">
                                        <span className="font-semibold bg-gray-100 dark:bg-gray-700 dark:text-gray-200 px-1 rounded">{departmentName}</span>
                                        {schedules.length > 0 ? (
                                            <span title={schedules.map(s => `${s.date}: ${formatTo12Hour(s.start_time)}-${formatTo12Hour(s.end_time)}`).join('\n')} className="dark:text-gray-200 font-medium">
                                                {nextSchedule ? `Próxima: ${new Date(nextSchedule.date).toLocaleDateString()}` : 'Ejecuciones finalizadas'}
                                            </span>
                                        ) : <span className="dark:text-gray-400 italic">Sin programación</span>}
                                    </div>
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t dark:border-slate-700">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(task.status)}`}>
                                            {task.status === 'in_progress' ? 'En Progreso' : task.status === 'completed' ? 'Completada' : 'Pendiente'}
                                        </span>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 dark:text-gray-300 font-medium">{assignedUsers.length} Personal</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-300 font-medium">{assignedParticipants.length} Externos</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'add' ? 'Nueva Tarea' : 'Editar Tarea'}>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                    <Input label="Título" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required autoFocus disabled={isReadOnly} />
                    <Textarea label="Descripción" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} disabled={isReadOnly} />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Estado"
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            options={[{ value: 'pending', label: 'Pendiente' }, { value: 'in_progress', label: 'En Progreso' }, { value: 'completed', label: 'Completada' }]}
                            disabled={isReadOnly}
                        />
                        <Select
                            label="Prioridad"
                            value={formData.priority}
                            onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                            options={[{ value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' }, { value: 'high', label: 'Alta' }]}
                            disabled={isReadOnly}
                        />
                    </div>

                    <Select
                        label="Departamento Responsable"
                        value={formData.department_id || ''}
                        onChange={e => {
                            setFormData({ ...formData, department_id: e.target.value });
                            setAssignedUserIds([]); // Clear users when department changes to ensure consistency
                        }}
                        options={[{ value: '', label: 'Seleccione...' }, ...departments.map(d => ({ value: d.id, label: d.name }))]}
                        disabled={isReadOnly}
                    />

                    {/* Assignments Section */}
                    <div className="space-y-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-md border dark:border-slate-600">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-1 dark:border-slate-600">Asignaciones</h4>

                        {/* Internal Users */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Personal del Departamento ({assignedUserIds.length})</label>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsUserSelectorOpen(true)}
                                className="w-full"
                                disabled={!formData.department_id || isReadOnly}
                                title={!formData.department_id ? "Seleccione un departamento primero" : ""}
                            >
                                Seleccionar Personal Interno
                            </Button>
                            {assignedUserIds.length > 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-h-16 overflow-y-auto">
                                    {assignedUserIds.map(id => users.find(u => u.id === id)?.full_name).filter(Boolean).join(', ')}
                                </div>
                            )}
                        </div>

                        {/* External Participants */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Participantes Externos ({assignedParticipantIds.length})</label>
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsParticipantSelectorOpen(true)} className="w-full" disabled={isReadOnly}>Seleccionar Externos</Button>
                            {assignedParticipantIds.length > 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-h-16 overflow-y-auto">
                                    {assignedParticipantIds.map(id => participants.find(p => p.id === id)?.name).filter(Boolean).join(', ')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schedules Section */}
                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-md border dark:border-slate-600">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Programación</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="dateRange"
                                    checked={isDateRange}
                                    onChange={(e) => setIsDateRange(e.target.checked)}
                                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    disabled={isReadOnly}
                                />
                                <label htmlFor="dateRange" className="text-xs text-gray-600 dark:text-gray-300 select-none cursor-pointer">Rango de fechas</label>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <Input
                                    label="Inicio"
                                    type="time"
                                    value={scheduleInput.startTime}
                                    onChange={e => setScheduleInput({ ...scheduleInput, startTime: e.target.value })}
                                    className="dark:[color-scheme:dark]"
                                    containerClassName="flex-1"
                                    disabled={isReadOnly}
                                />
                                <Input
                                    label="Fin"
                                    type="time"
                                    value={scheduleInput.endTime}
                                    onChange={e => setScheduleInput({ ...scheduleInput, endTime: e.target.value })}
                                    className="dark:[color-scheme:dark]"
                                    containerClassName="flex-1"
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="flex gap-2 items-end">
                                {isDateRange ? (
                                    <>
                                        <Input
                                            label="Desde"
                                            type="date"
                                            value={scheduleInput.date}
                                            onChange={e => setScheduleInput({ ...scheduleInput, date: e.target.value })}
                                            className="dark:[color-scheme:dark]"
                                            containerClassName="flex-1"
                                            disabled={isReadOnly}
                                        />
                                        <Input
                                            label="Hasta"
                                            type="date"
                                            value={scheduleInput.endDate}
                                            onChange={e => setScheduleInput({ ...scheduleInput, endDate: e.target.value })}
                                            className="dark:[color-scheme:dark]"
                                            containerClassName="flex-1"
                                            disabled={isReadOnly}
                                        />
                                    </>
                                ) : (
                                    <Input
                                        label="Fecha"
                                        type="date"
                                        value={scheduleInput.date}
                                        onChange={e => setScheduleInput({ ...scheduleInput, date: e.target.value })}
                                        className="dark:[color-scheme:dark]"
                                        containerClassName="flex-1"
                                        disabled={isReadOnly}
                                    />
                                )}
                                {!isReadOnly && (
                                    <Button type="button" variant="primary" onClick={addSchedule} className="h-[42px] w-[42px] !p-0 flex items-center justify-center flex-shrink-0">
                                        <PlusIcon className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {currentSchedules.length > 0 && (
                            <div className="mt-3 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                {currentSchedules.map((sch, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600">
                                        <span>
                                            {new Date(sch.date).toLocaleDateString(undefined, { timeZone: 'UTC' })} | {formatTo12Hour(sch.start_time)} - {formatTo12Hour(sch.end_time)}
                                            <span className="text-gray-500 text-xs ml-2">({calculateDuration(sch.start_time, sch.end_time)})</span>
                                        </span>
                                        {!isReadOnly && (
                                            <button type="button" onClick={() => removeSchedule(index)} className="text-red-500 hover:text-red-700">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="w-32 justify-center">Cancelar</Button>
                        {(!isReadOnly) && <Button type="submit" variant="primary" className="w-32 justify-center">Guardar</Button>}
                    </div>
                </form>
            </Modal>

            {/* Selector for External Participants */}
            <ParticipantSelectorModal
                isOpen={isParticipantSelectorOpen}
                onClose={() => setIsParticipantSelectorOpen(false)}
                onConfirm={(ids) => { setAssignedParticipantIds(ids); setIsParticipantSelectorOpen(false); }}
                title="Asignar Participantes Externos"
                availableParticipants={availableParticipantsForSelector}
                initialSelectedIds={assignedParticipantIds}
            />

            {/* Selector for Internal Users (Department Staff) */}
            <ParticipantSelectorModal
                isOpen={isUserSelectorOpen}
                onClose={() => setIsUserSelectorOpen(false)}
                onConfirm={(ids) => { setAssignedUserIds(ids); setIsUserSelectorOpen(false); }}
                title={`Asignar Personal (${departments.find(d => d.id === formData.department_id)?.name || '...'})`}
                availableParticipants={usersInSelectedDepartment}
                initialSelectedIds={assignedUserIds}
            />
        </div>
    );
};

export default TasksView;
