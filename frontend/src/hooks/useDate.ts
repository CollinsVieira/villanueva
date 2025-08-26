import { useState, useCallback } from 'react';
import DateService from '../services/dateService';

/**
 * Hook personalizado para manejar fechas y zonas horarias
 * Proporciona métodos consistentes para convertir entre UTC y zona horaria local
 */
export const useDate = () => {
  const [currentDate] = useState(DateService.getCurrentLocalDate());

  const formatDateForDisplay = useCallback((utcDateString: string): string => {
    return DateService.utcToLocalDateOnly(utcDateString);
  }, []);

  const formatDateTimeForDisplay = useCallback((utcDateString: string): string => {
    return DateService.utcToLocalDate(utcDateString);
  }, []);

  const convertLocalToUTC = useCallback((localDateString: string): string => {
    return DateService.localDateToUTC(localDateString);
  }, []);

  const isToday = useCallback((utcDateString: string): boolean => {
    return DateService.isToday(utcDateString);
  }, []);

  const getCurrentDate = useCallback((): string => {
    return DateService.getCurrentLocalDate();
  }, []);

  return {
    currentDate,
    formatDateForDisplay,
    formatDateTimeForDisplay,
    convertLocalToUTC,
    isToday,
    getCurrentDate
  };
};

export default useDate;
