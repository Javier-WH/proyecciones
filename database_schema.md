# Estructura de la Base de Datos - Sistema de Proyecciones

Este documento detalla la estructura de las tablas principales de la base de datos del sistema.

## 1. Gestión de Horarios (Módulo Schedule)

### Tabla: `classrooms` (Aulas)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Clave primaria. |
| `classroom` | STRING(50) | Nombre del aula (Ej: Aula 1, LAB B). Único. |
| `active` | BOOLEAN | Estado del aula (Abierta/Cerrada). |

### Tabla: `subjects_restrictions` (Restricciones de Materias)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Clave primaria. |
| `proyection_id` | UUID | Relación con la proyección. |
| `subject_key` | STRING(36) | Identificador único de la materia (normalizado). |
| `subject_name` | STRING | Nombre legible de la materia. |
| `classroom_ids` | JSON | Lista de IDs de aulas preferidas. |
| `pnf_id` | UUID | PNF al que pertenece la restricción. |
| `is_exclusive` | BOOLEAN | Si es `true`, solo permite usar las aulas seleccionadas. |

### Tabla: `schedule_config` (Configuración del Calendario)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Clave primaria. |
| `days` | JSON | Días activos de la semana (Ej: [1, 2, 3, 4, 5]). |
| `turnos` | JSON | Estructura de bloques horarios por turno. |
| `conserve_slots` | INTEGER | Máximo de horas consecutivas. |
| `min_consecutive_slots` | INTEGER | Mínimo de horas consecutivas. |
| `distribute_equitably` | BOOLEAN | Activa distribución de carga. |
| `prevent_single_hour_blocks` | BOOLEAN | Evita bloques de 1 hora. |

### Tabla: `schedules` (Horarios Guardados)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Clave primaria. |
| `name` | STRING | Nombre del horario guardado. |
| `schedule` | TEXT | Datos JSON del horario completo. |
| `proyection_id` | UUID | ID de la proyección asociada. |

---

## 2. Personal Académico

### Tabla: `teachers` (Profesores)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Clave primaria. |
| `name` | STRING | Nombre del profesor. |
| `last_name` | STRING | Apellido del profesor. |
| `ci` | STRING | Cédula de identidad (Única). |
| `title` | STRING | Título académico. |
| `active` | BOOLEAN | Estado del profesor. |
| `is_placeholder` | BOOLEAN | Indica si es un profesor genérico/temporal. |
| `PNF` | UUID | PNF de adscripción. |

### Tabla: `teachers_restrictions` (Restricciones de Profesores)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Clave primaria. |
| `teacher_id` | UUID | Relación con el profesor. |
| `restricted_days` | JSON | Días que el profesor NO puede trabajar. |
| `restricted_hours` | JSON | Bloques específicos de horas no disponibles. |

---

## 3. Tablas de Soporte

- **`subjects`**: Catálogo general de materias.
- **`proyections`**: Registro de proyecciones académicas por periodo.
- **`users`**: Usuarios del sistema (Su, administrador, regular).
- **`pnfs`**: Programas Nacionales de Formación (Carreras).
- **`contract_types`**: Tipos de contrato (Tiempo completo, medio tiempo, etc).
- **`genders`**: Catálogo de géneros.
- **`trayectos`**: Definición de niveles académicos (Trayecto I, II, etc).
