
// views/ReportsView.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Meeting, Event, Participant, MeetingCategory, EventCategory, MeetingAttendee, EventAttendee, EventOrganizingMeetingCategory, EventOrganizingCategory, Company, AssistanceLog } from '../types';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import AppLogo from '../components/AppLogo';
import ExportIcon from '../components/icons/ExportIcon';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

interface ReportsViewProps {
  meetings: Meeting[];
  events: Event[];
  participants: Participant[];
  companies: Company[];
  meetingCategories: MeetingCategory[];
  eventCategories: EventCategory[];
  meetingAttendees: MeetingAttendee[];
  eventAttendees: EventAttendee[];
  eventOrganizingMeetingCategories: EventOrganizingMeetingCategory[];
  eventOrganizingCategories: EventOrganizingCategory[];
  assistanceLogs: AssistanceLog[];
  onNavigateBack?: () => void;
}

type ActivityItem = (Meeting & { type: 'meeting' }) | (Event & { type: 'event' });

interface ReportData {
  startDate: string;
  endDate: string;
  activities: (ActivityItem & {
    durationMinutes: number | null;
    totalParticipants: number;
    participantNames: string[];
    inPersonCount: number;
    onlineCount: number;
    externalCount: number;
    organizerName: string; // Added for grouping
  })[];
  summary: {
    totalMeetings: number;
    totalEvents: number;
    totalHours: number;
    totalParticipants: number;
  };
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';

const palette = [
  { name: 'blue', bg: 'bg-blue-600', bgLight: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', textDark: 'text-blue-900' },
  { name: 'orange', bg: 'bg-orange-500', bgLight: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', textDark: 'text-orange-800' },
  { name: 'green', bg: 'bg-green-500', bgLight: 'bg-green-50', border: 'border-green-100', text: 'text-green-600', textDark: 'text-green-800' },
  { name: 'purple', bg: 'bg-purple-500', bgLight: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', textDark: 'text-purple-800' },
  { name: 'red', bg: 'bg-red-500', bgLight: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', textDark: 'text-red-800' },
  { name: 'teal', bg: 'bg-teal-500', bgLight: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-600', textDark: 'text-teal-800' },
];

const ReportsView: React.FC<ReportsViewProps> = ({
  meetings, events, participants, companies, meetingCategories, eventCategories,
  meetingAttendees, eventAttendees, eventOrganizingMeetingCategories, eventOrganizingCategories,
  onNavigateBack
}) => {
  const { profile } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isSuperAdmin = profile?.roles?.name === 'SuperAdmin';

  const getMeetingCategoryName = useCallback((id: string) => meetingCategories.find(c => c.id === id)?.name || 'Desconocida', [meetingCategories]);
  const getEventCategoryName = useCallback((id: string) => eventCategories.find(c => c.id === id)?.name || 'Desconocida', [eventCategories]);

  const getDisplayOrganizerName = useCallback((item: ActivityItem): string => {
    if (item.type === 'meeting') {
      return getMeetingCategoryName(item.meetingCategoryId);
    } else { // Event
      if (item.organizerType === 'meeting_category') {
        const orgLinks = eventOrganizingMeetingCategories.filter(eoc => eoc.event_id === item.id);
        const names = orgLinks.map(eoc => getMeetingCategoryName(eoc.meeting_category_id));
        return names.join(', ') || 'Sin Categoría';
      } else {
        const orgLinks = eventOrganizingCategories.filter(eoc => eoc.event_id === item.id);
        const names = orgLinks.map(eoc => getEventCategoryName(eoc.category_id));
        return names.join(', ') || 'Sin Categoría';
      }
    }
  }, [getMeetingCategoryName, getEventCategoryName, eventOrganizingMeetingCategories, eventOrganizingCategories]);

  const getParticipantName = useCallback((id: string) => participants.find(p => p.id === id)?.name || 'Desconocido', [participants]);

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

  const handleDateInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      if (typeof (e.currentTarget as any).showPicker === 'function') {
        (e.currentTarget as any).showPicker();
      }
    } catch (error) {
      console.debug('Date picker open failed:', error);
    }
  };

  const handleGenerateReport = () => {
    let startDate: Date, endDate: Date;

    try {
      switch (reportType) {
        case 'daily': {
          if (!selectedDay) { alert('Por favor, seleccione un día.'); return; }
          startDate = new Date(selectedDay + 'T00:00:00');
          endDate = new Date(selectedDay + 'T23:59:59');
          break;
        }
        case 'weekly': {
          if (!selectedWeek) { alert('Por favor, seleccione una semana.'); return; }
          const [year, weekNum] = selectedWeek.split('-W').map(Number);
          const firstDayOfYear = new Date(year, 0, 1);
          const daysOffset = (weekNum - 1) * 7 - firstDayOfYear.getDay() + 1;
          startDate = new Date(year, 0, daysOffset);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          break;
        }
        case 'monthly': {
          if (!selectedMonth) { alert('Por favor, seleccione un mes.'); return; }
          const [year, month] = selectedMonth.split('-').map(Number);
          startDate = new Date(year, month - 1, 1);
          endDate = new Date(year, month, 0);
          break;
        }
        case 'custom': {
          if (!customStartDate || !customEndDate) { alert('Por favor, seleccione un rango de fechas.'); return; }
          startDate = new Date(customStartDate + 'T00:00:00');
          endDate = new Date(customEndDate + 'T23:59:59');
          if (startDate > endDate) { alert('La fecha de inicio debe ser anterior a la fecha de fin.'); return; }
          break;
        }
      }
    } catch (e) {
      alert('Fecha inválida. Por favor, verifique su selección.');
      return;
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const allActivities: ActivityItem[] = [
      ...meetings.map(m => ({ ...m, type: 'meeting' as 'meeting' })),
      ...events.map(e => ({ ...e, type: 'event' as 'event' })),
    ];

    const filteredActivities = allActivities.filter(item => {
      const itemDate = new Date(item.date + 'T00:00:00');
      return itemDate >= startDate && itemDate <= endDate;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.startTime || '').localeCompare(b.startTime || ''));

    const processedActivities = filteredActivities.map(item => {
      const attendees = item.type === 'meeting'
        ? meetingAttendees.filter(a => a.meeting_id === item.id)
        : eventAttendees.filter(a => a.event_id === item.id);

      const participantIds = attendees.map(a => a.participant_id);
      const inPersonCount = attendees.filter(a => a.attendance_type === 'in_person').length;
      const onlineCount = attendees.filter(a => a.attendance_type === 'online').length;
      const externalCount = item.externalParticipantsCount || 0;

      return {
        ...item,
        durationMinutes: calculateDuration(item.startTime, item.endTime),
        totalParticipants: externalCount + inPersonCount + onlineCount,
        participantNames: participantIds.map(getParticipantName),
        inPersonCount,
        onlineCount,
        externalCount,
        organizerName: getDisplayOrganizerName(item),
      };
    });

    const totalMeetings = processedActivities.filter(a => a.type === 'meeting').length;
    const totalEvents = processedActivities.filter(a => a.type === 'event').length;
    const totalMinutes = processedActivities.reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
    const totalParticipation = processedActivities.reduce((sum, item) => sum + item.totalParticipants, 0);

    setReportData({
      startDate: startStr,
      endDate: endStr,
      activities: processedActivities,
      summary: {
        totalMeetings,
        totalEvents,
        totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
        totalParticipants: totalParticipation,
      }
    });
  };

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    setIsLoading(true);

    const reportPages = document.querySelectorAll<HTMLElement>('.report-page');
    if (reportPages.length === 0) {
      setIsLoading(false);
      alert('No se encontró contenido para exportar.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: [1080, 1920]
    });

    for (let i = 0; i < reportPages.length; i++) {
      const pageElement = reportPages[i];
      try {
        const canvas = await window.html2canvas(pageElement, {
          scale: 2, // Higher scale for better quality
          useCORS: true,
          logging: false,
          width: 1080, // Force canvas width
          height: 1920, // Force canvas height
          windowWidth: 1080,
          windowHeight: 1920,
        });

        const imgData = canvas.toDataURL('image/png');

        if (i > 0) {
          pdf.addPage([1080, 1920], 'p');
        }

        pdf.addImage(imgData, 'PNG', 0, 0, 1080, 1920, undefined, 'FAST');

      } catch (error) {
        console.error(`Error al procesar la página ${i + 1}:`, error);
        alert(`Ocurrió un error al generar la página ${i + 1} del PDF.`);
      }
    }

    pdf.save(`Reporte_CIECNow_${reportData.startDate}_${reportData.endDate}.pdf`);
    setIsLoading(false);
  };

  const renderDateControls = () => {
    switch (reportType) {
      case 'daily': return <Input label="Seleccione el Día" type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} onClick={handleDateInputClick} className="dark:[color-scheme:dark] cursor-pointer" />;
      case 'weekly': return <Input label="Seleccione la Semana" type="week" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} onClick={handleDateInputClick} className="dark:[color-scheme:dark] cursor-pointer" />;
      case 'monthly': return <Input label="Seleccione el Mes" type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} onClick={handleDateInputClick} className="dark:[color-scheme:dark] cursor-pointer" />;
      case 'custom': return (<div className="flex flex-col sm:flex-row gap-4">
        <Input label="Fecha de Inicio" type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} onClick={handleDateInputClick} className="dark:[color-scheme:dark] cursor-pointer" />
        <Input label="Fecha de Fin" type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} onClick={handleDateInputClick} className="dark:[color-scheme:dark] cursor-pointer" />
      </div>);
    }
  };

  // --- Helper functions for the new design ---
  const formatTo12HourTime = (timeString: string | null | undefined): string => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const h = parseInt(hours, 10);
      if (isNaN(h) || !minutes) return timeString;
      const ampm = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return `${h12}:${minutes.padStart(2, '0')} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const formatTimeRange = (startTime: string | null, endTime?: string): string => {
    if (!startTime) return 'Hora no especificada';
    const startFormatted = formatTo12HourTime(startTime);
    if (!endTime) return startFormatted;
    const endFormatted = formatTo12HourTime(endTime);
    return `${startFormatted} - ${endFormatted}`;
  };

  const getDayData = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' });
    const dayNumber = date.toLocaleDateString('es-ES', { day: '2-digit', timeZone: 'UTC' });
    const monthName = date.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' });
    return { dayName, dayNumber, monthName };
  };

  const formatDateRangeHeader = (startStr: string, endStr: string) => {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');

    const sDay = start.getDate().toString().padStart(2, '0');
    const sMonth = start.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' });
    const eDay = end.getDate().toString().padStart(2, '0');
    const eMonth = end.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' });
    const year = start.getFullYear();

    if (startStr === endStr) {
      return { range: `${sDay} ${sMonth}`, year };
    }
    return { range: `${sDay} ${sMonth} - ${eDay} ${eMonth}`, year };
  };

  const renderAgendaDesign = () => {
    if (!reportData) return null;

    // 1. Group by Category
    const groupedActivities: Record<string, typeof reportData.activities> = {};
    reportData.activities.forEach(activity => {
      const category = activity.organizerName || 'General';
      if (!groupedActivities[category]) groupedActivities[category] = [];
      groupedActivities[category].push(activity);
    });

    const categories = Object.keys(groupedActivities).sort();

    const headerData = formatDateRangeHeader(reportData.startDate, reportData.endDate);

    let title = 'Agenda CIEC';
    if (reportType === 'daily') title = 'Agenda Diaria CIEC';
    else if (reportType === 'weekly') title = 'Agenda Semanal CIEC';
    else if (reportType === 'monthly') title = 'Agenda Mensual CIEC';
    else if (reportType === 'custom') title = 'Reporte de Actividades';

    const content = (
      <div className="space-y-8">
        {categories.map((category, index) => {
          const colorTheme = palette[index % palette.length];
          return (
            <section key={category} className="break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2 h-8 ${colorTheme.bg} rounded-full`}></div>
                <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">{category}</h2>
              </div>

              <div className="grid gap-4">
                {groupedActivities[category].map(activity => {
                  const { dayName, dayNumber, monthName } = getDayData(activity.date);
                  const isCancelled = activity.is_cancelled;

                  return (
                    <div key={activity.id} className={`event-card bg-slate-50 border ${colorTheme.border} rounded-lg p-4 flex flex-row items-center gap-6 ${isCancelled ? 'opacity-60 bg-gray-100' : ''}`}>
                      {/* Date Block */}
                      <div className="text-center min-w-[80px]">
                        <span className={`block text-xs font-bold ${colorTheme.text} uppercase`}>{dayName.substring(0, 3)}</span>
                        <span className="block text-3xl font-bold text-gray-800">{dayNumber}</span>
                        <span className="block text-xs text-gray-500 capitalize">{monthName.replace('.', '')}</span>
                      </div>

                      {/* Divider */}
                      <div className={`h-12 w-px ${colorTheme.bg.replace('bg-', 'bg-').replace('500', '200')}`}></div> {/* Simple approximation for lighter line */}

                      {/* Details */}
                      <div className="flex-1">
                        <h3 className={`text-lg font-bold text-gray-900 ${isCancelled ? 'line-through decoration-red-500' : ''}`}>
                          {activity.subject} {isCancelled && <span className="text-red-500 text-sm ml-2">(CANCELADO)</span>}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            {formatTimeRange(activity.startTime, activity.endTime)}
                          </div>
                          {activity.location && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                              {activity.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );

    // Render wrapped in the exact dimensions requested by user for the PDF logic
    return (
      <div className="report-page mx-auto mb-4 w-[1080px] min-h-[1920px] bg-white text-black px-[160px] py-[100px] flex flex-col font-sans box-border relative shadow-xl">
        {/* Header */}
        <header className="border-b-4 border-blue-900 pb-6 mb-8 flex items-center">
          <div className="w-1/4 flex justify-start">
            <AppLogo className="h-20 w-auto object-contain" variant="light" />
          </div>

          <div className="w-1/2 text-center">
            <h1 className="text-6xl text-gray-900" style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: '0.9' }}>{title}</h1>
            <p className="text-gray-500 mt-1 text-sm tracking-widest uppercase font-semibold">Boletín de Actividades Programadas</p>
          </div>

          <div className="w-1/4 text-right">
            <span className="block text-xs font-semibold text-blue-900 uppercase tracking-wider">Periodo</span>
            <span className="text-xl font-bold text-gray-800 capitalize">{headerData.range}</span>
            <span className="block text-gray-400 text-sm">{headerData.year}</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-grow">
          {content}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500 flex justify-between">
          <span>Generado automáticamente por el sistema</span>
          <span>CIEC - Coordinación Integral</span>
        </footer>
      </div>
    );
  };

  const renderReportPreview = () => {
    if (!reportData) return null;

    // Use Agenda Design for ALL report types
    return (
      <Card className="mt-6">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle>Vista Previa del Reporte</CardTitle>
            <CardDescription>Formato Agenda</CardDescription>
          </div>
          <Button onClick={handleDownloadPdf} disabled={isLoading || !isSuperAdmin} title={!isSuperAdmin ? "Solo SuperAdmins pueden exportar" : ""}>
            <ExportIcon className="w-4 h-4 mr-2" />
            {isLoading ? 'Generando PDF...' : 'Descargar PDF'}
          </Button>
        </CardHeader>
        <CardContent className="bg-gray-200 dark:bg-slate-900 p-4 sm:p-8 flex justify-center">
          <div className="max-h-[80vh] overflow-y-auto w-full flex justify-center">
            <div className="scale-[0.6] sm:scale-[0.7] md:scale-[0.8] lg:scale-100 origin-top">
              {renderAgendaDesign()}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Generador de Reportes</h1>
        {onNavigateBack && <Button onClick={onNavigateBack} variant="secondary">Volver al Menú</Button>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del Reporte</CardTitle>
          <CardDescription>Seleccione el período y tipo de reporte que desea generar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Reporte</label>
            <div className="flex flex-wrap gap-2">
              {(['daily', 'weekly', 'monthly', 'custom'] as ReportType[]).map(type => (
                <Button key={type} variant={reportType === type ? 'primary' : 'secondary'} onClick={() => setReportType(type)}>
                  {type === 'daily' ? 'Diario' : type === 'weekly' ? 'Semanal' : type === 'monthly' ? 'Mensual' : 'Personalizado'}
                </Button>
              ))}
            </div>
          </div>
          {renderDateControls()}
          <div className="pt-4">
            <Button onClick={handleGenerateReport} variant="accent" size="lg">Generar Vista Previa</Button>
          </div>
        </CardContent>
      </Card>

      {renderReportPreview()}
    </div>
  );
};

export default ReportsView;
