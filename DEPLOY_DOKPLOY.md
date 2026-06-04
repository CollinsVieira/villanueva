# Despliegue en VPS con Dokploy

Esta guía usa `docker-compose.prod.yaml`. El archivo `docker-compose.yaml` sigue siendo para desarrollo en tu red local.

## Requisitos

- VPS con Dokploy instalado
- Repositorio Git conectado a Dokploy
- **Dominio** (opcional) o **IP pública del VPS**

---

## Opción A: Solo con la IP del servidor (sin dominio)

Sí es posible. Limitaciones: solo **HTTP** (sin HTTPS automático), Let's Encrypt no emite certificados para IPs, y accedes con puerto (por defecto **8080**).

### Variables en Dokploy → Environment

Sustituye `123.45.67.89` por la IP pública de tu VPS:

```env
DJANGO_SECRET_KEY=tu-secreto-largo
POSTGRES_PASSWORD=tu-password-postgres
PUBLIC_SITE_URL=http://123.45.67.89:8080
ALLOWED_HOSTS=123.45.67.89
DEBUG=0
USE_HTTPS=false
NGINX_PUBLISH=8080
```

Deja vacíos `VITE_API_BASE_URL` y `VITE_IMAGE_IP` (el frontend usa el mismo origen que nginx).

### Red y firewall

1. En el VPS, abre el puerto **8080** (ufw, panel del proveedor, etc.).
2. **No configures** la pestaña Domains de Dokploy para este caso.
3. Deploy con compose path: `docker-compose.prod.yaml`

### Acceso

Abre en el navegador:

`http://123.45.67.89:8080`

(Puerto 8080 por defecto para no chocar con Traefik/Dokploy en el 80. Si el 80 está libre, puedes usar `NGINX_PUBLISH=80` y `PUBLIC_SITE_URL=http://123.45.67.89`.)

### Primer usuario admin

Terminal del servicio `backend` en Dokploy:

```bash
python createadminuser.py
```

---

## Opción B: Con dominio y HTTPS

### Variables mínimas

```env
DJANGO_SECRET_KEY=...
POSTGRES_PASSWORD=...
PUBLIC_SITE_URL=https://tu-dominio.com
ALLOWED_HOSTS=tu-dominio.com
DEBUG=0
USE_HTTPS=true
```

`VITE_API_BASE_URL` y `VITE_IMAGE_IP` vacíos si todo va por el mismo dominio.

### Dokploy

1. Servicio **Docker Compose**, compose path: `docker-compose.prod.yaml`
2. Registro **A** del dominio → IP del VPS
3. Pestaña **Domains** → servicio `nginx`, puerto **80**, host `tu-dominio.com`, HTTPS activado
4. Si usas Domains de Dokploy, puedes poner `NGINX_PUBLISH=` vacío o no publicar puerto en el host (Traefik enruta el tráfico). Si prefieres puerto directo, mantén `NGINX_PUBLISH=8080` solo para pruebas.

5. **Deploy**

---

## Volúmenes y backups

- `postgres_data` — base de datos
- `media_volume` — contratos, boletas, PDFs
- `static_volume` — estáticos de Django
- `frontend_dist` — build del frontend

Configura backups de `postgres_data` y `media_volume` desde Dokploy.

## Migrar comprobantes y boletas (media) desde local

La URL `/media/payment_receipts/archivo.png` es correcta.

### Carpeta en el servidor vs volumen Docker

En Dokploy tus archivos deben estar en la carpeta del proyecto:

```
/etc/dokploy/compose/serfersystem-app-re4omi/code/media_volume/
├── payment_receipts/
│   └── RICHARD_55.png
├── boleta_pagos/
└── contracts/
```

El compose de producción monta **`./media_volume` → `/app/media`** (igual que en local).

**Importante:** antes el compose usaba un volumen Docker **nombrado** también llamado `media_volume`, que es **otro almacenamiento vacío** en `/var/lib/docker/volumes/...`. Por eso ver la carpeta en el explorador de archivos del servidor y seguir con 404.

En Dokploy → **Environment**, añade (ruta exacta de tu servidor):

```env
MEDIA_HOST_PATH=/etc/dokploy/compose/serfersystem-app-re4omi/code/media_volume
```

Tras actualizar el compose, haz **Redeploy**. Los archivos `/media/` los sirve el **backend** (nginx hace proxy).

### Comprobar en el VPS (antes o después del deploy)

```bash
# ¿El contenedor ve los archivos?
docker exec serfersystem-app-re4omi-backend-1 ls -la /app/media/payment_receipts/ | head

# ¿La BD coincide con el disco?
docker exec serfersystem-app-re4omi-backend-1 python manage.py check_media_files

# Probar Django directo (puerto interno; si aquí funciona, nginx también tras redeploy)
docker exec serfersystem-app-re4omi-backend-1 wget -qO- --spider http://127.0.0.1:8000/media/payment_receipts/RICHARD_55.png && echo OK || echo FALLO
```

Si `ls` está **vacío** pero en SFTP ves archivos, el montaje no apunta a tu carpeta → define `MEDIA_HOST_PATH` como arriba.

**Error habitual de estructura:** `code/media_volume/media/payment_receipts/` (carpeta `media` de más). Debe ser `code/media_volume/payment_receipts/` directamente.

### Copiar desde tu PC al VPS

1. En el VPS, localiza el contenedor backend: `docker ps` (ej. `serfersystem-app-re4omi-backend-1`).
2. Sube la carpeta local `media_volume` (la de tu proyecto) al servidor.
3. Ejecuta:

```bash
docker cp ./media_volume/. NOMBRE_CONTENEDOR_BACKEND:/app/media/
docker exec NOMBRE_CONTENEDOR_BACKEND python manage.py check_media_files
```

O usa el script: `scripts/import-media-to-vps.sh`

4. Comprueba en el navegador la misma URL. No hace falta redeploy si nginx ya monta `media_volume`.

### Carpetas según el tipo de archivo

| Tipo en la app | Carpeta en el volumen |
|----------------|------------------------|
| Comprobante de pago | `payment_receipts/` |
| Boleta de pago | `boleta_pagos/` |
| Contrato PDF | `contracts/` |

Los PDFs del frontend cargan esas mismas URLs; si el archivo existe, los reportes mostrarán las imágenes.

## Notas importantes

- **No uses** `container_name` en producción.
- PostgreSQL no expone el puerto 5432 al exterior.
- Migraciones y `collectstatic` corren al arrancar `backend`.
- Si cambias `VITE_*`, haz **Redeploy** para reconstruir el frontend.
- Con IP: `PUBLIC_SITE_URL` debe incluir el **mismo puerto** que `NGINX_PUBLISH`.

## Desarrollo local

```bash
docker compose up -d
```

## Solución de problemas

| Síntoma | Qué revisar |
|---------|-------------|
| Warning `The "ij" variable is not set` | Algún secreto contiene `$` (ej. `$ij`). Compose lo lee como variable. Cambia el valor o escapa con `$$` en Dokploy. |
| `frontend is unhealthy` | El compose actual ya no usa servicio `frontend` aparte; el build va dentro de `nginx`. Redeploy con el repo actualizado. |
| No carga la página | Firewall del VPS, puerto `NGINX_PUBLISH`, IP correcta |
| F5 en `/admin/...` muestra Django o 404 | Redeploy con nginx actualizado: `/admin/*` es el panel React; Django admin está en `/django-admin/` |
| 502 Bad Gateway | Logs de `nginx` y `backend` |
| Login / CSRF falla | `PUBLIC_SITE_URL` exacto (`http://IP:puerto`), `ALLOWED_HOSTS` con la IP |
| Cookies / sesión no guardan | `USE_HTTPS=false` si accedes por `http://` |
| `/media/...` 404 nginx | Archivos no copiados al volumen; ver sección **Migrar comprobantes** y `check_media_files` |
| Imágenes rotas en UI | Mismo caso; la URL suele ser correcta |
| PDF sin boletas | Archivos faltantes o redeploy nginx (CORS en `/media/`) |
| Error al iniciar compose | `POSTGRES_PASSWORD` y `DJANGO_SECRET_KEY` definidos |
