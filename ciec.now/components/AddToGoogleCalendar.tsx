
import React, { useState } from 'react';
import Input from './ui/Input';
import Button from './ui/Button';
import GoogleCalendarIcon from './icons/GoogleCalendarIcon';

interface EventDetails {
  title: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  description?: string;
  location?: string;
}

interface AddToGoogleCalendarProps {
  eventDetails: EventDetails;
}

const AddToGoogleCalendar: React.FC<AddToGoogleCalendarProps> = ({ eventDetails }) => {
  const [email, setEmail] = useState('');

  const generateGoogleCalendarLink = () => {
    const formatUtcDateTime = (dateStr: string, timeStr: string): string => {
        const localDate = new Date(`${dateStr}T${timeStr}`);
        if (isNaN(localDate.getTime())) return '';
        return localDate.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const startTime = eventDetails.startTime;
    if (!startTime) return '#'; 

    const startDate = eventDetails.startDate;
    const endTime = eventDetails.endTime;

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = endTime ? new Date(`${startDate}T${endTime}`) : new Date(startDateTime.getTime() + 60 * 60 * 1000);

    const dates = `${formatUtcDateTime(startDate, startTime)}/${formatUtcDateTime(startDate, endDateTime.toTimeString().slice(0, 5))}`;

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventDetails.title,
      dates: dates,
      details: eventDetails.description || '',
      location: eventDetails.location || '',
    });

    if (email.trim() && /^\S+@\S+\.\S+$/.test(email.trim())) {
      params.append('add', email.trim());
    }

    return `https://www.google.com/calendar/render?${params.toString()}`;
  };

  const handleAddToCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = generateGoogleCalendarLink();
    if(link === '#') {
      alert('Falta la hora de inicio para crear el evento de calendario.');
      return;
    }
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mt-3 pt-3 border-t dark:border-gray-600">
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Añadir a Calendario</h4>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Input 
          type="email"
          placeholder="Tu correo para invitar (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs"
          containerClassName="flex-grow"
          aria-label="Correo para invitación de calendario"
        />
        <Button 
          onClick={handleAddToCalendar} 
          variant="secondary" 
          size="sm" 
          className="sm:flex-shrink-0"
          aria-label="Añadir a Google Calendar"
        >
          <GoogleCalendarIcon className="w-4 h-4 mr-1.5" />
          Añadir
        </Button>
      </div>
    </div>
  );
};

export default AddToGoogleCalendar;