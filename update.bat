@echo off
echo ===============================
echo Actualizando repositorio Git
echo ===============================
git pull origin main

echo.
echo ===============================
echo Build del frontend
echo ===============================
cd frontend
pnpm run build
cd ..

echo.
echo ===============================
echo Reiniciando contenedores Docker
echo ===============================
docker compose restart backend scheduler nginx

echo.
echo Proceso finalizado. Cerrando ventana...
timeout /t 2 >nul
exit
