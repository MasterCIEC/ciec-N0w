import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Meeting, Event
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { usePeriod } from '../contexts/PeriodContext';
import Button from '../components/ui/Button';
import Modal from '../components/Modal';
import Input from '../components/ui/Input';
import ChevronLeftIcon from '../components/icons/ChevronLeftIcon';
import ChevronRightIcon from '../components/icons/ChevronRightIcon';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import EmailIcon from '../components/icons/EmailIcon';
import CalendarSyncIcon from '../components/icons/CalendarSyncIcon';
import CopyIcon from '../components/icons/CopyIcon';

// Hooks
import { useMeetings, useMeetingMutations } from '../hooks/useMeetings';
import { useEvents, useEventMutations } from '../hooks/useEvents';
import { useTasks, useTaskMutations } from '../hooks/useTasks';
import { useTaskSchedules } from '../hooks/useTaskSchedules';
import { useMeetingCategories } from '../hooks/useMeetingCategories';
import { useEventCategories } from '../hooks/useEventCategories';
import { useEventRelations } from '../hooks/useEventRelations';
import { useDepartments } from '../hooks/useDepartments';
import { useUsers } from '../hooks/useUsers';

interface AgendaViewProps {
    onEditMeeting: (meeting: Meeting) => void;
    onEditEvent: (event: Event) => void;
    onEditTask: (task: any) => void;
}

type BaseAgendaItem = {
    id: string;
    date: string;
    startTime: string; // normalized
    endTime?: string;
    subject: string;
    location?: string;
    description?: string;
};

type MeetingAgendaItem = BaseAgendaItem & {
    type: 'meeting';
    originalMeeting: Meeting;
    meetingCategoryId: string;
    externalParticipantsCount?: number;
};

type EventAgendaItem = BaseAgendaItem & {
    type: 'event';
    originalEvent: Event;
    organizerType: 'meeting_category' | 'category';
    externalParticipantsCount?: number;
};

type TaskAgendaItem = BaseAgendaItem & {
    type: 'task';
    originalTask: any;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
    departmentName: string;
};

type AgendaItem = MeetingAgendaItem | EventAgendaItem | TaskAgendaItem;

const priorityTranslations: Record<string, string> = {
    high: 'ALTA',
    medium: 'MEDIA',
    low: 'BAJA'
};

const formatTo12Hour = (timeString: string | null | undefined): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    if (isNaN(h)) return timeString;
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${minutes} ${ampm}`;
};

const AgendaView: React.FC<AgendaViewProps> = ({
    onEditMeeting, onEditEvent, onEditTask
}) => {
    const { can } = useAuth();
    const { notify } = useNotification();
    const { isInCurrentPeriod, startDate, endDate } = usePeriod();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [itemToView, setItemToView] = useState<AgendaItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<AgendaItem | null>(null);

    // Data Hooks
    const { data: meetings = [] } = useMeetings();
    const { data: events = [] } = useEvents();
    const { data: tasks = [] } = useTasks();
    const { data: taskSchedules = [] } = useTaskSchedules();
    const { data: meetingCategories = [] } = useMeetingCategories();
    const { data: eventCategories = [] } = useEventCategories();
    const { eventOrganizingMeetingCategories, eventOrganizingCategories } = useEventRelations();
    const { data: departments = [] } = useDepartments();
    const { data: users = [] } = useUsers();

    const { deleteMeeting } = useMeetingMutations();
    const { deleteEvent } = useEventMutations();
    const { deleteTask } = useTaskMutations();

    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [syncUrl, setSyncUrl] = useState('');

    useEffect(() => {
        if (currentDate < startDate || currentDate > endDate) {
            setCurrentDate(new Date(startDate));
        }
    }, [startDate, endDate]);

    const getMeetingCategoryName = useCallback((id: string) => meetingCategories.find(c => c.id === id)?.name || 'Desconocida', [meetingCategories]);
    const getEventCategoryName = useCallback((id: string) => eventCategories.find(c => c.id === id)?.name || 'Desconocida', [eventCategories]);
    const getDepartmentName = useCallback((id: string | null | undefined) => departments.find(d => d.id === id)?.name || 'Sin Dept.', [departments]);

    const getDisplayOrganizerNameForEvent = useCallback((item: EventAgendaItem): string => {
        const eventId = item.originalEvent.id;
        if (item.originalEvent.organizerType === 'meeting_category') {
            const orgLinks = (eventOrganizingMeetingCategories || []).filter((eoc: any) => eoc.event_id === eventId);
            return orgLinks.map((eoc: any) => getMeetingCategoryName(eoc.meeting_category_id)).join(', ') || 'Sin Categoría';
        } else {
            const orgLinks = (eventOrganizingCategories || []).filter((eoc: any) => eoc.event_id === eventId);
            return orgLinks.map((eoc: any) => getEventCategoryName(eoc.category_id)).join(', ') || 'Sin Categoría';
        }
    }, [eventOrganizingMeetingCategories, eventOrganizingCategories, getMeetingCategoryName, getEventCategoryName]);

    const getUserName = (userId: string | null | undefined) => {
        if (!userId) return 'Sistema';
        return users.find(u => u.id === userId)?.full_name || 'Usuario Desconocido';
    };

    const formatAuditDate = (dateString: string | null | undefined) => dateString ? new Date(dateString).toLocaleString('es-ES') : 'N/A';

    const allAgendaItems = useMemo(() => {
        const items: AgendaItem[] = [];

        meetings.filter(m => isInCurrentPeriod(m.date)).forEach(m => {
            items.push({
                type: 'meeting',
                id: m.id,
                date: m.date,
                startTime: m.startTime || '00:00',
                endTime: m.endTime,
                subject: m.subject,
                location: m.location || '',
                description: m.description || '',
                originalMeeting: m,
                meetingCategoryId: m.meetingCategoryId,
                externalParticipantsCount: m.externalParticipantsCount
            } as MeetingAgendaItem);
        });

        events.filter(e => isInCurrentPeriod(e.date)).forEach(e => {
            items.push({
                type: 'event',
                id: e.id,
                date: e.date,
                startTime: e.startTime || '00:00',
                endTime: e.endTime,
                subject: e.subject,
                location: e.location || '',
                description: e.description || '',
                originalEvent: e,
                organizerType: e.organizerType,
                externalParticipantsCount: e.externalParticipantsCount
            } as EventAgendaItem);
        });

        taskSchedules.filter((ts: any) => isInCurrentPeriod(ts.date)).forEach((ts: any) => {
            const parentTask = tasks.find(t => t.id === ts.task_id);
            if (parentTask) {
                items.push({
                    type: 'task',
                    id: `${ts.task_id}_${ts.id}`,
                    date: ts.date,
                    startTime: ts.start_time,
                    endTime: ts.end_time,
                    subject: parentTask.title,
                    location: '',
                    description: parentTask.description || '',
                    originalTask: parentTask,
                    priority: parentTask.priority,
                    status: parentTask.status,
                    departmentName: getDepartmentName(parentTask.department_id)
                } as TaskAgendaItem);
            }
        });

        return items.sort((a, b) => {
            if (a.startTime === b.startTime) return a.subject.localeCompare(b.subject);
            return a.startTime.localeCompare(b.startTime);
        });
    }, [meetings, events, tasks, taskSchedules, isInCurrentPeriod, getDepartmentName]);

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setDate(1);
            newDate.setMonth(currentDate.getMonth() - 1);
        }
        else if (viewMode === 'week') newDate.setDate(currentDate.getDate() - 7);
        else newDate.setDate(currentDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setDate(1);
            newDate.setMonth(currentDate.getMonth() + 1);
        }
        else if (viewMode === 'week') newDate.setDate(currentDate.getDate() + 7);
        else newDate.setDate(currentDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    const handleToday = () => setCurrentDate(new Date());

    const handleSendInvitation = (item: AgendaItem) => {
        notify.info("La funcionalidad de enviar invitación desde esta vista rápida está en desarrollo. Por favor use la vista de edición.");
    };

    const handleSyncCalendar = () => {
        const url = "https://zsbyslmvvfzhpenfpxzm.supabase.co/functions/v1/calendar-feed";
        const webcalUrl = url.replace(/^https:\/\//, 'webcal://');
        setSyncUrl(webcalUrl);
        setIsSyncModalOpen(true);
        navigator.clipboard.writeText(webcalUrl).then(() => {
            notify.success('Enlace copiado automáticamente.');
        }).catch(() => { });
    };

    const renderAgendaItem = (item: AgendaItem, idx: number, showDate: boolean = false) => {
        const getBadgeStyle = (type: 'meeting' | 'event' | 'task', statusOrCancel: boolean | string) => {
            if (type === 'meeting') {
                if (statusOrCancel) return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 line-through decoration-red-500 border-red-100 dark:border-red-500/20';
                return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20';
            }
            if (type === 'event') {
                if (statusOrCancel) return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 line-through decoration-red-500 border-red-100 dark:border-red-500/20';
                return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20';
            }
            return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20';
        };

        const isCancelled = item.type === 'meeting' ? item.originalMeeting.is_cancelled : (item.type === 'event' ? item.originalEvent.is_cancelled : false);
        const itemStyle = getBadgeStyle(item.type, isCancelled);

        return (
            <button
                key={`${item.type}-${item.id}-${idx}`}
                onClick={() => setItemToView(item)}
                className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all duration-200 mb-1.5 flex flex-col group shadow-sm hover:shadow-md ${itemStyle}`}
                title={`${item.startTime} - ${item.subject}`}
            >
                <div className="flex justify-between items-start w-full mb-0.5">
                    <span className="text-[10px] font-bold tracking-wide opacity-80">{item.startTime}</span>
                    {showDate && <span className="text-[9px] font-semibold opacity-60 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded-full">{new Date(item.date).getDate()}</span>}
                </div>
                <span className="truncate w-full font-semibold text-xs leading-tight">{item.subject}</span>
                {item.type === 'task' && (
                    <div className="flex items-center gap-1 mt-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.priority === 'high' ? 'bg-red-500' : (item.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500')}`}></span>
                        <span className="text-[9px] uppercase font-bold opacity-60 tracking-wider">
                            {priorityTranslations[(item as TaskAgendaItem).priority]?.substring(0, 3) || 'TAREA'}
                        </span>
                    </div>
                )}
            </button>
        );
    };

    const renderMonthView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();

        const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`blank-${i}`} className="min-h-[100px] bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800"></div>);
        const days = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayItems = allAgendaItems.filter(item => item.date === dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            return (
                <div key={day} className={`min-h-[100px] border border-gray-200 dark:border-slate-700 p-1 relative hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <span className={`text-sm font-semibold p-1 rounded-full w-7 h-7 flex items-center justify-center ${isToday ? 'bg-primary-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {day}
                    </span>
                    <div className="mt-1 space-y-1">
                        {dayItems.map((item, idx) => renderAgendaItem(item, idx))}
                    </div>
                </div>
            );
        });

        return (
            <div className="grid grid-cols-7 gap-0">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="text-center font-bold text-gray-500 dark:text-gray-400 py-2 border-b dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-sm uppercase">
                        {day}
                    </div>
                ))}
                {blanks}
                {days}
            </div>
        );
    };

    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(currentDate.getDate() - day);

        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            return d;
        });

        return (
            <div className="grid grid-cols-7 gap-0 h-full min-h-[500px]">
                {weekDays.map((d, i) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const dayItems = allAgendaItems.filter(item => item.date === dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];

                    return (
                        <div key={i} className={`border-r border-gray-200 dark:border-slate-700 last:border-r-0 flex flex-col ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                            <div className="text-center py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{dayName}</div>
                                <div className={`text-lg font-bold ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-100'}`}>{d.getDate()}</div>
                            </div>
                            <div className="flex-grow p-1 space-y-1 overflow-y-auto">
                                {dayItems.map((item, idx) => renderAgendaItem(item, idx))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayItems = allAgendaItems.filter(item => item.date === dateStr);

        return (
            <div className="flex flex-col h-full min-h-[500px] bg-white dark:bg-slate-800 p-4">
                <div className="mb-4 text-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                {dayItems.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
                        No hay actividades programadas para este día.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dayItems.map((item, idx) => {
                            const itemElement = renderAgendaItem(item, idx);
                            const desc = item.type === 'meeting' ? item.originalMeeting.description : (item.type === 'event' ? item.originalEvent.description : (item as TaskAgendaItem).originalTask.description);
                            return (
                                <div key={idx} className="flex gap-4 items-start p-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
                                    <div className="w-16 text-right font-mono text-sm text-gray-500 dark:text-gray-400 pt-1">
                                        {item.startTime}
                                    </div>
                                    <div className="flex-grow">
                                        {itemElement}
                                        {desc && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-1 line-clamp-2">{desc}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const getHeaderDateLabel = () => {
        if (viewMode === 'month') return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        if (viewMode === 'day') return currentDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - currentDate.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        if (start.getMonth() === end.getMonth()) {
            return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]}`;
        }
        return `${start.getDate()} ${monthNames[start.getMonth()].substring(0, 3)} - ${end.getDate()} ${monthNames[end.getMonth()].substring(0, 3)}`;
    };

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 hidden sm:block">Agenda</h1>
                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-md shadow px-1 py-1">
                        <Button variant="ghost" size="sm" onClick={handlePrev} className="!p-1"><ChevronLeftIcon className="w-5 h-5" /></Button>
                        <Button variant="ghost" size="sm" onClick={handleToday} className="text-xs font-bold mx-1">Hoy</Button>
                        <Button variant="ghost" size="sm" onClick={handleNext} className="!p-1"><ChevronRightIcon className="w-5 h-5" /></Button>
                        <span className="mx-3 font-semibold min-w-[140px] text-center text-sm text-gray-800 dark:text-gray-200 select-none">{getHeaderDateLabel()}</span>
                    </div>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full xl:w-auto">
                    <div className="flex bg-gray-100 dark:bg-slate-700/50 p-1 rounded-xl border border-gray-200 dark:border-slate-600/50">
                        {(['month', 'week', 'day'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${viewMode === mode ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-white shadow-sm scale-105' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                {mode === 'month' ? 'Mes' : mode === 'week' ? 'Semana' : 'Día'}
                            </button>
                        ))}
                    </div>
                    <Button onClick={handleSyncCalendar} variant="outline" className="text-xs sm:text-sm" title="Sincronizar">
                        <CalendarSyncIcon className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Sincronizar</span>
                    </Button>
                </div>
            </div>

            <div className="flex-grow bg-white dark:bg-slate-800 rounded-lg shadow overflow-y-auto custom-scrollbar border dark:border-slate-700 flex flex-col">
                {viewMode === 'month' && renderMonthView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'day' && renderDayView()}
            </div>

            <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Sincronizar Calendario">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Enlace de suscripción (WebCal):</p>
                    <div className="flex items-center gap-2">
                        <Input readOnly value={syncUrl} className="flex-grow text-xs font-mono bg-gray-100 dark:bg-slate-700 select-all" />
                        <Button onClick={() => { navigator.clipboard.writeText(syncUrl); notify.success('Copiado'); }} variant="secondary" size="sm"><CopyIcon className="w-4 h-4" /></Button>
                    </div>
                </div>
                <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
                    <Button onClick={() => setIsSyncModalOpen(false)} variant="primary">Cerrar</Button>
                </div>
            </Modal>

            {itemToView && (
                <Modal isOpen={!!itemToView} onClose={() => setItemToView(null)} title="Detalles">
                    {(() => {
                        const item = itemToView;
                        if (!item) return null;
                        const originalItem = item.type === 'meeting' ? item.originalMeeting : (item.type === 'event' ? item.originalEvent : (item as TaskAgendaItem).originalTask);
                        const isCancelled = item.type === 'meeting' ? item.originalMeeting.is_cancelled : (item.type === 'event' ? item.originalEvent.is_cancelled : false);

                        return (
                            <div className="space-y-3">
                                <h3 className={`text-xl font-semibold ${isCancelled ? 'line-through' : ''}`}>{item.subject}</h3>
                                <div className="mt-3 pt-3 border-t dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    <p><strong>Fecha:</strong> {new Date(item.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                                    <p><strong>Hora:</strong> {item.startTime} - {item.endTime}</p>
                                </div>
                                <div className="mt-4 flex gap-2 justify-end">
                                    <Button variant="danger" size="sm" onClick={() => setItemToDelete(item)}><TrashIcon className="w-4 h-4 mr-1" /> Eliminar</Button>
                                    <Button variant="accent" size="sm" onClick={() => {
                                        if (item.type === 'meeting') onEditMeeting(item.originalMeeting);
                                        else if (item.type === 'event') onEditEvent(item.originalEvent);
                                        else if (item.type === 'task') onEditTask((item as TaskAgendaItem).originalTask);
                                    }}><EditIcon className="w-4 h-4 mr-1" /> Editar</Button>
                                </div>
                            </div>
                        );
                    })()}
                </Modal>
            )}

            <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Confirmar Eliminación">
                {itemToDelete && (
                    <div className="text-sm">
                        <p className="mb-4">¿Eliminar <strong>{itemToDelete.subject}</strong>?</p>
                        <div className="flex justify-end space-x-2">
                            <Button variant="secondary" onClick={() => setItemToDelete(null)}>Cancelar</Button>
                            <Button variant="danger" onClick={() => {
                                if (itemToDelete.type === 'meeting') deleteMeeting.mutate(itemToDelete.id);
                                else if (itemToDelete.type === 'event') deleteEvent.mutate(itemToDelete.id);
                                else if (itemToDelete.type === 'task') deleteTask.mutate(itemToDelete.id);
                                setItemToDelete(null);
                                notify.success("Eliminado");
                            }}>Sí, Eliminar</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AgendaView;
