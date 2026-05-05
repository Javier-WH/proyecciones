# Documentation Index — Proyecciones

This file is the central index for every piece of documentation in the project. Each module has its own dedicated documentation that should be loaded into context when working on that specific area.

> **Note for agents:** the operational protocol (what you MUST and MUST NOT do) lives in `./agents.md`. This file is only an index of available knowledge.

---

## 📚 General Documentation

- **[ESTRUCTURA_APP.md](./ESTRUCTURA_APP.md)** — High-level application structure, frontend/backend architecture, technologies and available scripts.
- **[SCHEDULE_RULES.md](./SCHEDULE_RULES.md)** — Foundational rules of the schedule system. **CRITICAL**: any change to the schedule system must respect these rules.
- **[database_schema.md](./database_schema.md)** — Database schema with all tables and their fields.
- **[progress.md](./progress.md)** — Persistent agent memory: task log, design decisions, open TODOs, working hypotheses.

---

## 🎨 Frontend — UI Modules

### Schedule Management
- **[docs/SchoolSchedule.md](./docs/SchoolSchedule.md)** — School schedule system, FullCalendar, automatic generation, official mode and staging deposit.
- **[src/components/SchoolSchedule/REGLAS_GENERACION_HORARIOS.md](./src/components/SchoolSchedule/REGLAS_GENERACION_HORARIOS.md)** — Specific rules for automatic schedule generation.

### Academic Management
- **[docs/Proyecciones.md](./docs/Proyecciones.md)** — Academic projections management, creation, editing and subject assignment.
- **[docs/Teachers.md](./docs/Teachers.md)** — Teacher management, subject assignment, availability restrictions.
- **[docs/Pensum.md](./docs/Pensum.md)** — Academic curriculum management, trayectos, per-trimester subject editing.
- **[docs/Report.md](./docs/Report.md)** — PDF/Excel report generation, schedule export.

### System and Authentication
- **[docs/Context.md](./docs/Context.md)** — Global state management with React Context, user session, shared data.
- **[docs/Fetch.md](./docs/Fetch.md)** — API calls, fetch functions, error handling and authentication.

---

## 🔧 Backend — Server Modules

### API and Routes
- **[docs/BackendAPI.md](./docs/BackendAPI.md)** — API endpoints, routes, middleware, authentication and validation.
- **[backend/README.md](./backend/README.md)** — Backend-specific documentation: teacher profiles, availability restrictions, classroom restrictions.

### Database
- **[docs/BackendDatabase.md](./docs/BackendDatabase.md)** — Sequelize models, migrations, queries, database connection.
- **[backend/AUTO_MIGRATION_GUIDE.md](./backend/AUTO_MIGRATION_GUIDE.md)** — Automatic database migration guide.
- **[backend/MIGRATION_SUMMARY.md](./backend/MIGRATION_SUMMARY.md)** — Summary of applied migrations.

### Business Logic
- **[docs/BackendSchedule.md](./docs/BackendSchedule.md)** — Backend schedule logic, automatic generation, conflict validation.
- **[docs/BackendScheduleSync.md](./docs/BackendScheduleSync.md)** — WebSocket protocol, backend-driven state, optimistic concurrency, fine-grained atomic actions.
- **[docs/BackendReport.md](./docs/BackendReport.md)** — Backend report generation, Excel/PDF export.

---

## 🛠️ Cross-cutting Documentation

- **[docs/ONBOARDING.md](./docs/ONBOARDING.md)** — Onboarding guide for new developers.
- **[docs/PATTERNS.md](./docs/PATTERNS.md)** — Code, architecture and design patterns used in the project.
- **[docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** — Catalog of fixed bugs with root cause and solution. **All new bug fixes must be appended here.**
- **[docs/EXTERNAL_APIS.md](./docs/EXTERNAL_APIS.md)** — External APIs (Tecnológico/SAGA).
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — Deployment guide.

---

## 🚀 How to Use This Index

### For agents (Cascade, Cursor, Claude Code, Codex CLI, etc.)
1. **Read `agents.md` first** — it is the operational protocol and supersedes everything else.
2. **Identify the module** you will be working on (e.g. `SchoolSchedule`, `Teachers`, `BackendAPI`).
3. **Load the matching doc** from this index before making any change.
4. **Always consult `SCHEDULE_RULES.md`** if the change touches the schedule system.
5. **Always consult `database_schema.md`** if the change touches the database.

### For developers
1. **Read `ESTRUCTURA_APP.md`** to understand the overall architecture.
2. **Consult the specific module doc** before implementing changes.
3. **Follow the rules in `SCHEDULE_RULES.md`** for any schedule-related change.
4. **Update the docs** when you add new functionality.

---

## ⚠️ Critical Rules (Quick Reference)

### Schedule System
- **ALWAYS** read `SCHEDULE_RULES.md` before modifying the schedule system.
- The two stages (automatic calculation and official mode) are **INDEPENDENT**.
- Changes in one stage MUST NOT affect the other.

### Database
- **ALWAYS** verify `database_schema.md` before modifying models.
- Use migrations for any structural change.
- Consult `backend/AUTO_MIGRATION_GUIDE.md` for automatic migrations.

### Backend
- Read `backend/README.md` to understand the profile and restrictions system.
- Restriction endpoints have specific validation rules.

---

## 📝 Documentation Update Policy

When you add new functionality:
1. Update the matching module `.md`.
2. If the change affects system rules, update `SCHEDULE_RULES.md`.
3. If the change is structural, update `ESTRUCTURA_APP.md`.
4. If you add a new module, create its `.md` and add it to this index.
5. New documentation must be written in **English**.

---

*Last updated: April 30, 2026*
