// views/StatsView.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Meeting, Participant, MeetingCategory, MeetingAttendee, ParticipantMeetingCategory, Company, Event, EventCategory, EventAttendee, EventOrganizingMeetingCategory, EventOrganizingCategory, Task, TaskSchedule, Department, AssistanceLog } from '../types';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/Modal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import ExportIcon from '../components/icons/ExportIcon';
import { useAuth } from '../contexts/AuthContext';
import { usePeriod } from '../contexts/PeriodContext';

interface StatsViewProps {
  meetings: Meeting[];
  participants: Participant[];
  companies: Company[];
  meetingCategories: MeetingCategory[];
  meetingAttendees: MeetingAttendee[];
  participantMeetingCategories: ParticipantMeetingCategory[];
  // Props for Event Stats
  events: Event[];
  eventCategories: EventCategory[];
  eventAttendees: EventAttendee[];
  eventOrganizingMeetingCategories: EventOrganizingMeetingCategory[];
  eventOrganizingCategories: EventOrganizingCategory[];
  // New features
  tasks: Task[];
  taskSchedules: TaskSchedule[];
  departments: Department[];
  assistanceLogs: AssistanceLog[];
  onNavigateBack?: () => void;
}

const reportFieldOptions = [
  { id: 'role', label: 'Rol' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Teléfono' },
  { id: 'company', label: 'Empresa' },
];

const calculateDuration = (startTime: string | null, endTime?: string): number | null => {
  if (!startTime || !endTime) return null;
  try {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
    return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
  } catch (e) {
    return null;
  }
};

const StatsView: React.FC<StatsViewProps> = ({
  meetings,
  participants,
  companies,
  meetingCategories,
  meetingAttendees,
  participantMeetingCategories,
  events,
  eventCategories,
  eventAttendees,
  eventOrganizingMeetingCategories,
  eventOrganizingCategories,
  tasks,
  taskSchedules,
  departments,
  assistanceLogs,
  onNavigateBack,
}) => {
  const { profile } = useAuth();
  const { isInCurrentPeriod, periodLabel } = usePeriod(); // Access period context
  const [activeTab, setActiveTab] = useState<'meetings' | 'events'>('meetings');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedParticipantIdsForStats, setSelectedParticipantIdsForStats] = useState<Set<string>>(new Set());
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // State for the new participant report feature
  const [isParticipantReportModalOpen, setIsParticipantReportModalOpen] = useState(false);
  const [selectedCommissionIdsForReport, setSelectedCommissionIdsForReport] = useState<string[]>([]);
  const [commissionSearchTerm, setCommissionSearchTerm] = useState('');
  const [selectedFieldsForReport, setSelectedFieldsForReport] = useState<string[]>(['role', 'email', 'phone', 'company']);

  const isSuperAdmin = profile?.roles?.name === 'SuperAdmin';

  // --------------------------------------------------------------------------
  // Filter Data by Period
  // --------------------------------------------------------------------------
  const filteredMeetings = useMemo(() =>
    meetings.filter(m => isInCurrentPeriod(m.date)),
    [meetings, isInCurrentPeriod]);

  const filteredEvents = useMemo(() =>
    events.filter(e => isInCurrentPeriod(e.date)),
    [events, isInCurrentPeriod]);

  useEffect(() => {
    if (selectedCategoryId) {
      const participantLinks = participantMeetingCategories.filter(pc => pc.meeting_category_id === selectedCategoryId);
      const participantIds = participantLinks.map(p => p.participant_id);
      setSelectedParticipantIdsForStats(new Set(participantIds));
    } else {
      setSelectedParticipantIdsForStats(new Set());
    }
  }, [selectedCategoryId, participantMeetingCategories]);

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Seleccione una comisión para ver detalles' },
    ...meetingCategories.map(c => ({ value: c.id, label: c.name }))
  ], [meetingCategories]);

  // --------------------------------------------------------------------------
  // Commission Statistics Logic
  // --------------------------------------------------------------------------
  const statsForSelectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;

    const meetingsForCategory = filteredMeetings.filter(m => m.meetingCategoryId === selectedCategoryId);
    const meetingsForCategoryWithDuration = meetingsForCategory.map(m => ({
      ...m,
      durationMinutes: calculateDuration(m.startTime, m.endTime)
    }));

    const meetingsWithActualDuration = meetingsForCategoryWithDuration.filter(m => m.durationMinutes != null && m.durationMinutes > 0);
    const totalDurationAllMeetings = meetingsWithActualDuration.reduce((acc, m) => acc + m.durationMinutes!, 0);
    const averageDurationMinutes = meetingsWithActualDuration.length > 0 ? totalDurationAllMeetings / meetingsWithActualDuration.length : 0;

    const formatMinutes = (minutes: number) => {
      if (minutes <= 0) return '0m';
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    };

    const participantLinks = participantMeetingCategories.filter(pc => pc.meeting_category_id === selectedCategoryId);
    const participantIds = participantLinks.map(p => p.participant_id);
    const participantsForCategory = participants.filter(p => participantIds.includes(p.id));

    const participantStats = participantsForCategory.map(participant => {
      const meetingsAttendedLinks = meetingAttendees.filter(attendee =>
        attendee.participant_id === participant.id &&
        meetingsForCategory.some(m => m.id === attendee.meeting_id)
      );

      const attendedInPerson = meetingsAttendedLinks.filter(a => a.attendance_type === 'in_person').length;
      const attendedOnline = meetingsAttendedLinks.filter(a => a.attendance_type === 'online').length;
      const totalAttended = attendedInPerson + attendedOnline;
      const totalMeetings = meetingsForCategory.length;
      const missed = totalMeetings - totalAttended;
      const attendanceRate = totalMeetings > 0 ? (totalAttended / totalMeetings) * 100 : 0;

      const attendedMeetingIds = new Set(meetingsAttendedLinks.map(a => a.meeting_id));
      const participantMeetingsAttendedDetails = meetingsForCategoryWithDuration.filter(m => attendedMeetingIds.has(m.id));
      const investedMinutes = participantMeetingsAttendedDetails.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);

      return {
        participantId: participant.id,
        participantName: participant.name,
        attendedInPerson,
        attendedOnline,
        totalAttended,
        missed,
        totalMeetings,
        attendanceRate: attendanceRate.toFixed(1),
        investedHours: (investedMinutes / 60).toFixed(2),
      };
    }).sort((a, b) => b.totalAttended - a.totalAttended);

    const selectedParticipantStats = participantStats.filter(stat => selectedParticipantIdsForStats.has(stat.participantId));

    const totalAttendanceSlots = selectedParticipantStats.reduce((sum, stat) => sum + stat.totalMeetings, 0);
    const totalAttendees = selectedParticipantStats.reduce((sum, stat) => sum + stat.totalAttended, 0);

    const totalInvestedHoursSelected = selectedParticipantStats.reduce((sum, stat) => sum + parseFloat(stat.investedHours), 0);
    const totalInPersonSelected = selectedParticipantStats.reduce((sum, stat) => sum + stat.attendedInPerson, 0);
    const totalOnlineSelected = selectedParticipantStats.reduce((sum, stat) => sum + stat.attendedOnline, 0);

    // % General Attendance (relative to total possible slots)
    const overallAttendanceRate = totalAttendanceSlots > 0 ? (totalAttendees / totalAttendanceSlots) * 100 : 0;

    // % Presencial / Online (relative to ACTUAL attendance)
    // Formula: (Total InPerson / Total Attendees) * 100
    const totalAttendanceCount = totalInPersonSelected + totalOnlineSelected;
    const percentInPersonSelected = totalAttendanceCount > 0 ? (totalInPersonSelected / totalAttendanceCount) * 100 : 0;
    const percentOnlineSelected = totalAttendanceCount > 0 ? (totalOnlineSelected / totalAttendanceCount) * 100 : 0;

    return {
      totalMeetings: meetingsForCategory.length,
      totalParticipants: participantsForCategory.length,
      selectedParticipantsCount: selectedParticipantIdsForStats.size,
      overallAttendanceRate: overallAttendanceRate.toFixed(1),
      participantStats,
      totalMeetingHoursSelected: totalInvestedHoursSelected.toFixed(2),
      percentInPersonSelected: percentInPersonSelected.toFixed(1), // Now a percentage
      percentOnlineSelected: percentOnlineSelected.toFixed(1),     // Now a percentage
      averageMeetingDuration: formatMinutes(averageDurationMinutes),
    };
  }, [selectedCategoryId, filteredMeetings, participants, meetingAttendees, participantMeetingCategories, selectedParticipantIdsForStats]);

  // --------------------------------------------------------------------------
  // Event Statistics Logic
  // --------------------------------------------------------------------------
  const eventStats = useMemo(() => {
    if (!filteredEvents.length) return null;

    let totalEvents = 0;
    let totalParticipants = 0;
    let totalInPerson = 0;
    let totalOnline = 0;
    let totalExternal = 0;
    let totalCost = 0;
    let totalInvestment = 0;
    let totalRevenue = 0;

    const categoryStats: Record<string, { name: string; count: number }> = {};

    filteredEvents.forEach(event => {
      totalEvents++;
      totalExternal += (event.externalParticipantsCount || 0);
      totalCost += (event.cost || 0);
      totalInvestment += (event.investment || 0);
      totalRevenue += (event.revenue || 0);

      const attendees = eventAttendees.filter(ea => ea.event_id === event.id);
      const inPerson = attendees.filter(ea => ea.attendance_type === 'in_person').length;
      const online = attendees.filter(ea => ea.attendance_type === 'online').length;

      totalInPerson += inPerson;
      totalOnline += online;
      totalParticipants += (inPerson + online + (event.externalParticipantsCount || 0));

      // Categorization
      if (event.organizerType === 'meeting_category') {
        const links = eventOrganizingMeetingCategories.filter(l => l.event_id === event.id);
        links.forEach(link => {
          const catName = meetingCategories.find(c => c.id === link.meeting_category_id)?.name || 'Desconocida';
          if (!categoryStats[catName]) categoryStats[catName] = { name: catName, count: 0 };
          categoryStats[catName].count++;
        });
      } else {
        const links = eventOrganizingCategories.filter(l => l.event_id === event.id);
        links.forEach(link => {
          const catName = eventCategories.find(c => c.id === link.category_id)?.name || 'Desconocida';
          if (!categoryStats[catName]) categoryStats[catName] = { name: catName, count: 0 };
          categoryStats[catName].count++;
        });
      }
    });

    const sortedCategories = Object.values(categoryStats).sort((a, b) => b.count - a.count);

    return {
      totalEvents,
      totalParticipants,
      totalInPerson,
      totalOnline,
      totalExternal,
      totalCost,
      totalInvestment,
      totalRevenue,
      sortedCategories
    };
  }, [filteredEvents, eventAttendees, eventOrganizingMeetingCategories, eventOrganizingCategories, meetingCategories, eventCategories]);


  useEffect(() => {
    if (selectAllCheckboxRef.current && statsForSelectedCategory) {
      const allIdsInView = statsForSelectedCategory.participantStats.map(p => p.participantId);
      const selectedCount = allIdsInView.filter(id => selectedParticipantIdsForStats.has(id)).length;

      if (allIdsInView.length === 0) {
        selectAllCheckboxRef.current.checked = false;
        selectAllCheckboxRef.current.indeterminate = false;
      } else if (selectedCount === allIdsInView.length) {
        selectAllCheckboxRef.current.checked = true;
        selectAllCheckboxRef.current.indeterminate = false;
      } else if (selectedCount === 0) {
        selectAllCheckboxRef.current.checked = false;
        selectAllCheckboxRef.current.indeterminate = false;
      } else {
        selectAllCheckboxRef.current.checked = false;
        selectAllCheckboxRef.current.indeterminate = true;
      }
    }
  }, [selectedParticipantIdsForStats, statsForSelectedCategory]);

  const escapeCsvValue = (value: any): string => {
    const stringValue = String(value ?? '').trim();
    if (stringValue.includes('"') || stringValue.includes(';') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExportAttendanceToCSV = () => {
    if (!statsForSelectedCategory) return;

    const { participantStats, totalMeetings, selectedParticipantsCount, totalMeetingHoursSelected, overallAttendanceRate, percentInPersonSelected, percentOnlineSelected } = statsForSelectedCategory;
    const statsToExport = participantStats.filter(stat => selectedParticipantIdsForStats.has(stat.participantId));

    const commissionName = meetingCategories.find(c => c.id === selectedCategoryId)?.name || 'Comision';
    const safeFilename = commissionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const separator = ';';

    const summaryLines = [
      `Resumen de la Comisión: ${escapeCsvValue(commissionName)}`,
      `Periodo: ${periodLabel}`,
      ``,
      `Reuniones Realizadas;${totalMeetings}`,
      `Participantes Seleccionados;${selectedParticipantsCount}`,
      `Horas Totales Invertidas (Seleccionados);${totalMeetingHoursSelected}`,
      `Asistencia General (Seleccionados);${overallAttendanceRate}%`,
      `% Asistencia Presencial (del total asistido);${percentInPersonSelected}%`,
      `% Asistencia Online (del total asistido);${percentOnlineSelected}%`,
      ``,
      ``,
    ];

    const headers = [
      'Participante', 'Presencial', 'En Línea', 'Total Asistido',
      'Inasistencias', '% de Asistencia', 'Horas Invertidas',
    ];

    const csvRows = statsToExport.map(stat => {
      const row = [
        escapeCsvValue(stat.participantName),
        escapeCsvValue(stat.attendedInPerson),
        escapeCsvValue(stat.attendedOnline),
        escapeCsvValue(stat.totalAttended),
        escapeCsvValue(stat.missed),
        escapeCsvValue(`${stat.attendanceRate}%`),
        escapeCsvValue(stat.investedHours),
      ];
      return row.join(separator);
    });

    const csvString = [...summaryLines, headers.join(separator), ...csvRows].join('\n');

    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `estadisticas_asistencia_${safeFilename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportParticipantsByCommission = () => {
    // (Same logic as before, elided for brevity since no changes requested here)
    if (selectedCommissionIdsForReport.length === 0) {
      alert('Por favor, seleccione al menos una comisión.');
      return;
    }
    // ... rest of the export logic ...
    // For simplicity, I'm keeping the existing logic, assuming it's correct as provided previously.
    const getCompanyName = (participant: Participant): string => {
      if (!participant.id_establecimiento) return 'N/A';
      const company = companies.find(c => c.id_establecimiento === participant.id_establecimiento);
      return company ? company.nombre_establecimiento : 'Desconocido';
    };

    const headers = ['Comision', 'Participante'];
    reportFieldOptions.forEach(field => {
      if (selectedFieldsForReport.includes(field.id)) {
        headers.push(field.label);
      }
    });

    const rows: string[][] = [];

    selectedCommissionIdsForReport.forEach(commissionId => {
      const commission = meetingCategories.find(c => c.id === commissionId);
      if (!commission) return;

      const participantIdsInCommission = participantMeetingCategories
        .filter(pc => pc.meeting_category_id === commissionId)
        .map(pc => pc.participant_id);

      const participantsInCommission = participants
        .filter(p => participantIdsInCommission.includes(p.id))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (participantsInCommission.length === 0) {
        const emptyRow = [escapeCsvValue(commission.name), '(Sin participantes asignados)', ...Array(headers.length - 2).fill('')];
        rows.push(emptyRow);
      } else {
        participantsInCommission.forEach(participant => {
          const row: string[] = [escapeCsvValue(commission.name), escapeCsvValue(participant.name)];
          if (selectedFieldsForReport.includes('role')) row.push(escapeCsvValue(participant.role));
          if (selectedFieldsForReport.includes('email')) row.push(escapeCsvValue(participant.email));
          if (selectedFieldsForReport.includes('phone')) row.push(escapeCsvValue(participant.phone));
          if (selectedFieldsForReport.includes('company')) row.push(escapeCsvValue(getCompanyName(participant)));
          rows.push(row);
        });
      }
    });

    const csvString = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'reporte_participantes_por_comision.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setIsParticipantReportModalOpen(false);
    setSelectedCommissionIdsForReport([]);
    setCommissionSearchTerm('');
  };

  const filteredCommissionsForModal = useMemo(() =>
    meetingCategories
      .filter(c => c.name.toLowerCase().includes(commissionSearchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [meetingCategories, commissionSearchTerm]
  );

  const handleToggleCommissionSelection = (commissionId: string) => {
    setSelectedCommissionIdsForReport(prev =>
      prev.includes(commissionId)
        ? prev.filter(id => id !== commissionId)
        : [...prev, commissionId]
    );
  };

  const handleSelectAllCommissions = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allVisibleIds = filteredCommissionsForModal.map(c => c.id);
      setSelectedCommissionIdsForReport(prev => [...new Set([...prev, ...allVisibleIds])]);
    } else {
      const allVisibleIds = filteredCommissionsForModal.map(c => c.id);
      setSelectedCommissionIdsForReport(prev => prev.filter(id => !allVisibleIds.includes(id)));
    }
  };

  const handleToggleFieldSelection = (fieldId: string) => {
    setSelectedFieldsForReport(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleToggleParticipantSelection = (participantId: string) => {
    setSelectedParticipantIdsForStats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const handleSelectAllParticipants = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = statsForSelectedCategory?.participantStats.map(p => p.participantId) || [];
      setSelectedParticipantIdsForStats(new Set(allIds));
    } else {
      setSelectedParticipantIdsForStats(new Set());
    }
  };


  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Estadísticas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Datos correspondientes al {periodLabel}</p>
        </div>
        {onNavigateBack && <Button onClick={onNavigateBack} variant="secondary">Volver al Menú</Button>}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('meetings')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'meetings' ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'}`}
        >
          Estadísticas de Comisiones
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'events' ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'}`}
        >
          Estadísticas de Eventos
        </button>
      </div>

      {activeTab === 'meetings' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Participación en Comisiones</CardTitle>
              <CardDescription>Seleccione una comisión para ver sus estadísticas detalladas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                options={categoryOptions}
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full max-w-md"
                aria-label="Seleccionar Comisión"
              />
            </CardContent>
          </Card>

          {statsForSelectedCategory && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen: {meetingCategories.find(c => c.id === selectedCategoryId)?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{statsForSelectedCategory.totalMeetings}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Reuniones Realizadas</p>
                  </div>
                  <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{statsForSelectedCategory.totalParticipants}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Participantes Asignados</p>
                  </div>
                  <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{statsForSelectedCategory.totalMeetingHoursSelected}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Horas Totales</p>
                  </div>
                  <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{statsForSelectedCategory.overallAttendanceRate}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Asistencia General ({statsForSelectedCategory.selectedParticipantsCount} seleccionados)</p>
                  </div>
                  <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{statsForSelectedCategory.percentInPersonSelected}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">% Presencial (del total asistido)</p>
                  </div>
                  <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{statsForSelectedCategory.percentOnlineSelected}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">% Online (del total asistido)</p>
                  </div>
                  <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{statsForSelectedCategory.averageMeetingDuration}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Duración Promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {statsForSelectedCategory && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <CardTitle>Estadísticas por Participante</CardTitle>
                  <CardDescription>Seleccione participantes para recalcular el resumen general.</CardDescription>
                </div>
                <Button
                  onClick={handleExportAttendanceToCSV}
                  variant="secondary"
                  size="sm"
                  className="mt-4 sm:mt-0"
                  disabled={!statsForSelectedCategory || !isSuperAdmin}
                  title={!isSuperAdmin ? "Solo SuperAdmins pueden exportar" : "Exportar Asistencia"}
                >
                  <ExportIcon className="w-4 h-4 mr-2" />
                  Exportar Asistencia
                </Button>
              </CardHeader>
              <CardContent>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {statsForSelectedCategory.participantStats.map(stat => (
                    <div key={stat.participantId} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedParticipantIdsForStats.has(stat.participantId)}
                          onChange={() => handleToggleParticipantSelection(stat.participantId)}
                          aria-labelledby={`participant-name-${stat.participantId}`}
                          className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mr-3"
                        />
                        <h4 id={`participant-name-${stat.participantId}`} className="font-semibold text-gray-800 dark:text-gray-100">{stat.participantName}</h4>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Asistencia: </span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{stat.totalAttended} / {stat.totalMeetings}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">% Asistencia: </span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{stat.attendanceRate}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Inasistencias: </span>
                          <span className="font-medium text-red-500">{stat.missed}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Pres./Online: </span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{stat.attendedInPerson} / {stat.attendedOnline}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Horas Invertidas: </span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{stat.investedHours}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              ref={selectAllCheckboxRef}
                              onChange={handleSelectAllParticipants}
                              aria-label="Seleccionar todos los participantes"
                              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mr-3"
                            />
                            Participante
                          </div>
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Presencial</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">En Línea</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Asistido</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Inasistencias</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">% de Asistencia</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Horas Invertidas</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                      {statsForSelectedCategory.participantStats.map(stat => (
                        <tr key={stat.participantId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedParticipantIdsForStats.has(stat.participantId)}
                                onChange={() => handleToggleParticipantSelection(stat.participantId)}
                                aria-labelledby={`participant-name-desktop-${stat.participantId}`}
                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mr-3"
                              />
                              <span id={`participant-name-desktop-${stat.participantId}`}>{stat.participantName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">{stat.attendedInPerson}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">{stat.attendedOnline}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-700 dark:text-gray-200">{stat.totalAttended}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-500">{stat.missed}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">{stat.attendanceRate}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-300">{stat.investedHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {isSuperAdmin && <Card>
            <CardHeader>
              <CardTitle>Reporte de Participantes por Comisión</CardTitle>
              <CardDescription>Exporte una lista de participantes para una o más comisiones seleccionadas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsParticipantReportModalOpen(true)}>
                <ExportIcon className="w-4 h-4 mr-2" />
                Generar Reporte de Participantes
              </Button>
            </CardContent>
          </Card>}
        </>
      )}

      {activeTab === 'events' && eventStats && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen General de Eventos</CardTitle>
              <CardDescription>Datos consolidados del periodo {periodLabel}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{eventStats.totalEvents}</p>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">Eventos Realizados</p>
                </div>
                <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{eventStats.totalParticipants}</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Total Participantes</p>
                </div>
                <div className="p-4 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">{eventStats.totalInPerson}</p>
                  <p className="text-sm text-purple-800 dark:text-purple-200">Asistentes Presenciales</p>
                </div>
                <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                  <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{eventStats.totalOnline}</p>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">Asistentes Online</p>
                </div>
              </div>
              {eventStats.totalExternal > 0 && (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-slate-700 rounded text-center text-sm text-gray-600 dark:text-gray-300">
                  Se registraron <strong>{eventStats.totalExternal}</strong> participantes externos adicionales.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Eventos por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {eventStats.sortedCategories.map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 border-b dark:border-slate-700 last:border-0">
                      <span className="font-medium text-gray-700 dark:text-gray-200">{cat.name}</span>
                      <span className="bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs font-bold px-2 py-1 rounded-full">{cat.count}</span>
                    </div>
                  ))}
                  {eventStats.sortedCategories.length === 0 && <p className="text-center text-gray-500">No hay datos de categorías.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen Financiero</CardTitle>
                <CardDescription>Total acumulado de los eventos del periodo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Costo Total:</span>
                  <span className="text-lg font-semibold text-red-600 dark:text-red-400">$ {eventStats.totalCost.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Inversión Total:</span>
                  <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">$ {eventStats.totalInvestment.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t dark:border-slate-700">
                  <span className="text-gray-800 dark:text-gray-100 font-bold">Ingresos Totales:</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">$ {eventStats.totalRevenue.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Modal
        isOpen={isParticipantReportModalOpen}
        onClose={() => setIsParticipantReportModalOpen(false)}
        title="Generar Reporte de Participantes"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Seleccione las comisiones de las que desea generar una lista de participantes.
          </p>
          <Input
            type="search"
            placeholder="Buscar comisiones..."
            value={commissionSearchTerm}
            onChange={(e) => setCommissionSearchTerm(e.target.value)}
            autoFocus
          />
          <div className="max-h-60 overflow-y-auto border dark:border-slate-600 rounded-md p-2 space-y-1">
            {filteredCommissionsForModal.length > 0 && (
              <div className="flex items-center p-2 border-b dark:border-slate-600">
                <input
                  type="checkbox"
                  id="select-all-commissions"
                  onChange={handleSelectAllCommissions}
                  checked={filteredCommissionsForModal.length > 0 && filteredCommissionsForModal.every(c => selectedCommissionIdsForReport.includes(c.id))}
                  ref={el => {
                    if (el) {
                      const selectedCount = filteredCommissionsForModal.filter(c => selectedCommissionIdsForReport.includes(c.id)).length;
                      el.indeterminate = selectedCount > 0 && selectedCount < filteredCommissionsForModal.length;
                    }
                  }}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="select-all-commissions" className="ml-2 text-sm font-medium">
                  Seleccionar/Deseleccionar Visibles
                </label>
              </div>
            )}
            {filteredCommissionsForModal.map(commission => (
              <div
                key={commission.id}
                className="flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <input
                  type="checkbox"
                  id={`commission-${commission.id}`}
                  checked={selectedCommissionIdsForReport.includes(commission.id)}
                  onChange={() => handleToggleCommissionSelection(commission.id)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor={`commission-${commission.id}`} className="ml-2 text-sm w-full">
                  {commission.name}
                </label>
              </div>
            ))}
            {filteredCommissionsForModal.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No se encontraron comisiones.</p>
            )}
          </div>

          <div className="pt-4 border-t dark:border-slate-600">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Campos a Incluir en el Reporte</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {reportFieldOptions.map(field => (
                <div key={field.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`field-${field.id}`}
                    checked={selectedFieldsForReport.includes(field.id)}
                    onChange={() => handleToggleFieldSelection(field.id)}
                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor={`field-${field.id}`} className="ml-2 text-sm">{field.label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
          <Button variant="secondary" onClick={() => setIsParticipantReportModalOpen(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleExportParticipantsByCommission}
            disabled={selectedCommissionIdsForReport.length === 0}
          >
            <ExportIcon className="w-4 h-4 mr-2" />
            Exportar ({selectedCommissionIdsForReport.length})
          </Button>
        </div>
      </Modal>

    </div>
  );
};

export default StatsView;