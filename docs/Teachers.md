# Gestión de Profesores

Este módulo gestiona el ciclo de vida completo de los profesores, incluyendo registro, edición, asignación de materias (perfiles), y restricciones de disponibilidad.

---

## 📋 Descripción General

El módulo de profesores permite:
- Registro y edición de profesores
- Gestión de perfiles docentes (asignación de materias)
- Asignación de materias a profesores en proyecciones
- Configuración de restricciones de disponibilidad
- Cálculo de carga horaria por trimestre

---

## 🎯 Componentes Principales

### EditTeachers.tsx
Lista y gestión de profesores.

**Funcionalidades:**
- Tabla de profesores con búsqueda
- Ordenamiento por apellido, nombre
- Edición de información del profesor
- Visualización de perfil (materias asignadas)
- Filtro por nombre, apellido, cédula, perfil

**Estado Principal:**
```typescript
- teachers: Teacher[] | null - Lista de profesores
- teacherData: Teacher | null - Profesor seleccionado para edición
- search: string - Texto de búsqueda
- isModalOpen: boolean - Estado del modal de edición
```

**Columnas de la Tabla:**
- Apellidos (ordenable)
- Nombres (ordenable)
- Cédula
- Email
- Perfil (tags de materias)
- Acciones (botón editar)

### EditTeacherModal.tsx
Modal para editar información del profesor.

**Funcionalidades:**
- Edición de datos personales (nombre, apellido, cédula)
- Selección de género, tipo de contrato, título
- Asignación de PNF
- Activación/desactivación de profesor
- Marcado como placeholder (profesor genérico)

### AddSubjectToTeacherModal.tsx
Modal para asignar materias a un profesor en una proyección.

**Funcionalidades:**
- Selección de materias disponibles
- Filtro por trimestre
- Cálculo de carga horaria en tiempo real
- Detección de sobrecarga horaria
- Validación de compatibilidad perfil-materia
- Asignación por trimestre (Q1, Q2, Q3)

**Estado Principal:**
```typescript
- options: optionsInterface[] - Materias disponibles
- selectedOption: string | null - Materia seleccionada
- perfilOption: string - Modo de selección (perfil/católogo)
- overLoad: boolean - Indica sobrecarga horaria
- filterByQuarter: boolean - Filtro por trimestre actual
- usedHoursQ1/Q2/Q3: string - Horas usadas por trimestre
- aviableHoursQ1/Q2/Q3: string - Horas disponibles por trimestre
- overloadedQ1/Q2/Q3: boolean - Sobrecarga por trimestre
```

**Validaciones:**
- Verifica si el profesor puede dictar la materia (`teacherCanTeachSubject`)
- Calcula horas disponibles vs usadas
- Muestra advertencia si hay sobrecarga
- Valida que la materia no esté ya asignada

### Profiles.tsx
Gestión de perfiles docentes (asignación de materias a nivel global).

**Funcionalidades:**
- Creación de perfiles docentes
- Asignación de materias a perfiles
- Eliminación de materias de perfiles
- Selección por PNF, trayecto, maya (pensum)
- Integración con pensum desde API externa

**Estado Principal:**
```typescript
- perfilList: SelectProps["options"] - Lista de perfiles
- subjectList: SelectProps["options"] - Materias disponibles
- pnfList: SelectProps["options"] - Lista de PNFs
- trayectoList: SelectProps["options"] - Lista de trayectos
- mayaList: SelectProps["options"] - Lista de mayas
- selectedPnf/Trayecto/Maya: string | null - Selecciones
- subjectsINperfil: basicSubject[] - Materias en el perfil
```

**Integración con API:**
- `getProfileNames()` - Obtiene lista de perfiles
- `getProfile()` - Obtiene detalle de un perfil
- `getPensum()` - Obtiene pensum desde API externa
- `postSubjectToPerfil()` - Agrega materia a perfil
- `deleteSubjectInProfile()` - Elimina materia de perfil

**Generación de IDs:**
```typescript
const backendId = String(s.pensum_id ?? s.id ?? generateSubjectProfileId(name));
```

### ChangeSubjectFromTeacherModal.tsx
Modal para cambiar la asignación de una materia de un profesor.

**Funcionalidades:**
- Reasignación de materia a otro profesor
- Validación de disponibilidad del nuevo profesor
- Actualización de la proyección

---

## 🔧 Funciones Clave

### Cálculo de Carga Horaria

**Hook: useSetSubject**
```typescript
const { addSubjectToTeacher, getTeacherHoursData } = useSetSubject(subjects || []);

const teacherHourData = getTeacherHoursData(selectedTeacher);
// Retorna: { q1, q2, q3 } con totalHours, usedHours, aviableHours, overloaded
```

**Lógica de Cálculo:**
- Suma horas de materias asignadas al profesor por trimestre
- Compara con horas totales del contrato
- Determina si hay sobrecarga (`overloaded: true`)

### Validación de Compatibilidad Perfil-Materia

```typescript
import { teacherCanTeachSubject } from "../../utils/subjectProfile";

const canTeach = teacherCanTeachSubject(teacher, subject);
// Retorna true si el perfil del profesor incluye la materia
```

### Generación de ID de Materia para Perfiles

```typescript
import { generateSubjectProfileId } from "../../../utils/subjectProfile";

const subjectId = generateSubjectProfileId(subjectName);
// Normaliza el nombre: minúsculas, sin tildes, sin espacios
// Ejemplo: "Redes Avanzadas" → "redesavanzadas"
```

**IMPORTANTE**: Ver `backend/README.md` para detalles sobre el sistema de perfiles y migración de datos históricos.

### Asignación de Materias por Trimestre

```typescript
const addSubjectToTeacher = (subject: Subject, quarter: "q1" | "q2" | "q3") => {
  // Actualiza subject.quarter[quarter] con el ID del profesor
  // Recalcula horas del profesor
  // Verifica sobrecarga
};
```

---

## 🎨 Patrones de Código

### Búsqueda de Profesores

```typescript
const getFilteredTeachers = () => {
  if (!teachers) return [];
  if (search.length > 0) {
    const lowerSearch = search.toLowerCase();
    return teachers.filter(
      (teacher) =>
        teacher.name.toLowerCase().includes(lowerSearch) ||
        teacher?.lastName?.toLowerCase().includes(lowerSearch) ||
        teacher?.ci?.toLowerCase().includes(lowerSearch) ||
        teacher.perfilName?.toLowerCase()?.includes(lowerSearch)
    );
  }
  return teachers;
};
```

### Visualización de Perfil como Tags

```typescript
{
  title: 'Perfil',
  dataIndex: 'perfilName',
  render: (perfilName: string) => (
    <>
      {perfilName?.split(',').map((tag, index) => {
        if (!tag.trim()) return null;
        return (
          <Tag color="blue" key={index}>
            {tag.toUpperCase()}
          </Tag>
        );
      })}
    </>
  ),
}
```

### Prevención de Race Conditions en Cargas de Datos

```typescript
const subjectsRequestId = useRef(0);

const getSubjectList = async () => {
  const requestId = ++subjectsRequestId.current;
  setIsLoadingSubjects(true);

  try {
    const pensumData = await getPensum({...});

    // Ignorar respuestas obsoletas
    if (requestId !== subjectsRequestId.current) return;

    // Procesar datos...
  } finally {
    setIsLoadingSubjects(false);
  }
};
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema: Perfil no se muestra correctamente
**Síntoma**: El perfil del profesor aparece vacío o incorrecto

**Causa**: IDs de materias inconsistentes entre frontend y backend

**Solución**: 
- Verificar que se use `generateSubjectProfileId()` para normalizar nombres
- Consultar `backend/README.md` para detalles sobre migración de perfiles
- Ejecutar `npm run profiles:migrate` si es necesario

### Problema: Sobrecarga horaria no se detecta
**Síntoma**: Se pueden asignar más horas de las permitidas

**Causa**: El cálculo de horas no considera el contrato del profesor

**Solución**: Verificar que el profesor tenga `contractTypes_id` asignado y que el cálculo de horas use este dato

### Problema: Materia no aparece en el perfil del profesor
**Síntoma**: La materia está asignada pero no se muestra en el perfil

**Causa**: El ID de la materia no coincide con el ID normalizado en el perfil

**Solución**: Asegurarse de usar el mismo sistema de generación de IDs en frontend y backend

---

## 📁 Archivos del Módulo

```
src/components/teachers/
├── editTeachers/
│   ├── EditTeachers.tsx - Lista de profesores
│   ├── EditTeacherModal.tsx - Modal de edición
│   └── editTeachers.css - Estilos
├── profiles/
│   ├── Profiles.tsx - Gestión de perfiles
│   └── profileModal/ - Modales de perfiles
└── registerTeacher/ - Registro de profesores

src/components/addSubjectToTeacherModal/
├── addSubjectToTeacherModal.tsx - Modal de asignación de materias
└── subjectTeacherInfo.tsx - Información de materia-profesor

src/components/changeSubjectFromTeacherModal/
├── changeSubjectFromTeacherModal.tsx - Modal de reasignación
└── changeSubjectFromTeacherModal.css - Estilos
```

---

## 🔗 Referencias a Otros Documentos

- **[backend/README.md](../backend/README.md)** - Documentación detallada de perfiles de docentes y restricciones
- **[docs/Proyecciones.md](./Proyecciones.md)** - Gestión de proyecciones académicas
- **[docs/SchoolSchedule.md](./SchoolSchedule.md)** - Sistema de horarios (usa restricciones de profesores)
- **[docs/Context.md](./Context.md)** - Gestión de estado global

---

## 🧪 Pruebas Recomendadas

### Registro de Profesores
1. Crear nuevo profesor con datos completos
2. Verificar que se guarde correctamente
3. Editar información del profesor
4. Activar/desactivar profesor
5. Marcar como placeholder

### Asignación de Materias
1. Seleccionar profesor
2. Abrir modal de asignación de materias
3. Seleccionar materia del catálogo
4. Verificar cálculo de horas
5. Asignar materia y verificar que se actualice
6. Intentar asignar más horas de las permitidas (debe mostrar advertencia)

### Gestión de Perfiles
1. Crear nuevo perfil
2. Seleccionar PNF, trayecto, maya
3. Agregar materias al perfil
4. Verificar que se generen IDs correctamente
5. Eliminar materia del perfil
6. Verificar compatibilidad con profesores

### Búsqueda y Filtrado
1. Buscar profesor por nombre
2. Buscar por apellido
3. Buscar por cédula
4. Buscar por perfil
5. Ordenar por apellido
6. Ordenar por nombre

---

## ⚙️ Configuración

### Tipos de Contrato
- Tiempo completo
- Medio tiempo
- Otros (configurables)

### Géneros
- Masculino
- Femenino
- Otros

### Estados de Profesor
- **Active**: Profesor activo y disponible
- **Inactive**: Profesor inactivo
- **Placeholder**: Profesor genérico/temporal (no cuenta para estadísticas)

---

## 📊 Estructura de Datos

### Teacher (Profesor)
```typescript
interface Teacher {
  id: string;
  name: string;
  lastName: string;
  ci: string;
  email?: string | null;
  gender_id: string;
  contractTypes_id: string;
  title?: string;
  perfil_name_id?: string;
  PNF?: string;
  active: boolean;
  is_placeholder: boolean;
  perfilName?: string; // Materias del perfil separadas por comas
}
```

### Subject (Materia)
```typescript
interface Subject {
  id: string;
  name: string;
  hours: number;
  quarter: {
    q1: string | null; // ID del profesor en Q1
    q2: string | null; // ID del profesor en Q2
    q3: string | null; // ID del profesor en Q3
  };
  // ... otros campos
}
```

---

## ⚠️ Reglas Críticas

### Sistema de Perfiles
- **SIEMPRE** usar `generateSubjectProfileId()` para normalizar nombres de materias en perfiles
- Los IDs de materias en perfiles deben ser consistentes entre frontend y backend
- Consultar `backend/README.md` para detalles sobre migración de perfiles históricos

### Restricciones de Disponibilidad
- Las restricciones de profesores se gestionan en el módulo SchoolSchedule
- Ver `backend/README.md` para detalles sobre endpoints de restricciones
- Las restricciones incluyen días bloqueados y horas específicas no disponibles

### Carga Horaria
- La carga horaria se calcula por trimestre (Q1, Q2, Q3)
- Se debe verificar sobrecarga antes de asignar materias
- Los profesores placeholder no cuentan para estadísticas de carga horaria

---

*Última actualización: 21 de abril de 2026*
