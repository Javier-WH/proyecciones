# Perfiles de docentes

## Identificadores de materias en perfiles

El frontend genera un identificador determinístico para cada materia a partir del nombre normalizado (`generateSubjectProfileId`). A partir de esta actualización:

1. El backend almacena `subject_id` como ese identificador generado (hasta 36 caracteres en minúsculas).
2. Se persiste también `subject_name`, proveniente del catálogo o enviado por el cliente.
3. Todos los endpoints relacionados con perfiles (`GET /profiles`, `GET /profile/:id`, sockets, etc.) devuelven ambos campos.

### Compatibilidad retroactiva

Durante la transición se aceptan también IDs legacy (UUID del catálogo). La lógica normaliza tanto IDs legacy como generados para que no se pierdan asociaciones existentes.

## Migración de datos históricos

Se añadió el script `npm run profiles:migrate` que actualiza los registros existentes en la tabla `perfiles`.

```bash
# Ejecución simulada (no aplica cambios)
npm run profiles:migrate -- --dry-run

# Ejecución real
npm run profiles:migrate
```

El script busca el nombre de la materia en el catálogo interno y actualiza `subject_id`/`subject_name`. Los registros sin nombre se reportan para intervención manual.

## Integraciones externas

Cualquier servicio que cree materias o perfiles fuera del frontend debe replicar la misma lógica de normalización. La utilidad `src/backEnd/utils/subjectProfile.js` está disponible en el backend para centralizar la generación de identificadores.

### Campos expuestos en el login / sesión

El endpoint de autenticación devuelve en `perfil` y `userPerfil` la misma clave `subject_id` descrita arriba. Cada entrada del arreglo `userPerfil` tiene la forma:

```json
{
  "subject_id": "redesavanzadas",
  "subject_name": "REDES AVANZADAS",
  "legacy_subject_id": "6bcf1cb9-1cb7-4a34-9b0d-82390d3536b8"
}
```

- `subject_id` = `generateSubjectProfileId(subject_name)`.
- `subject_name` corresponde al nombre almacenado (del catálogo o provisto por el cliente).
- `legacy_subject_id` sólo se incluye cuando existe un UUID histórico distinto al identificador normalizado.

El frontend debe comparar perfiles utilizando `subject_id`, que es el mismo que reciben los docentes (`teacher.perfil`).

## Restricciones de disponibilidad por docente

La tabla `teachers_restrictions` almacena un registro por profesor con estos campos:

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `teacher_id` | UUID | FK a `teachers.id` (único). |
| `restricted_days` | JSON (array<int>) | Días completos bloqueados (1 = lunes … 5 = viernes). |
| `restricted_hours` | JSON (array<object>) | Bloques `{ day, start, end }` sin traslapes, horas en formato `HH:mm`. |
| `restrictions` | TEXT | Copia legacy del JSON completo para compatibilidad. |

### Endpoints

- `POST /teacher-restrictions` (requiere sesión de administrador)

```json
{
  "teacher_id": "uuid",
  "restricted_days": [1, 3, 5],
  "restricted_hours": [
    { "day": 2, "start": "08:00", "end": "10:00" },
    { "day": 4, "start": "14:00", "end": "16:00" }
  ]
}
```

Valida existencia del profesor, normaliza horas/días y rechaza traslapes. Respuesta:

```json
{
  "message": "Restricciones del profesor guardadas correctamente",
  "data": {
    "teacher_id": "uuid",
    "restricted_days": [1, 3, 5],
    "restricted_hours": [
      { "day": 2, "start": "08:00", "end": "10:00" },
      { "day": 4, "start": "14:00", "end": "16:00" }
    ]
  }
}
```

- `GET /teacher-restrictions/:teacherId`: devuelve las colecciones normalizadas para precargar el modal. Si no hay datos, responde con arreglos vacíos.

- `GET /teacher-restrictions`: listado completo para auditoría.

Los endpoints legacy de materias (`/subjectRestriction`) se mantienen sin cambios.

## Restricciones de aulas por materia

La entidad `subjects_restrictions` almacena las aulas permitidas para cada materia dentro de una proyección específica:

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `proyection_id` | CHAR(36) | ID de la proyección. |
| `subject_key` | CHAR(36) | Nombre normalizado (lowercase, sin tildes ni espacios). |
| `subject_name` | VARCHAR | Nombre original para mostrar. |
| `classroom_ids` | JSON (array<string>) | IDs de las aulas habilitadas. |
| `created_at` / `updated_at` | DATETIME | Timestamps automáticos. |

### Endpoints

- `GET /subject-restrictions/:proyectionId`

```json
{
  "restrictions": [
    {
      "subject_key": "redesavanzadas",
      "subject_name": "Redes Avanzadas",
      "classroom_ids": ["lab-1", "lab-2"]
    }
  ]
}
```

Si no hay datos, responde `200` con `restrictions: []`.

- `POST /subject-restrictions` (requiere admin)

```json
{
  "proyection_id": "uuid",
  "restrictions": [
    {
      "subject_key": "redesavanzadas",
      "subject_name": "Redes Avanzadas",
      "classroom_ids": ["lab-1", "lab-2"]
    }
  ]
}
```

Valida que la proyección exista, normaliza `subject_key`, exige `classroom_ids` con al menos un ID y reemplaza completamente las restricciones previas de esa proyección.

Errores siempre responden `{ "error": true, "message": "detalle" }` con `400` (datos inválidos), `404` (proyección inexistente) o `500` para fallas internas.
