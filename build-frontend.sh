#!/bin/bash

echo "🚀 Construyendo el frontend de Villanueva Project..."

# Navegar al directorio del frontend
cd frontend

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install -g pnpm
    pnpm install
fi

# Construir la aplicación
echo "🔨 Construyendo la aplicación..." 
pnpm run build

echo "✅ Frontend construido exitosamente en frontend/dist/"
echo "📁 Los archivos están listos para ser servidos por nginx"
