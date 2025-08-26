/**
 * Servicio para manejar fechas y zonas horarias
 * Implementa la estrategia: UTC para almacenamiento, conversión para visualización
 */

export class DateService {
  /**
   * Convierte una fecha local a UTC para enviar al backend
   * @param localDateString - Fecha en formato YYYY-MM-DD
   * @returns String ISO en UTC
   */
  static localDateToUTC(localDateString: string): string {
    // Crear fecha local a medianoche en la zona horaria local del usuario
    const localDate = new Date(localDateString + 'T00:00:00');
    
    // IMPORTANTE: No restar el offset, solo convertir a ISO string
    // Esto mantiene la fecha exacta que el usuario seleccionó
    return localDate.toISOString();
  }

  /**
   * Convierte una fecha local a UTC usando un enfoque más explícito
   * @param localDateString - Fecha en formato YYYY-MM-DD
   * @returns String ISO en UTC
   */
  static localDateToUTCExplicit(localDateString: string): string {
    // Parsear la fecha local
    const [year, month, day] = localDateString.split('-').map(Number);
    
    // Crear fecha en zona horaria local (medianoche)
    const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    
    // Convertir a UTC manteniendo la fecha local
    // Usar el método más directo para evitar problemas de offset
    const utcYear = localDate.getUTCFullYear();
    const utcMonth = localDate.getUTCMonth();
    const utcDay = localDate.getUTCDate();
    
    // Crear fecha UTC
    const utcDate = new Date(Date.UTC(utcYear, utcMonth, utcDay, 0, 0, 0, 0));
    
    return utcDate.toISOString();
  }

  /**
   * Convierte una fecha UTC del backend a fecha local para mostrar
   * @param utcDateString - Fecha UTC del backend
   * @returns String de fecha local formateada
   */
  static utcToLocalDate(utcDateString: string): string {
    const utcDate = new Date(utcDateString);
    
    // Formatear en zona horaria local
    return utcDate.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Convierte una fecha UTC a solo fecha (sin hora) para mostrar
   * @param utcDateString - Fecha UTC del backend
   * @returns String de fecha local formateada
   */
  static utcToLocalDateOnly(utcDateString: string): string {
    const utcDate = new Date(utcDateString);
    
    return utcDate.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD para inputs de fecha
   * @returns String en formato YYYY-MM-DD
   */
  static getCurrentLocalDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Convierte una fecha UTC a timestamp para comparaciones
   * @param utcDateString - Fecha UTC del backend
   * @returns Timestamp en milisegundos
   */
  static utcToTimestamp(utcDateString: string): number {
    return new Date(utcDateString).getTime();
  }

  /**
   * Verifica si una fecha UTC es hoy en la zona horaria local
   * @param utcDateString - Fecha UTC del backend
   * @returns Boolean indicando si es hoy
   */
  static isToday(utcDateString: string): boolean {
    const utcDate = new Date(utcDateString);
    const today = new Date();
    
    return (
      utcDate.getDate() === today.getDate() &&
      utcDate.getMonth() === today.getMonth() &&
      utcDate.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Método alternativo para convertir fecha local a UTC
   * Usa el enfoque más directo para evitar problemas de zona horaria
   * @param localDateString - Fecha en formato YYYY-MM-DD
   * @returns String ISO en UTC
   */
  static localDateToUTCSafe(localDateString: string): string {
    // Parsear la fecha
    const [year, month, day] = localDateString.split('-').map(Number);
    
    // Crear fecha UTC directamente (esto evita problemas de zona horaria)
    const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    
    return utcDate.toISOString();
  }
}

export default DateService;
