# Database Structure - Projections System

This document details the structure of the main database tables in the system.

## 1. Schedule Management (Schedule Module)

### Table: `classrooms` (Classrooms)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary key. |
| `classroom` | STRING(50) | Classroom name (E.g: Classroom 1, LAB B). Unique. |
| `active` | BOOLEAN | Classroom status (Open/Closed). |

### Table: `subjects_restrictions` (Subject Restrictions)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary key. |
| `proyection_id` | UUID | Relationship with the projection. |
| `subject_key` | STRING(36) | Unique subject identifier (normalized). |
| `subject_name` | STRING | Human-readable subject name. |
| `classroom_ids` | JSON | List of preferred classroom IDs. |
| `pnf_id` | UUID | PNF to which the restriction belongs. |
| `is_exclusive` | BOOLEAN | If `true`, only allows using the selected classrooms. |

### Table: `schedule_config` (Calendar Configuration)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary key. |
| `days` | JSON | Active days of the week (E.g: [1, 2, 3, 4, 5]). |
| `turnos` | JSON | Time block structure per shift. |
| `conserve_slots` | INTEGER | Maximum consecutive hours. |
| `min_consecutive_slots` | INTEGER | Minimum consecutive hours. |
| `distribute_equitably` | BOOLEAN | Activates load distribution. |
| `prevent_single_hour_blocks` | BOOLEAN | Prevents 1-hour blocks. |

### Table: `schedules` (Saved Schedules)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary key. |
| `name` | STRING | Name of the saved schedule. |
| `schedule` | TEXT | JSON data of the complete schedule. |
| `proyection_id` | UUID | ID of the associated projection. |

---

## 2. Academic Personnel

### Table: `teachers` (Teachers)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary key. |
| `name` | STRING | Teacher's first name. |
| `last_name` | STRING | Teacher's last name. |
| `ci` | STRING | Identity card number (Unique). |
| `title` | STRING | Academic title. |
| `active` | BOOLEAN | Teacher status. |
| `is_placeholder` | BOOLEAN | Indicates if it is a generic/temporary teacher. |
| `PNF` | UUID | PNF of affiliation. |

### Table: `teachers_restrictions` (Teacher Restrictions)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary key. |
| `teacher_id` | UUID | Relationship with the teacher. |
| `restricted_days` | JSON | Days the teacher CANNOT work. |
| `restricted_hours` | JSON | Specific blocks of unavailable hours. |

---

## 3. Support Tables

- **`subjects`**: General subject catalog.
- **`proyections`**: Academic projection records by period.
- **`users`**: System users (SU, administrator, regular).
- **`pnfs`**: National Training Programs (Careers).
- **`contract_types`**: Contract types (Full-time, part-time, etc).
- **`genders`**: Gender catalog.
- **`trayectos`**: Definition of academic levels (Trayecto I, II, etc).
