
// views/ManageEventsView.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Event, MeetingCategory, EventCategory, Company, ScheduleEntry } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import PlusIcon from '../components/icons/PlusIcon';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import EmailIcon from '../components/icons/EmailIcon';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import { generateId } from '../constants';
import { usePeriod } from '../contexts/PeriodContext';
import { useAuth } from '../contexts/AuthContext';
import ParticipantSelectorModal, { SelectorParticipant } from '../components/ParticipantSelectorModal';
import GridIcon from '../components/icons/GridIcon';
import ListIcon from '../components/icons/ListIcon';
import { Card, CardContent } from '../components/ui/Card';

// Hooks
import { useEvents, useEventMutations } from '../hooks/useEvents';
import { useParticipants } from '../hooks/useParticipants';
import { useMeetingCategories, useMeetingCategoryMutations } from '../hooks/useMeetingCategories';
import { useEventCategories, useEventCategoryMutations } from '../hooks/useEventCategories';
import { useEventParticipants } from '../hooks/useEventParticipants';
import { useEventRelations } from '../hooks/useEventRelations';
import { useCompanies } from '../hooks/useCompanies';
import { useParticipantMeetingCategories } from '../hooks/useParticipantMeetingCategories';
import { useUsers } from '../hooks/useUsers';

interface ManageEventsViewProps {
  onNavigateBack?: () => void;
  initialEventToEdit?: Event | null;
  onClearEditingEvent?: () => void;
}

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialEventFormState: Omit<Event, 'id'> = {
  subject: '',
  organizerType: 'meeting_category',
  date: getTodayDateString(),
  startTime: '',
  endTime: '',
  location: '',
  externalParticipantsCount: 0,
  description: '',
  cost: undefined,
  investment: undefined,
  revenue: undefined,
  is_cancelled: false,
  flyer_url: '',
};

const TOTAL_STEPS_CREATE = 4;
type ModalMode = 'create' | 'edit' | 'view';

const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const ManageEventsView: React.FC<ManageEventsViewProps> = ({
  onNavigateBack,
  initialEventToEdit,
  onClearEditingEvent,
}) => {
  const { isInCurrentPeriod } = usePeriod();
  const { can } = useAuth();
  const { notify } = useNotification();

  // Data
  const { data: events = [] } = useEvents();
  const { data: participants = [] } = useParticipants();
  const { data: meetingCategories = [] } = useMeetingCategories();
  const { data: eventCategories = [] } = useEventCategories();
  const { eventAttendees, eventInvitees } = useEventParticipants();
  const { eventOrganizingMeetingCategories, eventOrganizingCategories } = useEventRelations();
  const { data: companies = [] } = useCompanies();
  const { data: participantMeetingCategories = [] } = useParticipantMeetingCategories();
  const { data: users = [] } = useUsers();

  // Mutations
  const { createComplexEvent, updateComplexEvent, deleteComplexEvent } = useEventMutations();
  const { createMeetingCategory } = useMeetingCategoryMutations();
  const { createEventCategory } = useEventCategoryMutations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [eventForViewOrEdit, setEventForViewOrEdit] = useState<Event | null>(null);
  const [formData, setFormData] = useState<Omit<Event, 'id'>>(initialEventFormState);
  const [selectedOrganizerIdsState, setSelectedOrganizerIdsState] = useState<string[]>([]);
  const [selectedInviteeIds, setSelectedInviteeIds] = useState<string[]>([]);
  const [selectedAttendeesInPerson, setSelectedAttendeesInPerson] = useState<string[]>([]);
  const [selectedAttendeesOnline, setSelectedAttendeesOnline] = useState<string[]>([]);

  const [currentSchedules, setCurrentSchedules] = useState<ScheduleEntry[]>([]);
  const [scheduleInput, setScheduleInput] = useState({ date: '', endDate: '', startTime: '', endTime: '' });
  const [isDateRange, setIsDateRange] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganizer, setSelectedOrganizer] = useState<{ type: string; id: string } | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [isEventParticipantSelectorModalOpen, setIsEventParticipantSelectorModalOpen] = useState(false);
  const [eventParticipantSelectionMode, setEventParticipantSelectionMode] = useState<'attendeesInPerson' | 'attendeesOnline' | 'invitees' | null>(null);

  const [isOrganizerSelectorModalOpen, setIsOrganizerSelectorModalOpen] = useState(false);
  const [tempSelectedOrganizerIdsModal, setTempSelectedOrganizerIdsModal] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [organizerSearchTermModal, setOrganizerSearchTermModal] = useState('');
  // 
  // We can add search for organizers in modal if valid, but keeping simple for now.

  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [addCatModalType, setAddCatModalType] = useState<'meeting_category' | 'category' | null>(null);
  const [newCatName, setNewCatName] = useState('');

  const [isCompanyEvent, setIsCompanyEvent] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companySuggestions, setCompanySuggestions] = useState<Company[]>([]);

  const [tempOrganizerTypeModal, setTempOrganizerTypeModal] = useState<'meeting_category' | 'category'>('meeting_category');

  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [notifyingEventId, setNotifyingEventId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [modalAlert, setModalAlert] = useState<{ isOpen: boolean; title: string; message: string; onConfirm?: () => void } | null>(null);
  const [isCategoryListVisible, setIsCategoryListVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Helper Functions
  const getUserName = useCallback((userId: string | null | undefined) => {
    if (!userId) return 'Sistema';
    return users.find(u => u.id === userId)?.full_name || 'Usuario Desconocido';
  }, [users]);

  const formatAuditDate = (dateString: string | null | undefined) => dateString ? new Date(dateString).toLocaleString('es-ES') : 'N/A';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getParticipantName = useCallback((id: string) => participants.find(p => p.id === id)?.name || 'Desconocido', [participants]);
  const getMeetingCategoryName = useCallback((id: string) => meetingCategories.find(c => c.id === id)?.name || 'Categoría de Reunión Desconocida', [meetingCategories]);
  const getEventCategoryName = useCallback((id: string) => eventCategories.find(ec => ec.id === id)?.name || 'Categoría Desconocida', [eventCategories]);

  const getDisplayOrganizerNameForEvent = useCallback((eventItem: Event): string => {
    if (!eventItem) return 'Categoría no disponible';
    if (eventItem.organizerType === 'meeting_category') {
      const orgLinks = (eventOrganizingMeetingCategories || []).filter((eoc: any) => eoc.event_id === eventItem.id);
      const categoryNames = orgLinks.map((eoc: any) => getMeetingCategoryName(eoc.meeting_category_id));
      if (categoryNames.length === 0) return 'Cat. Reunión No Especificada';
      return `${categoryNames.join(', ')}`;
    } else {
      const orgLinks = (eventOrganizingCategories || []).filter((eoc: any) => eoc.event_id === eventItem.id);
      const categoryNames = orgLinks.map((eoc: any) => getEventCategoryName(eoc.category_id));
      if (categoryNames.length === 0) return 'Cat. Evento No Especificada';
      return categoryNames.join(', ');
    }
  }, [eventOrganizingMeetingCategories, eventOrganizingCategories, getMeetingCategoryName, getEventCategoryName]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCompanyInputBlur = () => {
    setTimeout(() => { setCompanySuggestions([]); }, 200);
    if (selectedCompanyId) return;
    if (modalMode === 'create' && isCompanyEvent && companySearchTerm.trim() && selectedOrganizerIdsState.length > 0) {
      const firstCategoryId = selectedOrganizerIdsState[0];
      const categoryName = formData.organizerType === 'meeting_category' ? getMeetingCategoryName(firstCategoryId) : getEventCategoryName(firstCategoryId);
      if (categoryName && !categoryName.includes('Desconocida')) {
        setFormData(prev => ({ ...prev, subject: `${categoryName} - ${companySearchTerm.trim()}` }));
      }
    }
  };

  useEffect(() => {
    if (modalMode === 'create' && isCompanyEvent && selectedCompanyId && selectedOrganizerIdsState.length > 0) {
      const company = companies.find(c => c.id_establecimiento === selectedCompanyId);
      const firstCategoryId = selectedOrganizerIdsState[0];
      const categoryName = formData.organizerType === 'meeting_category' ? (meetingCategories.find(c => c.id === firstCategoryId)?.name || '') : (eventCategories.find(c => c.id === firstCategoryId)?.name || '');
      if (company && categoryName) {
        setFormData(prev => ({ ...prev, subject: `${categoryName} - ${company.nombre_establecimiento}` }));
      }
    }
  }, [isCompanyEvent, selectedCompanyId, selectedOrganizerIdsState, formData.organizerType, companies, meetingCategories, eventCategories, modalMode]);

  useEffect(() => {
    if (companySearchTerm.length > 2) {
      const suggestions = companies.filter(c => normalizeString(c.nombre_establecimiento).includes(normalizeString(companySearchTerm))).slice(0, 5);
      setCompanySuggestions(suggestions);
    } else { setCompanySuggestions([]); }
  }, [companySearchTerm, companies]);

  useEffect(() => {
    if (initialEventToEdit) {
      setEventForViewOrEdit(initialEventToEdit);
      setFormData({
        subject: initialEventToEdit.subject, organizerType: initialEventToEdit.organizerType,
        date: initialEventToEdit.date, startTime: initialEventToEdit.startTime,
        endTime: initialEventToEdit.endTime || '', location: initialEventToEdit.location || '',
        externalParticipantsCount: initialEventToEdit.externalParticipantsCount || 0,
        description: initialEventToEdit.description || '',
        cost: initialEventToEdit.cost, investment: initialEventToEdit.investment, revenue: initialEventToEdit.revenue,
        is_cancelled: initialEventToEdit.is_cancelled,
        flyer_url: initialEventToEdit.flyer_url,
      });
      const currentOrganizers = initialEventToEdit.organizerType === 'meeting_category'
        ? eventOrganizingMeetingCategories.filter((eoc: any) => eoc.event_id === initialEventToEdit.id).map((eoc: any) => eoc.meeting_category_id)
        : eventOrganizingCategories.filter((eoc: any) => eoc.event_id === initialEventToEdit.id).map((eoc: any) => eoc.category_id);
      setSelectedOrganizerIdsState(currentOrganizers);

      const currentInvitees = eventInvitees.filter(ei => ei.event_id === initialEventToEdit.id).map(ei => ei.participant_id);
      setSelectedInviteeIds(currentInvitees);

      const currentAttendees = eventAttendees.filter(ea => ea.event_id === initialEventToEdit.id);
      setSelectedAttendeesInPerson(currentAttendees.filter(ea => ea.attendance_type === 'in_person').map(ea => ea.participant_id));
      setSelectedAttendeesOnline(currentAttendees.filter(ea => ea.attendance_type === 'online').map(ea => ea.participant_id));

      setFlyerFile(null);
      setFlyerPreview(initialEventToEdit.flyer_url || null);
      setModalMode('edit');
      setCurrentStep(1);
      setFormErrors({});
      setIsModalOpen(true);
    }
  }, [initialEventToEdit, eventAttendees, eventInvitees, eventOrganizingMeetingCategories, eventOrganizingCategories]);

  useEffect(() => {
    if (isModalOpen && eventForViewOrEdit && (modalMode === 'edit' || modalMode === 'view')) {
      setFormData({
        subject: eventForViewOrEdit.subject, organizerType: eventForViewOrEdit.organizerType,
        date: eventForViewOrEdit.date, startTime: eventForViewOrEdit.startTime,
        endTime: eventForViewOrEdit.endTime || '', location: eventForViewOrEdit.location || '',
        externalParticipantsCount: eventForViewOrEdit.externalParticipantsCount || 0,
        description: eventForViewOrEdit.description || '',
        cost: eventForViewOrEdit.cost, investment: eventForViewOrEdit.investment, revenue: eventForViewOrEdit.revenue,
        is_cancelled: eventForViewOrEdit.is_cancelled,
        flyer_url: eventForViewOrEdit.flyer_url,
      });
      const currentOrganizers = eventForViewOrEdit.organizerType === 'meeting_category'
        ? eventOrganizingMeetingCategories.filter((eoc: any) => eoc.event_id === eventForViewOrEdit.id).map((eoc: any) => eoc.meeting_category_id)
        : eventOrganizingCategories.filter((eoc: any) => eoc.event_id === eventForViewOrEdit.id).map((eoc: any) => eoc.category_id);
      setSelectedOrganizerIdsState(currentOrganizers);

      const currentInvitees = eventInvitees.filter(ei => ei.event_id === eventForViewOrEdit.id).map(ei => ei.participant_id);
      setSelectedInviteeIds(currentInvitees);

      const currentAttendees = eventAttendees.filter(ea => ea.event_id === eventForViewOrEdit.id);
      setSelectedAttendeesInPerson(currentAttendees.filter(ea => ea.attendance_type === 'in_person').map(ea => ea.participant_id));
      setSelectedAttendeesOnline(currentAttendees.filter(ea => ea.attendance_type === 'online').map(ea => ea.participant_id));

      setFlyerFile(null);
      setFlyerPreview(eventForViewOrEdit.flyer_url || null);
    }
  }, [eventForViewOrEdit, modalMode, isModalOpen, eventAttendees, eventInvitees, eventOrganizingMeetingCategories, eventOrganizingCategories]);

  useEffect(() => {
    if (!isModalOpen) {
      setIsCompanyEvent(false); setCompanySearchTerm(''); setSelectedCompanyId(null);
    }
  }, [isModalOpen]);

  const handleOpenCreateModal = () => {
    if (onClearEditingEvent) onClearEditingEvent();
    setEventForViewOrEdit(null);
    setFormData({ ...initialEventFormState, date: getTodayDateString(), endTime: '' });
    setSelectedOrganizerIdsState([]); setSelectedInviteeIds([]); setSelectedAttendeesInPerson([]); setSelectedAttendeesOnline([]);
    setCurrentSchedules([]); setScheduleInput({ date: '', endDate: '', startTime: '', endTime: '' }); setIsDateRange(false);
    setFlyerFile(null); setFlyerPreview(null);
    setCurrentStep(1); setFormErrors({}); setModalMode('create'); setIsModalOpen(true);
  };

  const handleOpenViewModal = (event: Event) => {
    if (onClearEditingEvent) onClearEditingEvent();
    setEventForViewOrEdit(event);
    setFormErrors({}); setModalMode('view'); setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const switchToEditModeFromView = () => { if (eventForViewOrEdit) setModalMode('edit'); };

  const handleCloseModal = () => { setIsModalOpen(false); setFlyerFile(null); setFlyerPreview(null); if (onClearEditingEvent) onClearEditingEvent(); };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSendInvitations = async (event: Event) => {
    const currentInvitees = eventInvitees.filter(ei => ei.event_id === event.id);
    if (currentInvitees.length === 0) { notify.warning('No hay invitados registrados para este evento.'); return; }

    const confirmSend = async () => {
      setNotifyingEventId(event.id);
      try {
        const { error } = await supabase.functions.invoke('notify-event-attendees', { body: { eventId: event.id } });
        if (error) throw error;
        notify.success('Las invitaciones han sido enviadas a la cola de procesamiento con éxito.');
      } catch (error: any) { notify.error(`No se pudieron enviar las invitaciones: ${error.message}`); } finally { setNotifyingEventId(null); }
    };
    setModalAlert({ isOpen: true, title: 'Confirmar Envío', message: `¿Está seguro de que desea enviar ${currentInvitees.length} invitaciones por correo para el evento "${event.subject}"?`, onConfirm: confirmSend });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (['cost', 'investment', 'revenue'].includes(name)) setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    else setFormData(prev => ({ ...prev, [name]: value === '' ? 0 : parseInt(value, 10) }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const addSchedule = () => {
    if (!scheduleInput.startTime) { notify.error('Hora de inicio requerida'); return; }
    if (scheduleInput.endTime && scheduleInput.endTime <= scheduleInput.startTime) {
      notify.error('La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    const newSchedules: ScheduleEntry[] = [];
    if (isDateRange) {
      if (!scheduleInput.date || !scheduleInput.endDate) { notify.error('Fechas requeridas'); return; }
      if (scheduleInput.endDate < scheduleInput.date) { notify.error('Fecha final debe ser posterior a inicial'); return; }

      const current = new Date(scheduleInput.date + 'T00:00:00');
      const end = new Date(scheduleInput.endDate + 'T00:00:00');

      while (current <= end) {
        newSchedules.push({ date: current.toISOString().split('T')[0], startTime: scheduleInput.startTime, endTime: scheduleInput.endTime });
        current.setDate(current.getDate() + 1);
      }
    } else {
      if (!scheduleInput.date) { notify.error('Fecha requerida'); return; }
      newSchedules.push({ date: scheduleInput.date, startTime: scheduleInput.startTime, endTime: scheduleInput.endTime });
    }

    setCurrentSchedules(prev => [...prev, ...newSchedules].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setScheduleInput(prev => ({ ...prev, date: '', endDate: '' }));
  };

  const removeSchedule = (index: number) => { setCurrentSchedules(currentSchedules.filter((_, i) => i !== index)); };

  const validateCreateStep = () => {
    const errors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!formData.subject.trim()) errors.subject = 'Obligatorio';
      if (selectedOrganizerIdsState.length === 0) errors.organizerId = 'Requerido';
    } else if (currentStep === 2) {
      if (currentSchedules.length === 0) errors.schedule = 'Requerido';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.subject.trim()) errors.subject = 'Obligatorio';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStepOrCreate = async () => {
    if (validateCreateStep()) {
      if (currentStep < TOTAL_STEPS_CREATE) {
        setCurrentStep(prev => prev + 1);
      } else {
        setIsUploading(true);
        let flyerUrlToSave = null;
        if (flyerFile) {
          const fileName = `${Date.now()}_${flyerFile.name}`;
          const { error } = await supabase.storage.from('event_flyers').upload(fileName, flyerFile);
          if (!error) {
            const { data } = supabase.storage.from('event_flyers').getPublicUrl(fileName);
            flyerUrlToSave = data.publicUrl;
          }
        }
        const finalEventData = { ...formData, flyer_url: flyerUrlToSave || undefined };
        try {
          // Check if schedules exist. The hook Logic for schedules > 0 handles creating multiple events.
          // View logic implies we can create ONE event with multiple schedules? Or MULTIPLE events from wizard?
          // If the View wizard creates multiple events (from schedules), it's fine.
          // If the user expects ONE event with recurrences, the DB/Hook handles it by creating multiple rows.
          // This seems consistent with useEventMutations.
          await createComplexEvent.mutateAsync({
            eventData: finalEventData,
            schedules: currentSchedules,
            selectedOrganizerIds: selectedOrganizerIdsState,
            inviteeIds: selectedInviteeIds,
            attendeesInPersonIds: selectedAttendeesInPerson,
            attendeesOnlineIds: selectedAttendeesOnline
          });
          notify.success('Evento creado');
          handleCloseModal();
        } catch (e: any) { notify.error(e.message); } finally { setIsUploading(false); }
      }
    }
  };

  const handlePrevStep = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };

  const handleUpdateSubmit = async () => {
    if (eventForViewOrEdit && validateEditForm()) {
      setIsUploading(true);
      let flyerUrlToSave = eventForViewOrEdit.flyer_url;
      if (flyerFile) {
        const fileName = `${Date.now()}_${flyerFile.name}`;
        const { error } = await supabase.storage.from('event_flyers').upload(fileName, flyerFile, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from('event_flyers').getPublicUrl(fileName);
          flyerUrlToSave = data.publicUrl;
        }
      } else if (flyerPreview === null) flyerUrlToSave = undefined;

      const finalEventData = { ...formData, flyer_url: flyerUrlToSave };
      try {
        await updateComplexEvent.mutateAsync({
          eventId: eventForViewOrEdit.id,
          eventData: finalEventData,
          selectedOrganizerIds: selectedOrganizerIdsState,
          inviteeIds: selectedInviteeIds,
          attendeesInPersonIds: selectedAttendeesInPerson,
          attendeesOnlineIds: selectedAttendeesOnline
        });
        notify.success('Evento actualizado');
        handleCloseModal();
      } catch (e: any) { notify.error(e.message); } finally { setIsUploading(false); }
    }
  };

  const handleOpenEventParticipantSelector = (mode: 'attendeesInPerson' | 'attendeesOnline' | 'invitees') => {
    setEventParticipantSelectionMode(mode);
    setIsEventParticipantSelectorModalOpen(true);
  };

  const handleEventParticipantSelectionModalClose = () => { setIsEventParticipantSelectorModalOpen(false); setEventParticipantSelectionMode(null); };

  const availableEventParticipantsForSelector = useMemo((): SelectorParticipant[] => {
    if (!eventParticipantSelectionMode) return [];
    let otherModeSelectedIds: string[] = [];
    if (eventParticipantSelectionMode === 'attendeesInPerson') otherModeSelectedIds = selectedAttendeesOnline;
    else if (eventParticipantSelectionMode === 'attendeesOnline') otherModeSelectedIds = selectedAttendeesInPerson;

    const result: SelectorParticipant[] = [];
    participants.forEach(p => {
      const isDisabled = otherModeSelectedIds.includes(p.id);
      const commIds = (participantMeetingCategories || []).filter((pmc: any) => pmc.participant_id === p.id).map((pmc: any) => pmc.meeting_category_id);

      if (commIds.length === 0) {
        result.push({ id: p.id, name: p.name, group: 'Sin Comisión', isDisabled });
      } else {
        commIds.forEach((cId: any) => {
          const cName = meetingCategories.find(mc => mc.id === cId)?.name || 'Desconocida';
          result.push({ id: p.id, name: p.name, group: cName, isDisabled });
        });
      }
    });
    return result;
  }, [participants, eventParticipantSelectionMode, selectedAttendeesInPerson, selectedAttendeesOnline, participantMeetingCategories, meetingCategories]);

  const handleConfirmEventParticipantSelection = (ids: string[]) => {
    if (eventParticipantSelectionMode === 'invitees') setSelectedInviteeIds(ids);
    else if (eventParticipantSelectionMode === 'attendeesInPerson') setSelectedAttendeesInPerson(ids);
    else if (eventParticipantSelectionMode === 'attendeesOnline') setSelectedAttendeesOnline(ids);
    handleEventParticipantSelectionModalClose();
  };

  const handleSuggestInvitees = async () => {
    if (selectedOrganizerIdsState.length === 0) { notify.info('Seleccione categoría'); return; }
    let pastEventIds: string[] = [];
    if (formData.organizerType === 'meeting_category') {
      const { data } = await supabase.from('event_organizing_commissions').select('event_id').in('commission_id', selectedOrganizerIdsState);
      pastEventIds = data?.map(e => e.event_id) || [];
    } else {
      const { data } = await supabase.from('event_organizing_categories').select('event_id').in('category_id', selectedOrganizerIdsState);
      pastEventIds = data?.map(e => e.event_id) || [];
    }
    if (pastEventIds.length > 0) {
      const { data: pastAttendees } = await supabase.from('event_attendees').select('participant_id').in('event_id', pastEventIds);
      const suggestedIds = pastAttendees?.map(a => a.participant_id) || [];
      const newSelection = [...new Set([...selectedInviteeIds, ...suggestedIds])];
      setSelectedInviteeIds(newSelection);
      notify.success(`Sugeridos ${suggestedIds.length}`);
    } else { notify.info('No hay sugerencias'); }
  };

  const handleOpenOrganizerSelector = () => { setTempSelectedOrganizerIdsModal(selectedOrganizerIdsState); setTempOrganizerTypeModal(formData.organizerType); setOrganizerSearchTermModal(''); setIsOrganizerSelectorModalOpen(true); };
  const handleOrganizerSelectionModalClose = () => { setIsOrganizerSelectorModalOpen(false); };
  const handleToggleOrganizerSelection = (id: string, type: 'meeting_category' | 'category') => {
    if (type !== tempOrganizerTypeModal) { setTempSelectedOrganizerIdsModal([id]); setTempOrganizerTypeModal(type); }
    else setTempSelectedOrganizerIdsModal(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };
  const handleConfirmOrganizerSelection = () => { setSelectedOrganizerIdsState(tempSelectedOrganizerIdsModal); setFormData(prev => ({ ...prev, organizerType: tempOrganizerTypeModal })); handleOrganizerSelectionModalClose(); };

  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !addCatModalType) return;
    const newId = generateId();
    if (addCatModalType === 'meeting_category') {
      const cat = { id: newId, name: newCatName.trim() };
      createMeetingCategory.mutate(cat, {
        onSuccess: () => {
          notify.success('Categoría creada');
          setIsAddCatModalOpen(false);
        }
      });
    } else {
      const cat = { id: newId, name: newCatName.trim() };
      createEventCategory.mutate(cat, {
        onSuccess: () => {
          notify.success('Categoría creada');
          setIsAddCatModalOpen(false);
        }
      });
    }
  };

  // Filter Logic
  const eventsFilteredByPeriod = useMemo(() => events.filter(e => isInCurrentPeriod(e.date)), [events, isInCurrentPeriod]);
  const eventsFilteredBySearch = useMemo(() => eventsFilteredByPeriod.filter(e => (e.subject || '').toLowerCase().includes(searchTerm.toLowerCase())), [eventsFilteredByPeriod, searchTerm]);

  // Sidebar counts logic
  const sidebarMeetingCategoryOrganizers = useMemo(() => {
    const counts: Record<string, number> = {};
    eventsFilteredBySearch.forEach(event => {
      if (event.organizerType === 'meeting_category') {
        (eventOrganizingMeetingCategories || []).forEach((link: any) => { if (link.event_id === event.id) counts[link.meeting_category_id] = (counts[link.meeting_category_id] || 0) + 1; });
      }
    });
    return meetingCategories.map(c => ({ ...c, count: counts[c.id] || 0 })).filter(c => c.count > 0).sort((a, b) => a.name.localeCompare(b.name));
  }, [meetingCategories, eventsFilteredBySearch, eventOrganizingMeetingCategories]);

  const sidebarEventCategoryOrganizers = useMemo(() => {
    const counts: Record<string, number> = {};
    eventsFilteredBySearch.forEach(event => {
      if (event.organizerType === 'category') {
        (eventOrganizingCategories || []).forEach((link: any) => { if (link.event_id === event.id) counts[link.category_id] = (counts[link.category_id] || 0) + 1; });
      }
    });
    return eventCategories.map(c => ({ ...c, count: counts[c.id] || 0 })).filter(c => c.count > 0).sort((a, b) => a.name.localeCompare(b.name));
  }, [eventCategories, eventsFilteredBySearch, eventOrganizingCategories]);

  const filteredEvents = useMemo(() => {
    if (!selectedOrganizer) return [];
    if (selectedOrganizer.type === 'meeting_category') {
      const ids = (eventOrganizingMeetingCategories || []).filter((l: any) => l.meeting_category_id === selectedOrganizer.id).map((l: any) => l.event_id);
      return eventsFilteredBySearch.filter(e => ids.includes(e.id));
    }
    const ids = (eventOrganizingCategories || []).filter((l: any) => l.category_id === selectedOrganizer.id).map((l: any) => l.event_id);
    return eventsFilteredBySearch.filter(e => ids.includes(e.id));
  }, [eventsFilteredBySearch, selectedOrganizer, eventOrganizingMeetingCategories, eventOrganizingCategories]);

  const handleFlyerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFlyerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFlyerPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFlyerFile(null);
      setFlyerPreview(eventForViewOrEdit?.flyer_url || null);
    }
  };

  const renderOrganizerSelectionButton = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría(s)</label>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={handleOpenOrganizerSelector} className="flex-grow justify-center">Seleccionar ({selectedOrganizerIdsState.length})</Button>
        <Button type="button" variant="outline" onClick={() => { setAddCatModalType('meeting_category'); setIsAddCatModalOpen(true); }} className="px-3" title="Nueva Categoría Reunión"><PlusIcon className="w-5 h-5" /></Button>
      </div>
      {formErrors.organizerId && <p className="text-xs text-red-500 mt-1">{formErrors.organizerId}</p>}
    </div>
  );
  const renderParticipantSelectionButton = (list: string[], mode: any, label: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => handleOpenEventParticipantSelector(mode)} className="w-full justify-center">Seleccionar ({list.length})</Button>
        {mode === 'invitees' && <Button onClick={handleSuggestInvitees} variant="outline" title="Sugerir basados en eventos pasados">Sugerir</Button>}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Programar Eventos</h1>
        <div className="flex space-x-2">
          {can('create', 'Event') && <Button onClick={handleOpenCreateModal} variant="primary"><PlusIcon className="w-5 h-5 mr-2" /> Añadir Evento</Button>}
          {onNavigateBack && <Button onClick={onNavigateBack} variant="secondary">Volver</Button>}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-grow overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:block md:w-64 flex-shrink-0">
          <div className="sticky top-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Filtrar por Categoría</h3>
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar evento..." containerClassName="mb-4" />
            <nav className="flex-grow overflow-y-auto custom-scrollbar">
              <ul className="space-y-1">

                {sidebarMeetingCategoryOrganizers.length > 0 && <li className="px-3 py-1 text-xs font-bold text-gray-500 uppercase mt-2">Comisiones</li>}
                {sidebarMeetingCategoryOrganizers.map(c => <li key={c.id}><button onClick={() => setSelectedOrganizer({ type: 'meeting_category', id: c.id })} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between text-sm ${selectedOrganizer?.type === 'meeting_category' && selectedOrganizer.id === c.id ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30' : ''}`}><span>{c.name}</span> <span className="text-xs bg-gray-200 dark:bg-gray-700 rounded-full px-2">{c.count}</span></button></li>)}

                {sidebarEventCategoryOrganizers.length > 0 && <li className="px-3 py-1 text-xs font-bold text-gray-500 uppercase mt-2">Categorías de Evento</li>}
                {sidebarEventCategoryOrganizers.map(c => <li key={c.id}><button onClick={() => setSelectedOrganizer({ type: 'category', id: c.id })} className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between text-sm ${selectedOrganizer?.type === 'category' && selectedOrganizer.id === c.id ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30' : ''}`}><span>{c.name}</span> <span className="text-xs bg-gray-200 dark:bg-gray-700 rounded-full px-2">{c.count}</span></button></li>)}
              </ul>
            </nav>
          </div>
        </aside>

        <main className="flex-grow flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <div className="md:hidden w-full"><Button onClick={() => setIsCategoryListVisible(!isCategoryListVisible)} variant="outline" className="w-full">Filtrar Categorías</Button></div>
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
          {isCategoryListVisible && (
            <div className="md:hidden mb-4 bg-white dark:bg-gray-800 p-2 rounded shadow max-h-48 overflow-y-auto">

              {sidebarMeetingCategoryOrganizers.map(c => <div key={c.id} onClick={() => { setSelectedOrganizer({ type: 'meeting_category', id: c.id }); setIsCategoryListVisible(false); }} className="p-2 cursor-pointer hover:bg-gray-100">{c.name}</div>)}
              {sidebarEventCategoryOrganizers.map(c => <div key={c.id} onClick={() => { setSelectedOrganizer({ type: 'category', id: c.id }); setIsCategoryListVisible(false); }} className="p-2 cursor-pointer hover:bg-gray-100">{c.name}</div>)}
            </div>
          )}

          <div className="flex-grow overflow-y-auto custom-scrollbar rounded-lg">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                {selectedOrganizer ? 'No hay eventos que coincidan con los filtros en esta categoría.' : 'Seleccione una categoría para ver los eventos.'}
              </div>
            ) : (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-1">
                  {filteredEvents.map(event => (
                    <Card key={event.id} className="hover:shadow-lg transition-shadow cursor-pointer group flex flex-col h-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" onClick={() => handleOpenViewModal(event)}>
                      <div className="h-40 bg-gray-100 dark:bg-gray-700 relative overflow-hidden flex items-center justify-center">
                        {event.flyer_url ? (
                          <img src={event.flyer_url} alt={event.subject} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <span className="text-4xl">📅</span>
                        )}
                        {event.is_cancelled && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-red-600 text-white px-3 py-1 text-sm font-bold uppercase -rotate-12 transform">Cancelado</span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 mb-1 inline-block">
                              {event.organizerType === 'meeting_category' ? 'Comisión' : 'Categoría'}
                            </span>
                            <h3 className={`font-bold text-lg leading-tight ${event.is_cancelled ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>{event.subject}</h3>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4 flex-grow">
                          <p className="flex items-center"><span className="mr-2">🗓️</span> {new Date(event.date).toLocaleDateString()}</p>
                          <p className="flex items-center"><span className="mr-2">🕒</span> {formatTo12Hour(event.startTime)}</p>
                          <p className="flex items-center line-clamp-1"><span className="mr-2">🏷️</span> {getDisplayOrganizerNameForEvent(event)}</p>
                        </div>

                        <div className="flex justify-end pt-2 border-t dark:border-gray-700 space-x-2">
                          {can('update', 'Event') && (
                            <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); setEventForViewOrEdit(event); setModalMode('edit'); setIsModalOpen(true); }} title="Editar">
                              <EditIcon className="w-4 h-4 mr-1" /> Editar
                            </Button>
                          )}
                          {can('delete', 'Event') && (
                            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setEventToDelete(event); }} title="Eliminar">
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hora</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Asunto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Categoría</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredEvents.map(event => (
                        <tr key={event.id} onClick={() => handleOpenViewModal(event)} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{new Date(event.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatTo12Hour(event.startTime)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                            <div className={event.is_cancelled ? 'line-through text-gray-400' : ''}>{event.subject}</div>
                            {event.is_cancelled && <span className="text-xs text-red-500 font-bold">CANCELADO</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{getDisplayOrganizerNameForEvent(event)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {can('update', 'Event') && (
                                <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); setEventForViewOrEdit(event); setModalMode('edit'); setIsModalOpen(true); }} title="Editar">
                                  <EditIcon className="w-4 h-4" />
                                </Button>
                              )}
                              {can('delete', 'Event') && (
                                <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setEventToDelete(event); }} title="Eliminar">
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

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? `Crear Evento (${currentStep}/${TOTAL_STEPS_CREATE})` : (modalMode === 'edit' ? 'Editar Evento' : 'Detalles del Evento')}>
        {modalMode === 'create' ? (
          <div className="space-y-4">
            {currentStep === 1 && (
              <>
                <Input label="Asunto del Evento" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required error={formErrors.subject} />
                {renderOrganizerSelectionButton()}
                <label className="flex items-center space-x-2 mt-2">
                  <input type="checkbox" checked={isCompanyEvent} onChange={e => setIsCompanyEvent(e.target.checked)} className="h-4 w-4 text-primary-600 rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Es un evento de empresa/visita</span>
                </label>
                {isCompanyEvent && (
                  <div className="relative">
                    <Input label="Buscar Empresa" value={companySearchTerm} onChange={e => setCompanySearchTerm(e.target.value)} onBlur={handleCompanyInputBlur} placeholder="Escriba nombre de empresa..." />
                    {companySuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded mt-1 shadow-lg">
                        {companySuggestions.map(c => (
                          <div key={c.id_establecimiento} onClick={() => { setSelectedCompanyId(c.id_establecimiento); setCompanySearchTerm(c.nombre_establecimiento); setCompanySuggestions([]); }} className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-sm">
                            {c.nombre_establecimiento}
                          </div>
                        ))}                  </div>
                    )}
                  </div>
                )}
                <Textarea label="Descripción" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </>
            )}
            {currentStep === 2 && (
              <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-md border dark:border-slate-600">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-sm">Horarios</h3>
                  <label className="flex items-center space-x-2 text-xs cursor-pointer"><input type="checkbox" checked={isDateRange} onChange={e => setIsDateRange(e.target.checked)} /> <span>Rango de fechas</span></label>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Input type="date" label={isDateRange ? "Desde" : "Fecha"} value={scheduleInput.date} onChange={(e) => setScheduleInput({ ...scheduleInput, date: e.target.value })} className="dark:[color-scheme:dark]" />
                  {isDateRange && <Input type="date" label="Hasta" value={scheduleInput.endDate} onChange={(e) => setScheduleInput({ ...scheduleInput, endDate: e.target.value })} className="dark:[color-scheme:dark]" />}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Input type="time" label="Inicio" value={scheduleInput.startTime} onChange={(e) => setScheduleInput({ ...scheduleInput, startTime: e.target.value })} className="dark:[color-scheme:dark]" />
                  <Input type="time" label="Fin" value={scheduleInput.endTime} onChange={(e) => setScheduleInput({ ...scheduleInput, endTime: e.target.value })} className="dark:[color-scheme:dark]" />
                </div>
                <Button onClick={addSchedule} variant="secondary" className="w-full justify-center mb-2"><PlusIcon className="w-5 h-5 mr-1" /> Añadir Horario</Button>
                {formErrors.schedule && <p className="text-xs text-red-500 mb-2">{formErrors.schedule}</p>}

                <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                  {currentSchedules.map((s, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600">
                      <span>{s.date} | {s.startTime} - {s.endTime}</span>
                      <button onClick={() => removeSchedule(i)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="mt-4"><Input label="Lugar (Opcional)" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
              </div>
            )}
            {currentStep === 3 && (
              <div className="space-y-4">
                {renderParticipantSelectionButton(selectedInviteeIds, 'invitees', 'Invitados')}
                <hr className="dark:border-gray-600" />
                {renderParticipantSelectionButton(selectedAttendeesInPerson, 'attendeesInPerson', 'Asistentes Presenciales')}
                {renderParticipantSelectionButton(selectedAttendeesOnline, 'attendeesOnline', 'Asistentes En Línea')}
              </div>
            )}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Costo" name="cost" type="number" value={formData.cost || ''} onChange={handleNumberInputChange} />
                  <Input label="Inversión" name="investment" type="number" value={formData.investment || ''} onChange={handleNumberInputChange} />
                  <Input label="Ingresos" name="revenue" type="number" value={formData.revenue || ''} onChange={handleNumberInputChange} />
                  <Input label="Participantes Externos" name="externalParticipantsCount" type="number" value={formData.externalParticipantsCount || ''} onChange={handleNumberInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flyer/Imagen</label>
                  <Input type="file" onChange={handleFlyerChange} accept="image/*" />
                  {flyerPreview && <img src={flyerPreview} alt="Preview" className="mt-2 h-32 object-cover rounded border" />}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t dark:border-slate-700 mt-4 h-14 items-center">
              {currentStep > 1 ? <Button onClick={handlePrevStep} variant="secondary">Anterior</Button> : <div></div>}
              <Button onClick={handleNextStepOrCreate} variant="primary" disabled={isUploading}>
                {isUploading ? 'Guardando...' : (currentStep === TOTAL_STEPS_CREATE ? 'Crear Evento' : 'Siguiente')}
              </Button>
            </div>
          </div>
        ) : modalMode === 'edit' ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <Input label="Asunto" name="subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required error={formErrors.subject} disabled={!can('update', 'Event')} />
            {renderOrganizerSelectionButton()}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Fecha" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} disabled={!can('update', 'Event')} className="dark:[color-scheme:dark]" />
              <Input label="Hora Inicio" type="time" value={formData.startTime || ''} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} disabled={!can('update', 'Event')} className="dark:[color-scheme:dark]" />
            </div>
            <Input label="Hora Fin" type="time" value={formData.endTime || ''} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} disabled={!can('update', 'Event')} className="dark:[color-scheme:dark]" />
            <Textarea label="Descripción" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={!can('update', 'Event')} />

            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={formData.is_cancelled} onChange={e => setFormData({ ...formData, is_cancelled: e.target.checked })} disabled={!can('update', 'Event')} />
              <span className="text-sm font-medium">Evento Cancelado</span>
            </label>

            {renderParticipantSelectionButton(selectedInviteeIds, 'invitees', 'Invitados')}
            {renderParticipantSelectionButton(selectedAttendeesInPerson, 'attendeesInPerson', 'Asistentes Presenciales')}
            {renderParticipantSelectionButton(selectedAttendeesOnline, 'attendeesOnline', 'Asistentes En Línea')}

            <div className="grid grid-cols-3 gap-2">
              <Input label="Costo" name="cost" type="number" value={formData.cost || ''} onChange={handleNumberInputChange} disabled={!can('update', 'Event')} />
              <Input label="Inversión" name="investment" type="number" value={formData.investment || ''} onChange={handleNumberInputChange} disabled={!can('update', 'Event')} />
              <Input label="Ingresos" name="revenue" type="number" value={formData.revenue || ''} onChange={handleNumberInputChange} disabled={!can('update', 'Event')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Flyer</label>
              {can('update', 'Event') && <Input type="file" onChange={handleFlyerChange} accept="image/*" />}
              {flyerPreview && <img src={flyerPreview} alt="Flyer" className="mt-2 h-32 object-contain rounded border" />}
            </div>

            <Button onClick={handleUpdateSubmit} variant="primary" className="w-full" disabled={isUploading || !can('update', 'Event')}>
              {isUploading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {eventForViewOrEdit && (
              <>
                <h2 className={`text-2xl font-bold ${eventForViewOrEdit.is_cancelled ? 'line-through text-gray-400' : 'text-primary-700 dark:text-primary-400'}`}>{eventForViewOrEdit.subject}</h2>
                {eventForViewOrEdit.is_cancelled && <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">CANCELADO</span>}
                <p><strong>Organizado por:</strong> {getDisplayOrganizerNameForEvent(eventForViewOrEdit)}</p>
                <p><strong>Fecha:</strong> {new Date(eventForViewOrEdit.date).toLocaleDateString()} {eventForViewOrEdit.startTime} - {eventForViewOrEdit.endTime}</p>
                {eventForViewOrEdit.location && <p><strong>Lugar:</strong> {eventForViewOrEdit.location}</p>}
                {eventForViewOrEdit.description && <p className="italic bg-gray-50 dark:bg-gray-700/30 p-2 rounded">{eventForViewOrEdit.description}</p>}

                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded">
                  <div>Invitados: {selectedInviteeIds.length}</div>
                  <div>Asistentes (P): {selectedAttendeesInPerson.length}</div>
                  <div>Asistentes (L): {selectedAttendeesOnline.length}</div>
                  <div>Externos: {eventForViewOrEdit.externalParticipantsCount || 0}</div>
                </div>

                {(eventForViewOrEdit.cost || eventForViewOrEdit.investment || eventForViewOrEdit.revenue) && (
                  <div className="flex gap-4 text-xs">
                    {eventForViewOrEdit.cost && <div>Costo: {eventForViewOrEdit.cost}</div>}
                    {eventForViewOrEdit.investment && <div>Inv.: {eventForViewOrEdit.investment}</div>}
                    {eventForViewOrEdit.revenue && <div>Ing.: {eventForViewOrEdit.revenue}</div>}
                  </div>
                )}

                {eventForViewOrEdit.flyer_url && (
                  <div>
                    <p className="font-semibold mb-1">Flyer:</p>
                    <img src={eventForViewOrEdit.flyer_url} alt="Flyer" className="max-h-60 rounded border" />
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4 pt-2 border-t dark:border-gray-600">
                  <p>Creado por {getUserName(eventForViewOrEdit.createdBy)} el {formatAuditDate(eventForViewOrEdit.createdAt)}</p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="secondary" onClick={handleCloseModal}>Cerrar</Button>
                  <div className="flex gap-2">
                    {can('update', 'Event') && <Button variant="accent" onClick={() => setModalMode('edit')}>Editar</Button>}
                    {can('delete', 'Event') && <Button variant="danger" onClick={() => { setIsModalOpen(false); setEventToDelete(eventForViewOrEdit); }}>Eliminar</Button>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <ParticipantSelectorModal isOpen={isEventParticipantSelectorModalOpen} onClose={handleEventParticipantSelectionModalClose} title="Seleccionar Participantes" availableParticipants={availableEventParticipantsForSelector} initialSelectedIds={eventParticipantSelectionMode === 'attendeesInPerson' ? selectedAttendeesInPerson : eventParticipantSelectionMode === 'attendeesOnline' ? selectedAttendeesOnline : selectedInviteeIds} onConfirm={handleConfirmEventParticipantSelection} />

      <Modal isOpen={isOrganizerSelectorModalOpen} onClose={handleOrganizerSelectionModalClose} title="Seleccionar Categorías">
        <div className="h-64 overflow-y-auto custom-scrollbar p-2">
          {(tempOrganizerTypeModal === 'meeting_category' ? meetingCategories : eventCategories).map(c => (
            <div key={c.id} onClick={() => handleToggleOrganizerSelection(c.id, tempOrganizerTypeModal)} className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex gap-2 items-center rounded mb-1">
              <input type="checkbox" checked={tempSelectedOrganizerIdsModal.includes(c.id)} readOnly className="pointer-events-none" />
              <span>{c.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2 p-2 border-t dark:border-gray-600">
          <Button onClick={handleOrganizerSelectionModalClose} variant="secondary">Cancelar</Button>
          <Button onClick={handleConfirmOrganizerSelection} variant="primary">Confirmar</Button>
        </div>
      </Modal>

      <Modal isOpen={isAddCatModalOpen} onClose={() => setIsAddCatModalOpen(false)} title="Nueva Categoría">
        <form onSubmit={handleAddNewCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo: {addCatModalType === 'meeting_category' ? 'Comisión' : 'Categoría de Evento'}</label>
            <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nombre de la categoría..." autoFocus required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddCatModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary">Crear</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} title="Confirmar Eliminar">
        <p className="mb-4">¿Está seguro de que desea eliminar el evento <strong>{eventToDelete?.subject}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setEventToDelete(null)} variant="secondary">Cancelar</Button>
          <Button onClick={() => { if (eventToDelete) deleteComplexEvent.mutate(eventToDelete.id); setEventToDelete(null); setIsModalOpen(false); notify.success('Evento eliminado'); }} variant="danger">Eliminar</Button>
        </div>
      </Modal>

      {/* Alert Modal for Notifications */}
      {modalAlert && (
        <Modal isOpen={modalAlert.isOpen} onClose={() => setModalAlert(null)} title={modalAlert.title}>
          <p>{modalAlert.message}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalAlert(null)} variant="secondary">Cancelar</Button>
            <Button onClick={() => { if (modalAlert.onConfirm) modalAlert.onConfirm(); setModalAlert(null); }} variant="primary">Confirmar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageEventsView;
