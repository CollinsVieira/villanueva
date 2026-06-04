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
| No carga la página | Firewall del VPS, puerto `NGINX_PUBLISH`, IP correcta |
| 502 Bad Gateway | Logs de `nginx` y `frontend`; `index.html` en el volumen |
| Login / CSRF falla | `PUBLIC_SITE_URL` exacto (`http://IP:puerto`), `ALLOWED_HOSTS` con la IP |
| Cookies / sesión no guardan | `USE_HTTPS=false` si accedes por `http://` |
| Imágenes rotas | `VITE_IMAGE_IP` vacío y misma URL base (IP + puerto) |
| Error al iniciar compose | `POSTGRES_PASSWORD` y `DJANGO_SECRET_KEY` definidos |
