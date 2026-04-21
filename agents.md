# Agent Documentation Index - Proyecciones

Este archivo sirve como índice central para toda la documentación del proyecto. Cada módulo tiene su propia documentación que se carga en el contexto cuando se trabaja en esa área específica.

---

## 📚 Documentación General

- **[ESTRUCTURA_APP.md](./ESTRUCTURA_APP.md)** - Estructura general de la aplicación, arquitectura frontend/backend, tecnologías y scripts disponibles.
- **[SCHEDULE_RULES.md](./SCHEDULE_RULES.md)** - Reglas fundamentales del sistema de horarios. **CRÍTICO**: Cualquier cambio al sistema de horarios debe respetar estas reglas.
- **[database_schema.md](./database_schema.md)** - Esquema de la base de datos con todas las tablas y sus campos.

---

## 🎨 Frontend - Módulos de UI

### Gestión de Horarios
- **[docs/SchoolSchedule.md](./docs/SchoolSchedule.md)** - Sistema de horarios escolares, FullCalendar, generación automática, modo oficial y depósito.
- **[src/components/SchoolSchedule/REGLAS_GENERACION_HORARIOS.md](./src/components/SchoolSchedule/REGLAS_GENERACION_HORARIOS.md)** - Reglas específicas de generación de horarios automáticos.

### Gestión Académica
- **[docs/Proyecciones.md](./docs/Proyecciones.md)** - Gestión de proyecciones académicas, creación, edición y asignación de materias.
- **[docs/Teachers.md](./docs/Teachers.md)** - Gestión de profesores, asignación de materias, restricciones de disponibilidad.
- **[docs/Pensum.md](./docs/Pensum.md)** - Gestión de pensum académico, trayectos, edición de materias por trimestre.
- **[docs/Report.md](./docs/Report.md)** - Generación de reportes en PDF/Excel, exportación de horarios.

### Sistema y Autenticación
- **[docs/Context.md](./docs/Context.md)** - Gestión de estado global con React Context, sesión de usuario, datos compartidos.
- **[docs/Fetch.md](./docs/Fetch.md)** - Llamadas a la API, funciones fetch, manejo de errores y autenticación.

---

## 🔧 Backend - Módulos del Servidor

### API y Rutas
- **[docs/BackendAPI.md](./docs/BackendAPI.md)** - Endpoints de la API, rutas, middleware, autenticación y validación.
- **[backend/README.md](./backend/README.md)** - Documentación específica del backend: perfiles de docentes, restricciones de disponibilidad, restricciones de aulas.

### Base de Datos
- **[docs/BackendDatabase.md](./docs/BackendDatabase.md)** - Modelos Sequelize, migraciones, queries, conexión a la base de datos.
- **[backend/AUTO_MIGRATION_GUIDE.md](./backend/AUTO_MIGRATION_GUIDE.md)** - Guía de migración automática de la base de datos.
- **[backend/MIGRATION_SUMMARY.md](./backend/MIGRATION_SUMMARY.md)** - Resumen de migraciones realizadas.

### Lógica de Negocio
- **[docs/BackendSchedule.md](./docs/BackendSchedule.md)** - Lógica de horarios en el backend, generación automática, validación de conflictos.
- **[docs/BackendReport.md](./docs/BackendReport.md)** - Generación de reportes en el backend, exportación a Excel/PDF.

---

## 🚀 Cómo Usar Esta Documentación

### Para la IA (Cascade):
1. **Identifica el módulo** donde vas a trabajar (ej: SchoolSchedule, Teachers, BackendAPI)
2. **Lee la documentación específica** de ese módulo antes de hacer cambios
3. **Consulta SCHEDULE_RULES.md** si vas a trabajar en el sistema de horarios
4. **Verifica database_schema.md** si vas a modificar la base de datos

### Para Desarrolladores:
1. **Lee ESTRUCTURA_APP.md** para entender la arquitectura general
2. **Consulta el módulo específico** antes de implementar cambios
3. **Sigue las reglas en SCHEDULE_RULES.md** para cualquier cambio en horarios
4. **Actualiza la documentación** cuando agregues funcionalidades nuevas

---

## ⚠️ Reglas Críticas

### Sistema de Horarios
- **SIEMPRE** lee `SCHEDULE_RULES.md` antes de modificar el sistema de horarios
- Las dos etapas (cálculo automático y modo oficial) son **INDEPENDIENTES**
- Los cambios en una etapa NO deben afectar la otra

### Base de Datos
- **SIEMPRE** verifica `database_schema.md` antes de modificar modelos
- Usa migraciones para cambios en la estructura de la base de datos
- Consulta `backend/AUTO_MIGRATION_GUIDE.md` para migraciones automáticas

### Backend
- Consulta `backend/README.md` para entender el sistema de perfiles y restricciones
- Los endpoints de restricciones tienen reglas específicas de validación

---

## 📝 Actualización de Documentación

Cuando agregues nueva funcionalidad:
1. Actualiza el archivo `.md` del módulo correspondiente
2. Si es un cambio que afecta las reglas del sistema, actualiza `SCHEDULE_RULES.md`
3. Si es un cambio estructural, actualiza `ESTRUCTURA_APP.md`
4. Si agregas un nuevo módulo, crea su archivo `.md` y actualiza este índice

---

*Última actualización: 21 de abril de 2026*
