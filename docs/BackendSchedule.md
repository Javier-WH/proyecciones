# Backend Schedule - Lógica de Horarios

Este módulo documenta la lógica de horarios en el backend, incluyendo generación, validación, y persistencia.

---

## 📋 Descripción General

El backend maneja principalmente la persistencia de horarios y configuraciones. La lógica de generación automática está en el frontend (`SchoolSchedule/fucntions.tsx`).

**Responsabilidades del Backend:**
- Guardar y recuperar horarios
- Guardar configuración de horarios
- Gestión de restricciones (materias y profesores)
- Gestión de secciones bloqueadas
- Validación de restricciones

---

## 📁 Estructura

```
backend/src/backEnd/schedule/
└── controllers/
    └── scheduleController.js
```

---

## 🎯 Funciones Principales

### scheduleController.js

**Funciones:**
- Guardar horarios en la base de datos
- Recuperar horarios por proyección
- Validar configuraciones
- Gestión de locked sections

---

## 🔗 Integración con Frontend

La generación de horarios se hace en el frontend:
- **Frontend**: `src/components/SchoolSchedule/fucntions.tsx` - `generateScheduleEvents()`
- **Backend**: Solo persiste el resultado

**Flujo:**
1. Frontend genera horario con `generateScheduleEvents()`
2. Frontend envía horario al backend via POST `/schedule`
3. Backend guarda en tabla `schedules`
4. Frontend recupera horario via GET `/schedule`

---

## 📊 Tablas Relacionadas

### schedules
- `id`: UUID
- `name`: Nombre del horario
- `schedule`: JSON con datos del horario
- `proyection_id`: FK a proyecciones

### schedule_config
- `days`: JSON de días activos
- `turnos`: JSON de bloques horarios
- `conserveSlots`: Máximo de horas diarias
- `minConsecutiveSlots`: Mínimo de horas consecutivas
- `distributeEquitably`: Distribución equitativa
- `preventSingleHourBlocks`: Evitar bloques de 1 hora

### subjects_restrictions
- `proyection_id`: FK (NULL para globales)
- `subject_key`: ID normalizado de materia
- `subject_name`: Nombre de materia
- `classroom_ids`: JSON de aulas permitidas
- `is_exclusive`: Solo usar aulas seleccionadas
- `split_hours`: Dividir horas en bloques

### teachers_restrictions
- `teacher_id`: FK a teachers
- `restricted_days`: JSON de días bloqueados
- `restricted_hours`: JSON de horas específicas bloqueadas

### locked_sections
- `key`: Clave única
- `pnfId`: FK a PNF
- `trayectoId`: FK a trayecto
- `seccion`: Sección
- `trim`: Trimestre (q1, q2, q3)
- `eventData`: JSON con evento bloqueado

---

## 🔧 Validaciones

### Restricciones de Materias
- Normaliza `subject_key` (minúsculas, sin tildes)
- Valida que `classroom_ids` tenga al menos un elemento
- Reemplaza restricciones previas de la proyección

### Restricciones de Profesores
- Normaliza días (1-5, lunes a viernes)
- Normaliza horas (formato HH:mm)
- Rechaza traslapes en `restricted_hours`

---

## 🔗 Referencias

- **[docs/SchoolSchedule.md](./SchoolSchedule.md)** - Sistema de horarios en frontend
- **[docs/BackendAPI.md](./BackendAPI.md)** - Endpoints de horarios
- **[docs/BackendDatabase.md](./BackendDatabase.md)** - Modelos de base de datos

---

*Última actualización: 21 de abril de 2026*
