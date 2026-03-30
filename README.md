# NDT Frontend - Docker Development Environment

Este es el entorno interactivo de desarrollo para el **Frontend (Next.js)** del sistema LIMS NDT.
Se encuentra pre-configurado para correr de forma **100% aislada** en su propio orquestador de Docker.

## Setup Rápido (100% Automático)

No necesitas instalar Node.js ni npm localmente. Solo teniendo **Docker** podrás arrancar.

```bash
# 1. Posicionate en la carpeta del repositorio
cd NDT_Frontend

# 2. Levantar el proyecto (esto instalará los node_modules automáticamente)
docker compose up -d --build

# 3. ¡Listo! Abre en tu navegador
# 👉 http://localhost:3000
```

> **¿Cómo funciona esto de forma automática?**
> El archivo `docker-compose.yml` de este repositorio está configurado para ejecutar el comando `npm install && npm run dev` al encenderse.
> Por lo tanto, si clonas el proyecto sin `node_modules`, Docker los descargará durante el arranque.

## Entorno y API
Por defecto, este entorno de frontend buscará la API del backend en tu máquina local en el puerto **8080**.
Esto se configura en tu archivo automático `.env.development`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```
*(Asegúrate de tener también clonado y corriendo el `NDT_Backend` para probar fullstack).*

## Comandos Útiles de Docker

Como no tienes Node instalado localmente (o decides usar directamente el de Docker para unificar versiones), debes ejecutar los comandos de `npm` **dentro** del contenedor.

```bash
# Instalar una nueva validación o dependencia en tu package.json
docker compose exec frontend npm install <nombre_paquete>

# Ver los logs en vivo (por si hay algún error de compilación Next.js)
docker compose logs -f frontend

# Detener el entorno
docker compose down
```

## Hot-Reloading Activo
Tu código fuente (`src/app/page.tsx`, etc...) está vinculado de manera bidireccional (Bind Mount) dentro del contenedor. Todo código modificado localmente por tu IDE de preferencia causará una recarga instantánea en tu navegador.
