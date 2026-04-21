# Gestión de Proyecciones Académicas

Este módulo gestiona la creación, edición y asignación de proyecciones académicas, incluyendo la asignación de materias a profesores y la gestión de horas por trimestre.

---

## 📋 Descripción General

Las proyecciones académicas representan el plan de estudio para un periodo académico específico. Incluyen:
- Selección de PNF (Programa Nacional de Formación)
- Selección de trayectos
- Asignación de materias a profesores
- Gestión de horas por trimestre (Q1, Q2, Q3)
- Validación de carga horaria de profesores

---

## 🎯 Componentes Principales

### ProyeccionesContainer.tsx
Contenedor principal para la gestión de proyecciones existentes.

**Funcionalidades:**
- Visualización de lista de profesores y materias
- Selección de profesor para ver sus asignaciones
- Cambio entre vista de profesores y materias
- Validación de errores en datos de proyección
- Navegación a corrección de errores

**Estado Principal:**
```typescript
- teacherTab: boolean - Vista de profesores (true) o materias (false)
- error: boolean - Indica si hay errores en los datos
- searchByUserPerfil: boolean - Búsqueda por perfil de usuario
```

**Validaciones:**
- Detecta valores null en la tabla de materias
- Detecta horas ≤ 0 en materias
- Muestra pantalla de error si hay inconsistencias

### CreateProyectionPanel.tsx
Panel para crear nuevas proyecciones académicas.

**Funcionalidades:**
- Selección de PNF
- Selección de trayecto
- Selección de maya (pensum) desde API externa
- Creación de proyección con datos seleccionados

**Estado Principal:**
```typescript
- selectedPnf: string | null - PNF seleccionado
- selectedTrayecto: string | null - Trayecto seleccionado
- selectedMaya: string | null - Maya seleccionada
- mayaOptions: SelectProps["options"] - Opciones de mayas disponibles
```

**Integración con API:**
- `getMaya({ sagaPNFID })` - Obtiene mayas desde API externa
- Filtra mayas por `tipopensum_id === 1` (solo las que no son de prosecución)

### NewProyectionPanel.tsx
Panel simplificado para crear nuevas proyecciones.

**Funcionalidades:**
- Selección de programa (PNF)
- Selección de trayecto
- Cálculo automático de `trayectoDataValue` (trayecto anterior)
- Delegación a `NewProyectionContainer`

**Lógica de Trayectos:**
```typescript
const handleTrayectoChange = (value: string) => {
  const selectedTrayecto = trayectosList?.filter((trayecto) => trayecto.id === value)[0];
  const order = selectedTrayecto ? selectedTrayecto.order - 1 : null;
  const fixxedSelectedTrayecto = trayectosList?.filter((trayecto) => trayecto.order === order)[0];
  setTrayectoDataValue(fixxedSelectedTrayecto?.id?.toString() ?? null);
};
```

### SelectedTeacher.tsx
Componente para mostrar detalles de un profesor seleccionado.

**Funcionalidades:**
- Visualización de información del profesor
- Cálculo de horas disponibles/usadas por trimestre
- Filtro de materias asignadas al profesor
- Indicador de sobrecarga horaria
- Cambio entre vista de todas las materias o solo del trimestre actual

**Estado Principal:**
```typescript
- totalHours: string - Total de horas del profesor
- aviableHoursQ1/Q2/Q3: string - Horas disponibles por trimestre
- usedHoursQ1/Q2/Q3: string - Horas usadas por trimestre
- overloadedQ1/Q2/Q3: boolean - Indica sobrecarga por trimestre
- showAllSubjects: boolean - Mostrar todas las materias o solo del trimestre
```

**Validaciones:**
- Verifica si el profesor tiene contrato
- Calcula horas disponibles vs usadas
- Muestra advertencia si hay sobrecarga

### ProyeccionesSubjects.tsx
Gestión de materias por proyección.

**Funcionalidades:**
- Tabla de materias con asignaciones por trimestre
- Edición de asignaciones de materias
- Validación de datos de materias
- Exportación de datos

---

## 🔧 Funciones Clave

### Cálculo de Horas de Profesores

**Hook: useSetSubject**
```typescript
const { getTeacherHoursData } = useSetSubject(subjects || []);

const teacherHourData = getTeacherHoursData(selectedTeacher);
// Retorna: { q1, q2, q3 } con totalHours, usedHours, aviableHours, overloaded
```

**Lógica de Cálculo:**
- Suma horas de materias asignadas al profesor por trimestre
- Compara con horas totales del contrato
- Determina si hay sobrecarga (`overloaded: true`)

### Validación de Datos de Proyección

```typescript
useEffect(() => {
  if (!subjects) return;
  setError(
    subjects.some((obj) => Object.values(obj).some((value) => value === null)) ||
    subjects.some((subjec) => Number(subjec.hours) <= 0)
  );
}, [subjects]);
```

**Validaciones:**
- Valores null en cualquier campo de materia
- Horas ≤ 0 en materias
- Muestra pantalla de error si hay inconsistencias

### Integración con Contexto Global

**Datos del MainContext:**
```typescript
- pnfList: PNF[] - Lista de PNFs disponibles
- trayectosList: Trayecto[] - Lista de trayectos disponibles
- userPNF: string - PNF del usuario actual
- userData: User - Datos del usuario (incluye rol SU)
- selectedTeacher: Teacher | null - Profesor seleccionado
- selectedTeacerId: string | null - ID del profesor seleccionado
- selectedQuarter: "q1" | "q2" | "q3" - Trimestre seleccionado
- subjects: Subject[] - Materias de la proyección
```

---

## 🎨 Patrones de Código

### Selección de PNF con Restricción por Rol

```typescript
const pnfOpt = pnfList.map((pnf) => ({
  value: pnf.id.toString(),
  label: pnf.name.toString(),
  disabled: !userData?.su && pnf.id.toString() !== userPNF, // Solo SU puede ver todos
}));
```

### Filtro de Materias por Profesor y Trimestre

```typescript
// Todas las materias del profesor (todos los trimestres)
const teacherSubjects = subjects.filter(
  (subject) =>
    subject.quarter.q1 === selectedTeacerId ||
    subject.quarter.q2 === selectedTeacerId ||
    subject.quarter.q3 === selectedTeacerId
);

// Solo materias del trimestre actual
const teacherSubjects = subjects.filter(
  (subject) => subject.quarter[selectedQuarter] === selectedTeacerId
);
```

### Cálculo de Trayecto Anterior

```typescript
const handleTrayectoChange = (value: string) => {
  const selectedTrayecto = trayectosList?.filter((trayecto) => trayecto.id === value)[0];
  const order = selectedTrayecto ? selectedTrayecto.order - 1 : null;
  const fixxedSelectedTrayecto = trayectosList?.filter((trayecto) => trayecto.order === order)[0];
  setTrayectoDataValue(fixxedSelectedTrayecto?.id?.toString() ?? null);
};
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema: Error de validación al crear proyección
**Síntoma**: Pantalla de error "La proyección se ha creado con errores"

**Causa**: Materias con valores null o horas ≤ 0

**Solución**: Navegar a `/app/proyecciones/subjects` y corregir los datos

### Problema: Maya no se carga correctamente
**Síntoma**: Lista de mayas vacía después de seleccionar PNF

**Causa**: `sagaPNFID` no encontrado o API externa no responde

**Solución**: Verificar que el PNF tenga `saga_id` válido y que la API externa esté accesible

### Problema: Horas de profesor no se calculan
**Síntoma**: Horas disponibles/usadas muestran "0"

**Causa**: `subjects` no está cargado o `selectedTeacher` es null

**Solución**: Verificar que la proyección esté cargada y que se haya seleccionado un profesor

---

## 📁 Archivos del Módulo

```
src/components/proyecciones/
├── ProyeccionesContainer.tsx - Contenedor principal
├── proyeccionesContainer.css - Estilos
├── selectedTeacher/ - Detalles de profesor seleccionado
│   ├── selectedTeacher.tsx
│   ├── selectedTeacher.css
│   └── subjects/ - Materias del profesor
├── subjectTab/ - Pestaña de materias
└── teacherTable/ - Tabla de profesores

src/components/createProyectionPanel/
├── createProyectionPanel.tsx - Panel de creación
└── tabPanel/ - Paneles de pestañas

src/components/newProyectionPanel/
├── NewProyectionPanel.tsx - Panel simplificado
└── newProyectionContainer/ - Contenedor

src/components/proyeccionesSubjects/
├── proyeccionesSubjects.tsx - Gestión de materias
├── proyeccionesSubjects.css - Estilos
├── editProyeccionesSubjectModal/ - Modal de edición
└── table/ - Tabla de materias
```

---

## 🔗 Referencias a Otros Documentos

- **[docs/Teachers.md](./Teachers.md)** - Gestión de profesores y sus restricciones
- **[docs/Pensum.md](./Pensum.md)** - Gestión de pensum académico
- **[docs/Context.md](./Context.md)** - Gestión de estado global
- **[docs/Fetch.md](./Fetch.md)** - Llamadas a la API

---

## 🧪 Pruebas Recomendadas

### Creación de Proyección
1. Seleccionar PNF (verificar restricción por rol)
2. Seleccionar trayecto
3. Verificar que se carguen las mayas correctamente
4. Crear proyección
5. Verificar que se cree sin errores

### Gestión de Profesores
1. Seleccionar un profesor
2. Verificar que se calculen las horas correctamente
3. Cambiar entre trimestres (Q1, Q2, Q3)
4. Verificar indicador de sobrecarga
5. Filtrar materias por trimestre actual

### Validación de Datos
1. Crear materia con hora = 0 (debe mostrar error)
2. Crear materia con campo null (debe mostrar error)
3. Corregir errores y verificar que desaparezca la pantalla de error

---

## ⚙️ Configuración

### Trimestres
El sistema usa tres trimestres:
- **Q1**: Primer trimestre
- **Q2**: Segundo trimestre
- **Q3**: Tercer trimestre

### Roles de Usuario
- **SU (Super Usuario)**: Puede ver y editar todos los PNFs
- **Regular**: Solo puede ver su PNF asignado (`userPNF`)

### Maya (Pensum)
- Se obtiene desde API externa usando `sagaPNFID`
- Se filtra por `tipopensum_id === 1` (solo pensums de prosecución)
- Se ordena por ID descendente (más recientes primero)

---

## 📊 Estructura de Datos

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

### TeacherHoursData
```typescript
interface TeacherHoursData {
  q1: {
    totalHours: string;
    usedHours: string;
    aviableHours: string;
    overloaded: boolean;
  };
  q2: { /* mismo */ };
  q3: { /* mismo */ };
}
```

---

*Última actualización: 21 de abril de 2026*
