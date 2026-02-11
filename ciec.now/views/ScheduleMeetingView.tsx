
// views/ScheduleMeetingView.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Meeting, MeetingCategory, ScheduleEntry } from '../types';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import { generateId } from '../constants';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import { useAuth } from '../contexts/AuthContext';
import { usePeriod } from '../contexts/PeriodContext';
import AddToGoogleCalendar from '../components/AddToGoogleCalendar';
import ParticipantSelectorModal, { SelectorParticipant } from '../components/ParticipantSelectorModal';
import { useNotification } from '../contexts/NotificationContext';
import GridIcon from '../components/icons/GridIcon';
import ListIcon from '../components/icons/ListIcon';
import { Card, CardContent } from '../components/ui/Card';

// Hooks
import { useMeetings, useMeetingMutations, useMeetingAttendees, useMeetingInvitees } from '../hooks/useMeetings';
import { useParticipants } from '../hooks/useParticipants';
import { useMeetingCategories, useMeetingCategoryMutations } from '../hooks/useMeetingCategories';
import { useParticipantMeetingCategories } from '../hooks/useParticipantMeetingCategories';
import { useUsers } from '../hooks/useUsers';

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialMeetingFormState: Omit<Meeting, 'id'> = {
  subject: '',
  meetingCategoryId: '',
  date: getTodayDateString(),
  startTime: '',
  endTime: '',
  location: '',
  externalParticipantsCount: 0,
  description: '',
  is_cancelled: false,
};

const TOTAL_STEPS_CREATE = 4;
type ModalMode = 'create' | 'edit' | 'view';

const formatTo12Hour = (timeString: string | null | undefined): string => {
  if (!timeString) return 'N/A';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  if (isNaN(h) || !minutes) return timeString;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${minutes} ${ampm}`;
};

interface ScheduleMeetingViewProps {
  initialMeetingToEdit?: Meeting | null;
  onClearEditingMeeting?: () => void;
  onNavigateBack?: () => void;
}

const ScheduleMeetingView: React.FC<ScheduleMeetingViewProps> = ({
  initialMeetingToEdit,
  onClearEditingMeeting,
  onNavigateBack,
}) => {
  const { can } = useAuth();
  const { isInCurrentPeriod } = usePeriod();
  const { notify } = useNotification();

  // Data Hooks
  const { data: meetings = [] } = useMeetings();
  const { data: participants = [] } = useParticipants();
  const { data: meetingCategories = [] } = useMeetingCategories();
  const { data: meetingAttendees = [] } = useMeetingAttendees();
  const { data: meetingInvitees = [] } = useMeetingInvitees();
  const { data: participantMeetingCategories = [] } = useParticipantMeetingCategories();
  const { data: users = [] } = useUsers();

  // Mutations
  const { createComplexMeeting, updateComplexMeeting, deleteMeeting } = useMeetingMutations();
  const { createMeetingCategory } = useMeetingCategoryMutations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [meetingForViewOrEdit, setMeetingForViewOrEdit] = useState<Meeting | null>(null);
  const [formData, setFormData] = useState<Omit<Meeting, 'id'>>(initialMeetingFormState);
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<string[]>([]);
  const [selectedAttendeesInPerson, setSelectedAttendeesInPerson] = useState<string[]>([]);
  const [selectedAttendeesOnline, setSelectedAttendeesOnline] = useState<string[]>([]);
  const [showExternalParticipants, setShowExternalParticipants] = useState(false);

  const [currentSchedules, setCurrentSchedules] = useState<ScheduleEntry[]>([]);
  const [scheduleInput, setScheduleInput] = useState({ date: '', endDate: '', startTime: '', endTime: '' });
  const [isDateRange, setIsDateRange] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [isParticipantSelectorModalOpen, setIsParticipantSelectorModalOpen] = useState(false);
  const [participantSelectionMode, setParticipantSelectionMode] = useState<'attendeesInPerson' | 'attendeesOnline' | 'invitees' | null>(null);

  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isCategoryListVisible, setIsCategoryListVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const getUserName = useCallback((userId: string | null | undefined) => {
    if (!userId) return 'Sistema';
    return users.find(u => u.id === userId)?.full_name || 'Usuario Desconocido';
  }, [users]);

  const formatAuditDate = (dateString: string | null | undefined) => dateString ? new Date(dateString).toLocaleString('es-ES') : 'N/A';
  const getParticipantName = (id: string) => participants.find(p => p.id === id)?.name || 'Desconocido';
  const getMeetingCategoryName = useCallback((id: string) => meetingCategories.find(c => c.id === id)?.name || 'Categoría Desconocida', [meetingCategories]);

  useEffect(() => {
    if (initialMeetingToEdit && !isModalOpen) {
      setMeetingForViewOrEdit(initialMeetingToEdit);
      setFormData({
        subject: initialMeetingToEdit.subject,
        meetingCategoryId: initialMeetingToEdit.meetingCategoryId,
        date: initialMeetingToEdit.date,
        startTime: initialMeetingToEdit.startTime,
        endTime: initialMeetingToEdit.endTime || '',
        location: initialMeetingToEdit.location || '',
        externalParticipantsCount: initialMeetingToEdit.externalParticipantsCount || 0,
        description: initialMeetingToEdit.description || '',
        is_cancelled: initialMeetingToEdit.is_cancelled,
      });
      const currentAttendees = meetingAttendees.filter(ma => ma.meeting_id === initialMeetingToEdit.id);
      setSelectedAttendeesInPerson(currentAttendees.filter(ma => ma.attendance_type === 'in_person').map(ma => ma.participant_id));
      setSelectedAttendeesOnline(currentAttendees.filter(ma => ma.attendance_type === 'online').map(ma => ma.participant_id));
      const currentInvitees = meetingInvitees.filter(mi => mi.meeting_id === initialMeetingToEdit.id).map(mi => mi.participant_id);
      setSelectedInviteeIds(currentInvitees);
      setModalMode('edit');
      setCurrentStep(1);
      setFormErrors({});
      setShowExternalParticipants(false);
      setIsModalOpen(true);
    }
  }, [initialMeetingToEdit, isModalOpen, meetingAttendees, meetingInvitees]);

  useEffect(() => {
    if (isModalOpen && meetingForViewOrEdit && (modalMode === 'edit' || modalMode === 'view')) {
      setFormData({
        subject: meetingForViewOrEdit.subject,
        meetingCategoryId: meetingForViewOrEdit.meetingCategoryId,
        date: meetingForViewOrEdit.date,
        startTime: meetingForViewOrEdit.startTime,
        endTime: meetingForViewOrEdit.endTime || '',
        location: meetingForViewOrEdit.location || '',
        externalParticipantsCount: meetingForViewOrEdit.externalParticipantsCount || 0,
        description: meetingForViewOrEdit.description || '',
        is_cancelled: meetingForViewOrEdit.is_cancelled,
      });
      const currentAttendees = meetingAttendees.filter(ma => ma.meeting_id === meetingForViewOrEdit.id);
      setSelectedAttendeesInPerson(currentAttendees.filter(ma => ma.attendance_type === 'in_person').map(ma => ma.participant_id));
      setSelectedAttendeesOnline(currentAttendees.filter(ma => ma.attendance_type === 'online').map(ma => ma.participant_id));
      const currentInvitees = meetingInvitees.filter(mi => mi.meeting_id === meetingForViewOrEdit.id).map(mi => mi.participant_id);
      setSelectedInviteeIds(currentInvitees);
    }
  }, [meetingForViewOrEdit, isModalOpen, modalMode, meetingAttendees, meetingInvitees]);

  const handleOpenCreateModal = () => {
    setMeetingForViewOrEdit(null);
    setFormData({ ...initialMeetingFormState, date: getTodayDateString(), endTime: '' });
    setSelectedAttendeesInPerson([]);
    setSelectedAttendeesOnline([]);
    setSelectedInviteeIds([]);
    setCurrentSchedules([]);
    setScheduleInput({ date: '', endDate: '', startTime: '', endTime: '' });
    setIsDateRange(false);
    setCurrentStep(1);
    setFormErrors({});
    setShowExternalParticipants(false);
    setModalMode('create');
    setIsModalOpen(true);
    if (onClearEditingMeeting) onClearEditingMeeting();
  };

  const handleOpenViewModal = (meeting: Meeting) => {
    setMeetingForViewOrEdit(meeting);
    setFormErrors({});
    setModalMode('view');
    setIsModalOpen(true);
    if (onClearEditingMeeting) onClearEditingMeeting();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setMeetingForViewOrEdit(null);
    setFormData(initialMeetingFormState);
    setSelectedAttendeesInPerson([]);
    setSelectedAttendeesOnline([]);
    setSelectedInviteeIds([]);
    setCurrentStep(1);
    setFormErrors({});
    setShowExternalParticipants(false);
    if (onClearEditingMeeting) onClearEditingMeeting();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCategoryChangeForCreate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoryId = e.target.value;
    const newCategoryName = meetingCategories.find(c => c.id === newCategoryId)?.name || '';
    setFormData(prev => {
      const oldCategoryId = prev.meetingCategoryId;
      const oldCategoryName = meetingCategories.find(c => c.id === oldCategoryId)?.name || '';
      const oldDefaultSubject = oldCategoryId ? `Reunión ${oldCategoryName}` : '';
      const shouldUpdateSubject = !prev.subject.trim() || prev.subject.trim() === oldDefaultSubject.trim();
      return {
        ...prev,
        meetingCategoryId: newCategoryId,
        subject: shouldUpdateSubject ? (newCategoryId ? `Reunión ${newCategoryName}` : '') : prev.subject
      };
    });
    setShowExternalParticipants(false);
    if (formErrors.meetingCategoryId) setFormErrors(prev => ({ ...prev, meetingCategoryId: '' }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' ? 0 : parseFloat(value) }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const addSchedule = () => {
    if (!scheduleInput.startTime) {
      alert('Debe especificar la hora de inicio.');
      return;
    }
    if (scheduleInput.endTime && scheduleInput.endTime <= scheduleInput.startTime) {
      alert('La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    const newSchedules: ScheduleEntry[] = [];

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
          startTime: scheduleInput.startTime,
          endTime: scheduleInput.endTime
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
        startTime: scheduleInput.startTime,
        endTime: scheduleInput.endTime
      });
    }

    setCurrentSchedules(prev => [...prev, ...newSchedules].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setScheduleInput(prev => ({ ...prev, date: '', endDate: '' }));
  };

  const removeSchedule = (index: number) => {
    setCurrentSchedules(currentSchedules.filter((_, i) => i !== index));
  };

  const validateCreateStep = () => {
    const errors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!formData.subject.trim()) errors.subject = 'El asunto es obligatorio.';
      if (!formData.meetingCategoryId) errors.meetingCategoryId = 'Debe seleccionar una categoría.';
    }
    else if (currentStep === 2) {
      if (currentSchedules.length === 0) {
        errors.schedule = 'Debe agregar al menos un horario en la programación.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.subject.trim()) errors.subject = 'El asunto es obligatorio.';
    if (!formData.meetingCategoryId) errors.meetingCategoryId = 'Debe seleccionar una categoría.';
    if (!formData.date) errors.date = 'La fecha es obligatoria.';
    if (!formData.startTime) errors.startTime = 'La hora de inicio es obligatoria.';
    if (formData.endTime && formData.startTime && formData.endTime <= formData.startTime) errors.endTime = 'La hora de fin debe ser posterior a la hora de inicio.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStepOrCreate = () => {
    if (validateCreateStep()) {
      if (currentStep < TOTAL_STEPS_CREATE) {
        setCurrentStep(prev => prev + 1);
      } else {
        createComplexMeeting.mutate({
          meetingData: formData,
          schedules: currentSchedules,
          inviteeIds: selectedInviteeIds,
          attendeesInPersonIds: selectedAttendeesInPerson,
          attendeesOnlineIds: selectedAttendeesOnline
        }, {
          onSuccess: () => {
            notify.success('Reunión(es) creada(s) correctamente.');
            handleCloseModal();
          },
          onError: (err) => notify.error(`Error al crear: ${err.message}`)
        });
      }
    }
  };

  const handlePrevStep = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };

  const handleUpdateSubmit = () => {
    if (meetingForViewOrEdit && validateEditForm()) {
      updateComplexMeeting.mutate({
        meetingId: meetingForViewOrEdit.id,
        meetingData: formData,
        inviteeIds: selectedInviteeIds,
        attendeesInPersonIds: selectedAttendeesInPerson,
        attendeesOnlineIds: selectedAttendeesOnline
      }, {
        onSuccess: () => {
          notify.success('Reunión actualizada correctamente.');
          handleCloseModal();
        },
        onError: (err) => notify.error(`Error al actualizar: ${err.message}`)
      });
    }
  };

  const handleDeleteMeeting = () => {
    if (meetingToDelete) {
      deleteMeeting.mutate(meetingToDelete.id, {
        onSuccess: () => {
          notify.success('Reunión eliminada');
          setMeetingToDelete(null);
          setIsModalOpen(false);
        },
        onError: (err) => notify.error(`Error: ${err.message}`)
      });
    }
  };

  const handleOpenParticipantSelector = (mode: 'attendeesInPerson' | 'attendeesOnline' | 'invitees') => {
    setParticipantSelectionMode(mode);
    setIsParticipantSelectorModalOpen(true);
  };

  const handleParticipantSelectionModalClose = () => { setIsParticipantSelectorModalOpen(false); setParticipantSelectionMode(null); };

  const availableParticipantsForSelector = useMemo((): SelectorParticipant[] => {
    if (!participantSelectionMode) return [];

    let otherModeSelectedIds: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let currentModeSelectedIds: string[] = [];

    if (participantSelectionMode === 'attendeesInPerson') {
      otherModeSelectedIds = selectedAttendeesOnline;
      currentModeSelectedIds = selectedAttendeesInPerson;
    } else if (participantSelectionMode === 'attendeesOnline') {
      otherModeSelectedIds = selectedAttendeesInPerson;
      currentModeSelectedIds = selectedAttendeesOnline;
    } else { // invitees
      currentModeSelectedIds = selectedInviteeIds;
    }

    const selectedCategoryId = formData.meetingCategoryId;
    const selectedCategoryName = meetingCategories.find(c => c.id === selectedCategoryId)?.name || 'Comisión Seleccionada';

    const result: SelectorParticipant[] = [];

    participants.forEach(p => {
      const isDisabled = otherModeSelectedIds.includes(p.id) && participantSelectionMode !== 'invitees';

      if (selectedCategoryId) {
        const isInCategory = participantMeetingCategories.some(pmc => pmc.participant_id === p.id && pmc.meeting_category_id === selectedCategoryId);

        if (isInCategory) {
          result.push({
            id: p.id,
            name: p.name,
            group: `Miembros de ${selectedCategoryName}`,
            isDisabled
          });
          return;
        }

        if (!showExternalParticipants) return;
      }

      const commIds = participantMeetingCategories
        .filter(pmc => pmc.participant_id === p.id)
        .map(pmc => pmc.meeting_category_id);

      if (commIds.length === 0) {
        result.push({ id: p.id, name: p.name, group: 'Sin Comisión', isDisabled });
      } else {
        commIds.forEach(cId => {
          const cName = meetingCategories.find(mc => mc.id === cId)?.name || 'Desconocida';
          result.push({ id: p.id, name: p.name, group: cName, isDisabled });
        });
      }
    });

    return result;
  }, [participants, participantSelectionMode, selectedAttendeesInPerson, selectedAttendeesOnline, selectedInviteeIds, formData.meetingCategoryId, meetingCategories, participantMeetingCategories, showExternalParticipants]);

  const handleConfirmParticipantSelection = (ids: string[]) => {
    if (participantSelectionMode === 'attendeesInPerson') setSelectedAttendeesInPerson(ids);
    else if (participantSelectionMode === 'attendeesOnline') setSelectedAttendeesOnline(ids);
    else if (participantSelectionMode === 'invitees') setSelectedInviteeIds(ids);
    handleParticipantSelectionModalClose();
  };

  const renderParticipantSelectionButton = (attendeeList: string[], mode: 'attendeesInPerson' | 'attendeesOnline' | 'invitees', label: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <Button type="button" variant="secondary" onClick={() => handleOpenParticipantSelector(mode)} className="w-full justify-center" disabled={(modalMode === 'edit' && !can('update', 'Meeting'))}>Seleccionar ({attendeeList.length})</Button>
      {attendeeList.length > 0 && (<div className="mt-1 text-xs text-gray-600 dark:text-gray-400 max-h-16 overflow-y-auto p-1 border dark:border-gray-600 rounded">{attendeeList.map(getParticipantName).join(', ')}</div>)}
    </div>
  );

  const meetingsFilteredByPeriod = useMemo(() => meetings.filter(m => isInCurrentPeriod(m.date)), [meetings, isInCurrentPeriod]);
  const meetingsFilteredBySearch = useMemo(() => meetingsFilteredByPeriod.filter(m => (m.subject || '').toLowerCase().includes(searchTerm.toLowerCase())), [meetingsFilteredByPeriod, searchTerm]);

  const sidebarCategories = useMemo(() => {
    const counts = meetingsFilteredBySearch.reduce((acc, meeting) => { acc[meeting.meetingCategoryId] = (acc[meeting.meetingCategoryId] || 0) + 1; return acc; }, {} as Record<string, number>);
    return meetingCategories.map(c => ({ ...c, count: counts[c.id] || 0 })).filter(c => c.count > 0).sort((a, b) => a.name.localeCompare(b.name));
  }, [meetingCategories, meetingsFilteredBySearch]);

  useEffect(() => {
    const allCategoryIds = sidebarCategories.map(c => c.id);
    if (!selectedCategoryId || (!allCategoryIds.includes(selectedCategoryId) && allCategoryIds.length > 0)) setSelectedCategoryId(allCategoryIds[0] || '');
    else if (allCategoryIds.length === 0) setSelectedCategoryId('');
  }, [sidebarCategories, selectedCategoryId]);

  const filteredMeetings = useMemo(() => {
    if (!selectedCategoryId) return [];
    return meetingsFilteredBySearch.filter(m => m.meetingCategoryId === selectedCategoryId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.startTime || '').localeCompare(a.startTime || ''));
  }, [meetingsFilteredBySearch, selectedCategoryId]);

  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    // id will be generated in hook or DB if passing raw name? 
    // The hook I wrote takes Omit<MeetingCategory, 'id'>... wait, I wrote { id: category.id, name: .. } in mutationFn. 
    // So I need to pass ID.
    const newCategory: MeetingCategory = { id: generateId(), name: newCategoryName.trim() };
    createMeetingCategory.mutate(newCategory, {
      onSuccess: () => {
        setFormData(prev => ({ ...prev, meetingCategoryId: newCategory.id, subject: `Reunión ${newCategory.name}` }));
        setNewCategoryName('');
        setIsAddCategoryModalOpen(false);
      }
    });
  };

  const renderCreateWizardStepContent = () => {
    switch (currentStep) {
      case 1: return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Select id="meetingCategoryId" name="meetingCategoryId" value={formData.meetingCategoryId} onChange={handleCategoryChangeForCreate} error={formErrors.meetingCategoryId} options={[{ value: '', label: 'Seleccione una categoría...' }, ...meetingCategories.map(c => ({ value: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label))]} />
              </div>
              {can('create', 'Commission') && (
                <Button type="button" onClick={() => setIsAddCategoryModalOpen(true)} variant="secondary" className="px-3" title="Añadir nueva categoría">
                  <PlusCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </Button>
              )}
            </div>
            {formData.meetingCategoryId && (
              <div className="mt-2 flex items-center">
                <input
                  type="checkbox"
                  id="showExternalParticipants"
                  checked={showExternalParticipants}
                  onChange={(e) => setShowExternalParticipants(e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="showExternalParticipants" className="ml-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  Habilitar selección de participantes externos a esta categoría
                </label>
              </div>
            )}
          </div>
          <Input label="Asunto de la Reunión" name="subject" value={formData.subject} onChange={handleInputChange} required error={formErrors.subject} />
          <Textarea label="Descripción (Opcional)" name="description" value={formData.description || ''} onChange={handleInputChange} />
        </div>
      );
      case 2: return (
        <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-md border dark:border-slate-600">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Programación (Horarios)</label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="dateRange"
                checked={isDateRange}
                onChange={(e) => setIsDateRange(e.target.checked)}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
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
              />
              <Input
                label="Fin (Opcional)"
                type="time"
                value={scheduleInput.endTime}
                onChange={e => setScheduleInput({ ...scheduleInput, endTime: e.target.value })}
                className="dark:[color-scheme:dark]"
                containerClassName="flex-1"
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
                  />
                  <Input
                    label="Hasta"
                    type="date"
                    value={scheduleInput.endDate}
                    onChange={e => setScheduleInput({ ...scheduleInput, endDate: e.target.value })}
                    className="dark:[color-scheme:dark]"
                    containerClassName="flex-1"
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
                />
              )}
              <Button type="button" variant="primary" onClick={addSchedule} className="mb-[2px] h-[38px]">
                <PlusIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {formErrors.schedule && <p className="text-xs text-red-500 mt-1">{formErrors.schedule}</p>}

          {currentSchedules.length > 0 && (
            <div className="mt-3 space-y-1 max-h-32 overflow-y-auto custom-scrollbar border-t dark:border-slate-600 pt-2">
              {currentSchedules.map((sch, index) => (
                <div key={index} className="flex justify-between items-center text-sm bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600">
                  <span>
                    {new Date(sch.date).toLocaleDateString(undefined, { timeZone: 'UTC' })} | {formatTo12Hour(sch.startTime)} {sch.endTime ? `- ${formatTo12Hour(sch.endTime)}` : ''}
                  </span>
                  <button type="button" onClick={() => removeSchedule(index)} className="text-red-500 hover:text-red-700">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Input label="Lugar (Opcional)" name="location" value={formData.location || ''} onChange={handleInputChange} />
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Invitados (Pre-reunión)</h3>
          {renderParticipantSelectionButton(selectedInviteeIds, 'invitees', 'Seleccionar Invitados')}
          <hr className="dark:border-gray-600" />
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Registro de Asistencia (Post-reunión)</h3>
          {renderParticipantSelectionButton(selectedAttendeesInPerson, 'attendeesInPerson', 'Asistentes Presenciales')}
          {renderParticipantSelectionButton(selectedAttendeesOnline, 'attendeesOnline', 'Asistentes En Línea')}
        </div>
      );
      case 4: return <div className="space-y-4"><Input label="Participantes Externos (Opcional)" name="externalParticipantsCount" type="number" min="0" value={formData.externalParticipantsCount || 0} onChange={handleNumberInputChange} /></div>
      default: return null;
    }
  };

  const renderEditFormContent = () => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <Input label="Asunto de la Reunión" name="subject" value={formData.subject} onChange={handleInputChange} required error={formErrors.subject} disabled={!can('update', 'Meeting')} />
      <div>
        <Select label="Categoría" name="meetingCategoryId" value={formData.meetingCategoryId} onChange={handleInputChange} error={formErrors.meetingCategoryId} options={meetingCategories.map(c => ({ value: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label))} disabled={!can('update', 'Meeting')} />
        {formData.meetingCategoryId && (
          <div className="mt-2 flex items-center">
            <input
              type="checkbox"
              id="showExternalParticipantsEdit"
              checked={showExternalParticipants}
              onChange={(e) => setShowExternalParticipants(e.target.checked)}
              disabled={!can('update', 'Meeting')}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="showExternalParticipantsEdit" className="ml-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              Habilitar selección de participantes externos a esta categoría
            </label>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input label="Fecha" name="date" type="date" value={formData.date} onChange={handleInputChange} required error={formErrors.date} disabled={!can('update', 'Meeting')} className="dark:[color-scheme:dark]" /><Input label="Hora de Inicio" name="startTime" type="time" value={formData.startTime || ''} onChange={handleInputChange} required error={formErrors.startTime} disabled={!can('update', 'Meeting')} className="dark:[color-scheme:dark]" /></div>
      <Input label="Hora de Fin (Opcional)" name="endTime" type="time" value={formData.endTime || ''} onChange={handleInputChange} error={formErrors.endTime} disabled={!can('update', 'Meeting')} className="dark:[color-scheme:dark]" />
      <Input label="Lugar (Opcional)" name="location" value={formData.location || ''} onChange={handleInputChange} disabled={!can('update', 'Meeting')} />
      <Textarea label="Descripción (Opcional)" name="description" value={formData.description || ''} onChange={handleInputChange} disabled={!can('update', 'Meeting')} />
      <div className="flex items-center space-x-2 py-2">
        <input
          type="checkbox"
          id="isCancelled"
          name="is_cancelled"
          checked={formData.is_cancelled}
          onChange={(e) => setFormData(prev => ({ ...prev, is_cancelled: e.target.checked }))}
          disabled={!can('update', 'Meeting')}
          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
        <label htmlFor="isCancelled" className="text-sm font-medium text-gray-700 dark:text-gray-300">Marcar como Cancelada</label>
      </div>
      {renderParticipantSelectionButton(selectedInviteeIds, 'invitees', 'Invitados')}
      <hr className="dark:border-gray-600" />
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Registro de Asistencia</h3>
      {renderParticipantSelectionButton(selectedAttendeesInPerson, 'attendeesInPerson', 'Asistentes Presenciales')}
      {renderParticipantSelectionButton(selectedAttendeesOnline, 'attendeesOnline', 'Asistentes En Línea')}
      <Input label="Participantes Externos (Opcional)" name="externalParticipantsCount" type="number" min="0" value={formData.externalParticipantsCount || 0} onChange={handleNumberInputChange} disabled={!can('update', 'Meeting')} />
    </div>
  );

  const renderViewMeetingContent = () => {
    if (!meetingForViewOrEdit) return <p>No hay detalles de reunión para mostrar.</p>;
    const meeting = meetingForViewOrEdit;
    const attendees = meetingAttendees.filter(ma => ma.meeting_id === meeting.id);
    const inPersonCount = attendees.filter(ma => ma.attendance_type === 'in_person').length;
    const onlineCount = attendees.filter(ma => ma.attendance_type === 'online').length;
    const inviteesCount = meetingInvitees.filter(mi => mi.meeting_id === meeting.id).length;

    const eventDetailsForCalendar = {
      title: meeting.subject,
      startDate: meeting.date,
      startTime: meeting.startTime || '',
      endTime: meeting.endTime,
      description: meeting.description || '',
      location: meeting.location || ''
    };

    return (
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
        <h4 className={`text-2xl font-bold ${meeting.is_cancelled ? 'text-gray-500 line-through' : 'text-primary-600 dark:text-primary-400'}`}>{meeting.subject}</h4>
        {meeting.is_cancelled && <span className="inline-block px-2 py-1 text-xs font-bold text-red-100 bg-red-600 rounded-full">CANCELADA</span>}
        <p><strong>Categoría:</strong> {getMeetingCategoryName(meeting.meetingCategoryId)}</p>
        <p><strong>Fecha:</strong> {new Date(meeting.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
        <p><strong>Hora:</strong> {formatTo12Hour(meeting.startTime)} {meeting.endTime ? `- ${formatTo12Hour(meeting.endTime)}` : '(En curso)'}</p>
        {meeting.location && <p><strong>Lugar:</strong> {meeting.location}</p>}
        {inviteesCount > 0 && <p><strong>Invitados:</strong> {inviteesCount}</p>}
        {(inPersonCount > 0 || onlineCount > 0) && (
          <div className="pt-2 mt-2 border-t dark:border-gray-600">
            <h5 className="font-semibold">Asistentes Registrados:</h5>
            {inPersonCount > 0 && <p className="text-sm"><strong>Presencial:</strong> {inPersonCount} participante(s)</p>}
            {onlineCount > 0 && <p className="text-sm"><strong>En Línea:</strong> {onlineCount} participante(s)</p>}
          </div>
        )}
        {typeof meeting.externalParticipantsCount === 'number' && meeting.externalParticipantsCount > 0 && <p><strong>Participantes Externos:</strong> {meeting.externalParticipantsCount}</p>}
        {meeting.description && <p className="mt-2"><strong>Descripción:</strong> <span className="italic">{`"${meeting.description}"`}</span></p>}

        {!meeting.is_cancelled && meeting.startTime && (
          <AddToGoogleCalendar eventDetails={eventDetailsForCalendar} />
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p><strong>Creado por:</strong> {getUserName(meeting.createdBy)}</p>
          <p><strong>Fecha de Creación:</strong> {formatAuditDate(meeting.createdAt)}</p>
          {meeting.updatedAt && (
            <>
              <p><strong>Última Modif. por:</strong> {getUserName(meeting.updatedBy)}</p>
              <p><strong>Fecha de Modif.:</strong> {formatAuditDate(meeting.updatedAt)}</p>
            </>
          )}
        </div>
      </div>
    );
  };

  const getMeetingStatus = (meeting: Meeting) => {
    if (meeting.is_cancelled) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Cancelada</span>;
    }

    const now = new Date();
    const startTimeStr = meeting.startTime || '00:00';
    const startDateTime = new Date(`${meeting.date}T${startTimeStr}`);

    let endDateTime = new Date(startDateTime);
    if (meeting.endTime) {
      const [h, m] = meeting.endTime.split(':');
      endDateTime.setHours(parseInt(h || '0'), parseInt(m || '0'), 0, 0);
    } else {
      endDateTime.setTime(startDateTime.getTime() + (2 * 60 * 60 * 1000));
    }

    if (now > endDateTime) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Finalizada</span>;
    } else if (now >= startDateTime) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">En Progreso</span>;
    } else {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Programada</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Programar Reuniones</h1>
        <div className="flex space-x-2">
          {can('create', 'Meeting') && (
            <Button onClick={handleOpenCreateModal} variant="primary"><PlusIcon className="w-5 h-5 mr-2" /> Agendar Reunión</Button>
          )}
          <Button onClick={() => { if (onClearEditingMeeting) onClearEditingMeeting(); if (onNavigateBack) onNavigateBack(); }} variant="secondary">Volver al Calendario</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-grow overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:block md:w-64 flex-shrink-0">
          <div className="sticky top-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Filtrar por Categoría</h3>
            <Input containerClassName="mb-4 flex-shrink-0" placeholder="Buscar reunión..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <nav className="flex-grow overflow-y-auto custom-scrollbar">
              <ul className="space-y-1">
                {sidebarCategories.map(cat => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-between items-center ${selectedCategoryId === cat.id
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className="bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 py-0.5 px-2 rounded-full text-xs ml-2">
                        {cat.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* List (Main Content) */}
        <main className="flex-grow flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <div className="md:hidden w-full"><Button onClick={() => setIsCategoryListVisible(!isCategoryListVisible)} variant="outline" className="w-full">Filtrar Categorías</Button></div>
            {isCategoryListVisible && (
              <div className="mt-2 bg-white dark:bg-gray-800 p-2 rounded shadow max-h-40 overflow-y-auto w-full md:hidden">
                {sidebarCategories.map(cat => (
                  <div key={cat.id} onClick={() => { setSelectedCategoryId(cat.id); setIsCategoryListVisible(false); }} className={`p-2 ${selectedCategoryId === cat.id ? 'font-bold' : ''}`}>
                    {cat.name} ({cat.count})
                  </div>
                ))}
              </div>
            )}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                title="Vista Cuadrícula"
              >
                <GridIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                title="Vista Lista"
              >
                <ListIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar rounded-lg">
            {filteredMeetings.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                {selectedCategoryId ? 'No hay reuniones en esta categoría para el periodo seleccionado.' : 'Seleccione una categoría para ver las reuniones.'}
              </div>
            ) : (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-1">
                  {filteredMeetings.map(meeting => (
                    <Card key={meeting.id} className="hover:shadow-lg transition-shadow cursor-pointer group flex flex-col h-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" onClick={() => handleOpenViewModal(meeting)}>
                      <div className="h-32 bg-primary-50 dark:bg-slate-700 relative overflow-hidden flex items-center justify-center">
                        <span className="text-4xl">🤝</span>
                      </div>
                      <CardContent className="p-4 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-grow">
                            <h3 className={`font-bold text-lg leading-tight mb-1 ${meeting.is_cancelled ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                              {meeting.subject}
                            </h3>
                            <div className="mb-2">{getMeetingStatus(meeting)}</div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4 flex-grow">
                          <p className="flex items-center"><span className="mr-2">🗓️</span> {new Date(meeting.date).toLocaleDateString()}</p>
                          <p className="flex items-center"><span className="mr-2">⏰</span> {formatTo12Hour(meeting.startTime)}</p>
                          <p className="flex items-center"><span className="mr-2">🏷️</span> {getMeetingCategoryName(meeting.meetingCategoryId)}</p>
                          {meeting.location && <p className="flex items-center line-clamp-1"><span className="mr-2">📍</span> {meeting.location}</p>}
                        </div>

                        <div className="flex justify-end pt-2 border-t dark:border-gray-700 space-x-2">
                          {can('update', 'Meeting') && (
                            <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); setMeetingForViewOrEdit(meeting); setModalMode('edit'); setIsModalOpen(true); }} title="Editar">
                              <EditIcon className="w-4 h-4 mr-1" /> Editar
                            </Button>
                          )}
                          {can('delete', 'Meeting') && (
                            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setMeetingToDelete(meeting); }} title="Eliminar">
                              <TrashIcon className="w-4 h-4 mr-1" /> Eliminar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha / Hora</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Asunto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ubicación</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredMeetings.map(meeting => (
                        <tr key={meeting.id} onClick={() => handleOpenViewModal(meeting)} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getMeetingStatus(meeting)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            <div>{new Date(meeting.date).toLocaleDateString()}</div>
                            <div className="text-gray-500 text-xs">{formatTo12Hour(meeting.startTime)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                            <div className={meeting.is_cancelled ? 'line-through text-gray-400' : ''}>{meeting.subject}</div>
                            <div className="text-xs text-gray-500">{getMeetingCategoryName(meeting.meetingCategoryId)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{meeting.location || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {can('update', 'Meeting') && (
                                <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); setMeetingForViewOrEdit(meeting); setModalMode('edit'); setIsModalOpen(true); }} title="Editar">
                                  <EditIcon className="w-4 h-4" />
                                </Button>
                              )}
                              {can('delete', 'Meeting') && (
                                <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setMeetingToDelete(meeting); }} title="Eliminar">
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </main>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? `Agendar Reunión (Paso ${currentStep} de 4)` : (modalMode === 'edit' ? 'Editar Reunión' : 'Detalles')}>
        {modalMode === 'view' ? renderViewMeetingContent() : (modalMode === 'edit' ? renderEditFormContent() : renderCreateWizardStepContent())}

        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
          {modalMode === 'view' ? (
            <>
              {can('delete', 'Meeting') && (
                <Button variant="danger" onClick={() => { if (meetingForViewOrEdit) { setIsModalOpen(false); setMeetingToDelete(meetingForViewOrEdit); } }} className="mr-auto">
                  <TrashIcon className="w-4 h-4 mr-1" />Eliminar
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="secondary" onClick={handleCloseModal}>Cerrar</Button>
                {can('update', 'Meeting') && (
                  <Button variant="accent" onClick={() => setModalMode('edit')}>
                    <EditIcon className="w-4 h-4 mr-1" />Editar
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex justify-between w-full">
              {modalMode === 'create' && currentStep > 1 ? (
                <Button onClick={handlePrevStep} variant="secondary">Anterior</Button>
              ) : <div></div>}

              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                <Button variant="primary" onClick={modalMode === 'edit' ? handleUpdateSubmit : handleNextStepOrCreate}>
                  {modalMode === 'create' ? (currentStep === TOTAL_STEPS_CREATE ? 'Confirmar' : 'Siguiente') : 'Guardar'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!meetingToDelete} onClose={() => setMeetingToDelete(null)} title="Confirmar Eliminación">
        {meetingToDelete && (
          <div className="text-sm">
            <p className="mb-4">¿Eliminar la reunión <strong>"{meetingToDelete.subject}"</strong>?</p>
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setMeetingToDelete(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDeleteMeeting}>Sí, Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isAddCategoryModalOpen} onClose={() => setIsAddCategoryModalOpen(false)} title="Nueva Categoría">
        <form onSubmit={handleAddNewCategory} className="space-y-4">
          <Input label="Nombre de la Categoría" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddCategoryModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">Guardar</Button>
          </div>
        </form>
      </Modal>

      <ParticipantSelectorModal
        isOpen={isParticipantSelectorModalOpen}
        onClose={handleParticipantSelectionModalClose}
        title="Seleccionar Participantes"
        availableParticipants={availableParticipantsForSelector}
        initialSelectedIds={participantSelectionMode === 'attendeesInPerson' ? selectedAttendeesInPerson : participantSelectionMode === 'attendeesOnline' ? selectedAttendeesOnline : selectedInviteeIds}
        onConfirm={handleConfirmParticipantSelection}
      />
    </div>
  );
};

export default ScheduleMeetingView;
