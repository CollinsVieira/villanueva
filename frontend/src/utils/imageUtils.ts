import { publicOrigin } from '../config/env';

/** Ruta o URL del comprobante/boleta para el navegador (relativa si mismo origen). */
export const getProxyImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;

  const BASE_URL = publicOrigin;

  try {
    if (BASE_URL && imageUrl.startsWith(BASE_URL)) {
      return imageUrl;
    }

    if (imageUrl.startsWith('/media/') || imageUrl.startsWith('/static/')) {
      return `${BASE_URL}${imageUrl}`;
    }

    const url = new URL(imageUrl);
    const path = url.pathname;

    if (path.startsWith('/media/') || path.startsWith('/static/')) {
      return `${BASE_URL}${path}`;
    }

    return imageUrl;
  } catch (error) {
    console.warn('Error parsing image URL:', imageUrl, error);

    const mediaMatch = imageUrl.match(/\/media\/.+$/);
    if (mediaMatch) {
      return `${BASE_URL}${mediaMatch[0]}`;
    }

    const staticMatch = imageUrl.match(/\/static\/.+$/);
    if (staticMatch) {
      return `${BASE_URL}${staticMatch[0]}`;
    }

    return imageUrl;
  }
};

/** URL absoluta (necesaria para PDFs con jsPDF / carga de imágenes). */
export const getAbsoluteMediaUrl = (imageUrl: string | null | undefined): string | null => {
  const path = getProxyImageUrl(imageUrl);
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path;
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
  const processedUrl = getAbsoluteMediaUrl(imageUrl);
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
