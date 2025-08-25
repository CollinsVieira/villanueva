# 🚀 Instrucciones de Configuración - Villanueva Project

## 📋 Prerrequisitos
- Docker y Docker Compose instalados
- Node.js 18+ y pnpm instalados (para desarrollo local)

## 🔧 Configuración del Frontend

### Opción 1: Construcción Local (Recomendado)
1. **Construir el frontend localmente:**
   ```bash
   # En Windows PowerShell
   .\build-frontend.sh
   
   # O manualmente:
   cd frontend
   pnpm install
   pnpm run build
   ```

2. **Verificar que se creó la carpeta `frontend/dist/`**

### Opción 2: Construcción con Docker
```bash
docker-compose build frontend
```

## 🐳 Ejecutar el Proyecto

1. **Detener contenedores existentes:**
   ```bash
   docker-compose down
   ```

2. **Iniciar los servicios:**
   ```bash
   docker-compose up -d
   ```

3. **Verificar logs:**
   ```bash
   docker-compose logs -f
   ```

## 🌐 Acceso a la Aplicación

- **Frontend:** http://localhost
- **Backend API:** http://localhost/api/
- **Admin Django:** http://localhost/admin/
- **Base de datos:** localhost:5432

## 🔍 Solución de Problemas

### Error 502 Bad Gateway
- Verificar que el frontend se construyó correctamente
- Asegurar que existe la carpeta `frontend/dist/`
- Revisar logs de nginx: `docker-compose logs nginx`

### Reconstruir todo desde cero
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📁 Estructura de Archivos Importante

```
villanueva/
├── frontend/dist/          # Archivos estáticos del frontend
├── nginx/nginx.conf        # Configuración de nginx
├── docker-compose.yaml     # Configuración de servicios
└── build-frontend.sh       # Script de construcción
```

## 🚨 Notas Importantes

- **El frontend debe construirse ANTES de iniciar los contenedores**
- **Nginx sirve los archivos estáticos desde `frontend/dist/`**
- **El backend corre en el puerto 8000**
- **Nginx corre en el puerto 80**
