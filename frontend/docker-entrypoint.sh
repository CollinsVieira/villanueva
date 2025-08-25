#!/bin/bash
set -e

echo "🚀 Iniciando Villanueva Project Frontend..."

# Configurar variables de entorno por defecto
export VITE_API_URL=${VITE_API_URL:-http://localhost:8000/api/v1}

echo "📊 Variables de entorno:"
echo "  - VITE_API_URL: ${VITE_API_URL}"

# Reemplazar variables de entorno en archivos JavaScript compilados
echo "🔄 Configurando variables de entorno en archivos estáticos..."
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|VITE_API_URL_PLACEHOLDER|${VITE_API_URL}|g" {} \;

# Mostrar información del build
echo "📦 Archivos del build:"
ls -la /usr/share/nginx/html/

# Verificar configuración de nginx
echo "🔧 Verificando configuración de Nginx..."
nginx -t

echo "✅ Configuración completada. Iniciando Nginx..."
exec nginx -g "daemon off;"