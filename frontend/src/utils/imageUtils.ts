/**
 * Utilidad para manejar URLs de imágenes del backend
 */

/**
 * Convierte una URL completa del backend a una URL que funcione con la IP correcta
 * @param imageUrl URL completa devuelta por el backend
 * @returns URL que funciona con la IP 192.168.1.41
 */
export const getProxyImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;
  
  // URL base correcta
  const BASE_URL = 'http://192.168.1.41';
  
  try {
    // Si la URL ya está construida correctamente, devolverla
    if (imageUrl.startsWith(BASE_URL)) {
      return imageUrl;
    }
    
    // Si la URL es relativa (solo /media/...), construir la URL completa
    if (imageUrl.startsWith('/media/') || imageUrl.startsWith('/static/')) {
      return `${BASE_URL}${imageUrl}`;
    }
    
    // Si es una URL completa con otro dominio, extraer el path y construir la URL correcta
    const url = new URL(imageUrl);
    const path = url.pathname;
    
    // Verificar que el path comience con /media/ o /static/
    if (path.startsWith('/media/') || path.startsWith('/static/')) {
      return `${BASE_URL}${path}`;
    }
    
    // Si no es una URL de media reconocida, devolver la URL original
    return imageUrl;
  } catch (error) {
    // Si hay error al parsear la URL, intentar extraer manualmente
    console.warn('Error parsing image URL:', imageUrl, error);
    
    // Buscar patrones comunes de media URLs
    const mediaMatch = imageUrl.match(/\/media\/.+$/);
    if (mediaMatch) {
      return `${BASE_URL}${mediaMatch[0]}`;
    }
    
    const staticMatch = imageUrl.match(/\/static\/.+$/);
    if (staticMatch) {
      return `${BASE_URL}${staticMatch[0]}`;
    }
    
    // Si no se puede procesar, devolver la URL original
    return imageUrl;
  }
};

/**
 * Verifica si una URL es una imagen válida
 * @param imageUrl URL a verificar
 * @returns true si es una URL de imagen válida
 */
export const isValidImageUrl = (imageUrl: string | null | undefined): boolean => {
  if (!imageUrl) return false;
  
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowerUrl = imageUrl.toLowerCase();
  
  return validExtensions.some(ext => lowerUrl.includes(ext));
};

/**
 * Obtiene un enlace seguro para descargar una imagen
 * @param imageUrl URL de la imagen
 * @param filename Nombre sugerido para la descarga
 */
export const downloadImage = (imageUrl: string | null | undefined, filename?: string) => {
  const processedUrl = getProxyImageUrl(imageUrl);
  if (!processedUrl) return;
  
  const link = document.createElement('a');
  link.href = processedUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  
  if (filename) {
    link.download = filename;
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
