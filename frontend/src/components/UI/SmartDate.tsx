import React from 'react';
import DateService from '../../services/dateService';

interface SmartDateProps {
  date: string;
  showTime?: boolean;
  className?: string;
  format?: 'short' | 'long' | 'relative';
}

/**
 * Componente inteligente para mostrar fechas
 * Convierte automáticamente de UTC a zona horaria local
 */
export const SmartDate: React.FC<SmartDateProps> = ({ 
  date, 
  showTime = false, 
  className = '',
  format = 'short'
}) => {
  if (!date) return <span className={className}>-</span>;

  const formatDate = () => {
    switch (format) {
      case 'long':
        return DateService.utcToLocalDate(date);
      case 'relative':
        return getRelativeDate(date);
      case 'short':
      default:
        return showTime 
          ? DateService.utcToLocalDate(date)
          : DateService.utcToLocalDateOnly(date);
    }
  };

  const getRelativeDate = (dateString: string): string => {
    const utcDate = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - utcDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (DateService.isToday(dateString)) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays === -1) {
      return 'Mañana';
    } else if (diffDays > 1 && diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else if (diffDays < -1 && diffDays > -7) {
      return `En ${Math.abs(diffDays)} días`;
    } else {
      return DateService.utcToLocalDateOnly(dateString);
    }
  };

  return (
    <span className={className} title={DateService.utcToLocalDate(date)}>
      {formatDate()}
    </span>
  );
};

export default SmartDate;
