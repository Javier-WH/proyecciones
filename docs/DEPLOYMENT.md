# Deployment - Guía de Deployment

Este documento describe el proceso de deployment manual de la aplicación en el servidor interno de la Universidad Politécnica Territorial de los Llanos "Juana Ramírez".

---

## 📋 Contexto

**Institución:** Universidad Politécnica Territorial de los Llanos "Juana Ramírez" (UPTLL)

**Ubicación:** Servidor interno de la universidad

**Infraestructura:**
- Servidor interno que aloja toda la infraestructura de la universidad
- API del sistema en el mismo servidor
- Sistema Saga en el mismo servidor
- Base de datos MySQL en el mismo servidor

**Tipo de Deployment:** Manual

---

## 🚀 Pasos de Deployment

### 1. Preparación del Entorno

**Verificar Variables de Entorno:**

Crear o actualizar archivo `.env` en la raíz del proyecto:

```env
# Base de Datos
DB_NAME=nombre_base_datos
DB_USER=usuario
DB_PASSWORD=contraseña
DB_HOST=localhost
DB_PORT=3306
DB_DIALECT=mysql

# Sesión
SESSION_SECRET=UPTLL_Juana_Ramirez

# Entorno
NODE_ENV=production
PORT=3000

# API Tecnológico (opcional, si no está configurada usa valor por defecto)
TECNOLOGICO_API_URL=http://api-tecnologico.uptll.edu.ve
```

---

### 2. Build del Frontend

**Ubicación:** Raíz del proyecto

```bash
# Instalar dependencias del frontend
npm install

# Build del frontend
npm run build
```

**Resultado:** El build se guarda en `backend/src/frontEnd/`

**Comando Build:**
```json
"build": "tsc && vite build --emptyOutDir --outDir backend/src/frontEnd"
```

---

### 3. Configuración del Backend

**Instalar Dependencias del Backend:**

```bash
cd backend
npm install
```

---

### 4. Verificación de Base de Datos

**Opción A: Crear/Recrear Tablas (CUIDADO - destruye datos)**

```bash
cd backend
npm run db:drop    # Elimina tablas
npm run db:create  # Crea tablas
npm run db:sync    # Sincroniza modelos
```

**⚠️ ADVERTENCIA:** Estos comandos destruyen datos existentes. Solo usar en desarrollo o si se está seguro.

---

**Opción B: Verificar Conexión (Producción)**

El backend automáticamente crea tablas si no existen al iniciar:

```javascript
// backend/src/backEnd/index.js
await createTables()
setTableRelations()
await syncSagaTables()
await syncSchedule()
```

---

### 5. Ejecutar Migraciones (si es necesario)

**Migración de Perfiles Docentes:**

```bash
cd backend
npm run profiles:migrate
```

**Migración de Restricciones Globales:**

```bash
cd backend
npm run check:migration      # Verificar si es necesaria
npm run migrate:restrictions # Ejecutar migración
```

**Rollback de Migración:**

```bash
npm run rollback:migration
```

---

### 6. Iniciar el Servidor

**Opción A: Modo Producción**

```bash
cd backend
npm start
```

**Opción B: Modo Desarrollo (con watch)**

```bash
cd backend
npm run dev
```

**Puerto:** Por defecto `3000` (configurable con `PORT` en `.env`)

---

### 7. Verificación Post-Deployment

**Verificar que el Servidor esté Corriendo:**

```bash
curl http://localhost:3000
```

**Verificar Logs:**
- Buscar mensaje: "La base de datos se conecto correctamente"
- Buscar mensaje: "Servidor corriendo en el puerto 3000"
- Verificar que no haya errores de conexión

**Verificar Frontend:**
- Acceder a `http://localhost:3000` (o IP del servidor)
- Verificar que se cargue la aplicación
- Probar login
- Verificar que se carguen datos (PNFs, profesores, etc.)

**Verificar API Externa:**
- Probar crear una proyección
- Verificar que se carguen las mayas desde API Tecnológico
- Verificar que se obtengan pensums desde Saga

---

## 🔧 Scripts npm Disponibles

### Backend

```json
{
  "start": "node ./src/backEnd/index.js",
  "dev": "node --watch ./src/backEnd/index.js",
  "mock": "node ./src/dev/CLI/mockData.js",
  "db:drop": "node ./src/dev/CLI/syncTables.js db:drop",
  "db:create": "node ./src/dev/CLI/syncTables.js db:create",
  "db:sync": "node ./src/dev/CLI/syncTables.js db:sync",
  "profiles:migrate": "node ./src/dev/CLI/migrateSubjectProfiles.js",
  "migrate:restrictions": "node ./src/backEnd/dataBase/alters/checkAndApplyGlobalRestrictions.js",
  "check:migration": "node -e \"import('./src/backEnd/dataBase/alters/checkAndApplyGlobalRestrictions.js').then(m => m.checkIfMigrationNeeded()).then(needed => console.log('Migration needed:', needed))\"",
  "rollback:migration": "node -e \"import('./src/backEnd/dataBase/alters/migrateToGlobalRestrictions.js').then(m => m.down())\""
}
```

### Frontend

```json
{
  "dev": "vite",
  "build": "tsc && vite build --emptyOutDir --outDir backend/src/frontEnd",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "preview": "vite preview",
  "serve": "cd backend && npm run dev"
}
```

---

## 📝 Checklist de Deployment

### Pre-Deployment
- [ ] Verificar variables de entorno configuradas
- [ ] Hacer backup de base de datos (si es producción)
- [ ] Verificar que API Tecnológico esté disponible
- [ ] Verificar que sistema Saga esté disponible

### Deployment
- [ ] Instalar dependencias del frontend (`npm install`)
- [ ] Build del frontend (`npm run build`)
- [ ] Instalar dependencias del backend (`cd backend && npm install`)
- [ ] Ejecutar migraciones si es necesario
- [ ] Iniciar servidor (`npm start`)

### Post-Deployment
- [ ] Verificar conexión a base de datos
- [ ] Verificar logs del servidor
- [ ] Probar acceso a la aplicación
- [ ] Probar login
- [ ] Probar carga de datos (PNFs, profesores)
- [ ] Probar creación de proyección
- [ ] Probar API externa (mayas, pensums)
- [ ] Verificar generación de horarios
- [ ] Probar generación de reportes

---

## ⚠️ Errores Comunes

### Error: "Cannot connect to database"

**Causa:** Variables de entorno incorrectas o servidor MySQL no iniciado

**Solución:**
1. Verificar `.env` tiene valores correctos para `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`
2. Verificar que servidor MySQL esté corriendo
3. Verificar credenciales de base de datos

---

### Error: "Module not found"

**Causa:** Dependencias no instaladas

**Solución:**
```bash
npm install
cd backend
npm install
```

---

### Error: Build falla

**Causa:** Errores de TypeScript o ESLint

**Solución:**
1. Corregir errores de TypeScript
2. Corregir errores de ESLint
3. Verificar que no haya archivos corruptos

---

### Error: API Tecnológico no responde

**Causa:** API Tecnológico no disponible o red no accesible

**Solución:**
1. Verificar que API Tecnológico esté activa
2. Verificar conexión de red
3. Verificar `TECNOLOGICO_API_URL` en `.env`

---

## 🔗 Referencias

- **[ESTRUCTURA_APP.md](../ESTRUCTURA_APP.md)** - Estructura general de la aplicación
- **[backend/README.md](../backend/README.md)** - Documentación específica del backend
- **[docs/BackendDatabase.md](./BackendDatabase.md)** - Modelos y consultas
- **[docs/EXTERNAL_APIS.md](./EXTERNAL_APIS.md)** - APIs externas

---

## 📞 Soporte

**Unidad de Sistemas - UPTLL Juana Ramírez**

Para problemas de deployment, contactar a la unidad de sistemas de la universidad.

---

*Última actualización: 21 de abril de 2026*
