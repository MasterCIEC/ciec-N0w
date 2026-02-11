
import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';

interface PeriodContextType {
  startYear: number;
  setStartYear: (year: number) => void;
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  isInCurrentPeriod: (dateString: string) => boolean;
  availablePeriods: { startYear: number; label: string }[];
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

const FISCAL_START_MONTH = 10; // Noviembre es el índice 10 (0-11)
const STORAGE_KEY = 'ciec_selected_fiscal_year';

// Generar rango de años (ej. desde 2020 hasta año actual + 2)
const getAvailablePeriods = () => {
  const currentYear = new Date().getFullYear();
  const startHistory = 2020;
  const endFuture = currentYear + 2;
  const periods = [];
  for (let y = startHistory; y <= endFuture; y++) {
    periods.push({
      startYear: y,
      label: `Periodo ${y}-${y + 1}`
    });
  }
  return periods.reverse(); // Más recientes primero
};

const calculateCurrentFiscalStartYear = () => {
  const now = new Date();
  // Si estamos en Enero (0) a Octubre (9), el periodo empezó el año pasado.
  // Si estamos en Noviembre (10) o Diciembre (11), el periodo empezó este año.
  if (now.getMonth() < FISCAL_START_MONTH) {
    return now.getFullYear() - 1;
  }
  return now.getFullYear();
};

export const PeriodProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [startYear, setStartYearState] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : calculateCurrentFiscalStartYear();
  });

  const setStartYear = (year: number) => {
    setStartYearState(year);
    localStorage.setItem(STORAGE_KEY, year.toString());
  };

  const { startDate, endDate, periodLabel } = useMemo(() => {
    // Periodo empieza: 1 Nov del startYear
    // Periodo termina: 31 Oct del startYear + 1
    // Ajustamos horas para cubrir todo el día
    const start = new Date(startYear, FISCAL_START_MONTH, 1, 0, 0, 0); 
    const end = new Date(startYear + 1, FISCAL_START_MONTH, 0, 23, 59, 59, 999); // Día 0 del mes siguiente es el último del anterior
    
    return {
      startDate: start,
      endDate: end,
      periodLabel: `${startYear}-${startYear + 1}`
    };
  }, [startYear]);

  const isInCurrentPeriod = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString + 'T00:00:00'); // Asumir fecha local/sin hora para comparación justa
    return date >= startDate && date <= endDate;
  };

  const availablePeriods = useMemo(() => getAvailablePeriods(), []);

  const value = {
    startYear,
    setStartYear,
    periodLabel,
    startDate,
    endDate,
    isInCurrentPeriod,
    availablePeriods
  };

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
};

export const usePeriod = () => {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
};
