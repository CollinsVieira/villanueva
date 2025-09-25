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

## 🌐 Configuración para Acceso desde la Red Local

### 1. Obtener Información de Red
```bash
# Ejecutar como administrador en PowerShell
.\get-network-info.ps1
```

### 2. Configurar Firewall de Windows
```bash
# Permitir acceso HTTP (puerto 80)
netsh advfirewall firewall add rule name="Villanueva HTTP" dir=in action=allow protocol=TCP localport=80

# Permitir acceso Backend (puerto 8000)
netsh advfirewall firewall add rule name="Villanueva Backend" dir=in action=allow protocol=TCP localport=8000

# Permitir acceso Base de datos (puerto 5432)
netsh advfirewall firewall add rule name="Villanueva Database" dir=in action=allow protocol=TCP localport=5432
```

### 3. URLs de Acceso
- **Desde tu máquina:** http://localhost
- **Desde la red local:** http://[TU_IP_LOCAL]
- **Ejemplo:** Si tu IP es 192.168.1.100, accede desde http://192.168.1.100

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

### Acceso Local
- **Frontend:** http://localhost
- **Backend API:** http://localhost/api/
- **Admin Django:** http://localhost/admin/
- **Base de datos:** localhost:5432

### Acceso desde la Red Local
- **Frontend:** http://[TU_IP_LOCAL]
- **Backend API:** http://[TU_IP_LOCAL]/api/
- **Admin Django:** http://[TU_IP_LOCAL]/admin/
- **Base de datos:** [TU_IP_LOCAL]:5432

## 🔍 Solución de Problemas

### Error 502 Bad Gateway
- Verificar que el frontend se construyó correctamente
- Asegurar que existe la carpeta `frontend/dist/`
- Revisar logs de nginx: `docker-compose logs nginx`

### Problemas de Acceso desde la Red
- Verificar que el firewall permite los puertos 80, 8000 y 5432
- Confirmar que estás en la misma red WiFi/LAN
- Verificar que la IP local es correcta

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
├── build-frontend.sh       # Script de construcción
├── get-network-info.ps1    # Script para obtener IP local
└── SETUP_INSTRUCTIONS.md   # Este archivo
```

## 🚨 Notas Importantes

- **El frontend debe construirse ANTES de iniciar los contenedores**
- **Nginx sirve los archivos estáticos desde `frontend/dist/`**
- **El backend corre en el puerto 8000**
- **Nginx corre en el puerto 80**
- **Los servicios están expuestos en `0.0.0.0` para acceso desde la red local**
- **Configura el firewall de Windows para permitir conexiones entrantes**

## 🔒 Seguridad

⚠️ **ADVERTENCIA:** Esta configuración está optimizada para desarrollo y redes locales de confianza. Para producción:
- Cambia `DEBUG = False` en `settings.py`
- Restringe `ALLOWED_HOSTS` a dominios específicos
- Configura HTTPS
- Implementa autenticación robusta
- Revisa la configuración de CORS



## BACKUP DE BASE DE DATOS
- docker ps
- docker exec villanueva_db pg_dumpall -U postgres | Out-File -Encoding UTF8 "{url de carpeta}\backup.sql"
