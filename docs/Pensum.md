# Gestión de Pensum Académico

Este módulo gestiona el pensum académico, incluyendo materias, trayectos, y edición de materias por trimestre.

---

## 📋 Descripción General

El módulo de pensum permite gestionar el catálogo de materias, trayectos académicos, y la edición de materias por trimestre en las proyecciones.

---

## 🎯 Componentes Principales

### EditSubjects.tsx
Gestión del catálogo de materias.

**Funcionalidades:**
- Lista de materias con búsqueda
- Creación de nuevas materias
- Edición de materias existentes
- Activación/desactivación de materias
- Filtro por estado (activas/inactivas)

**Estado Principal:**
```typescript
- subjectList: SimpleSubject[] - Lista de materias
- searchTerm: string - Texto de búsqueda
- subjectName: string - Nombre para nueva materia
- showActiveSubjects: number - Filtro (1=activas, 0=inactivas)
- SimpleSubject: SimpleSubject | null - Materia seleccionada para edición
```

### EditSubjectModal.tsx
Modal para edición de materias.

**Funcionalidades:**
- Edición de nombre de materia
- Activación/desactivación

### EditPensum/
Gestión de edición de materias por trimestre en proyecciones.

---

## 🔧 Funciones Clave

### Creación de Materias
```typescript
const handleCreateSubject = async () => {
  const response = await postSubjects({ 
    id: undefined, 
    name: subjectName, 
    active: 1 
  });
  await fetchSubjects();
};
```

### Edición de Materias
```typescript
const handleEditSubject = (subject: SimpleSubject) => {
  setSimpleSubject(subject);
};
```

### Eliminación (Desactivación)
```typescript
const handleDeleteSubject = async ({ subject, active }) => {
  const response = await postSubjects({ 
    id: subject.id, 
    name: undefined, 
    active 
  });
  await fetchSubjects();
};
```

---

## 🔗 Referencias

- **[docs/Proyecciones.md](./Proyecciones.md)** - Gestión de proyecciones
- **[docs/Teachers.md](./Teachers.md)** - Gestión de profesores

---

*Última actualización: 21 de abril de 2026*
