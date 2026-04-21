# External APIs - APIs Externas

Este documento documenta las APIs externas que el proyecto utiliza, principalmente la API Tecnológico que se conecta al sistema Saga.

---

## 📋 Índice

- [API Tecnológico / Saga](#api-tecnológico--saga)
- [Uso en el Proyecto](#uso-en-el-proyecto)
- [Errores Comunes](#errores-comunes)

---

## 🌐 API Tecnológico / Saga

### Descripción

La API Tecnológico es un servicio interno de la Universidad Politécnica Territorial de los Llanos "Juana Ramírez" que proporciona acceso al sistema Saga, el cual contiene datos académicos como pensums, mayas, trayectos, y PNFs.

### Arquitectura de Conexión

```
Frontend → Backend (proxy) → API Tecnológico → Sistema Saga
```

El backend actúa como proxy para ocultar la URL de la API Tecnológico y manejar autenticación.

---

### Endpoints

#### GET /proyecciones/mayas/{sagaPNFID}

**Propósito:** Obtener mayas (pensums) disponibles para un PNF específico.

**Parámetros:**
- `sagaPNFID` (string) - ID del PNF en el sistema Saga

**Ejemplo de URL:**
```
http://localhost:3000/proyecciones/mayas/123e4567-e89b-12d3-a456-426614174000
```

**Respuesta Exitosa:**
```json
[
  {
    "id": "uuid",
    "name": "Pensum 2024-I",
    "tipopensum_id": 1,
    "saga_id": "saga-uuid"
  },
  {
    "id": "uuid",
    "name": "Pensum 2024-II",
    "tipopensum_id": 2,
    "saga_id": "saga-uuid"
  }
]
```

**Campos:**
- `id` (string) - UUID único de la maya
- `name` (string) - Nombre descriptivo de la maya
- `tipopensum_id` (number) - Tipo de pensum (1 = regular, 2 = prosecución)
- `saga_id` (string) - ID en el sistema Saga

**Filtrado en Frontend:**
El frontend filtra las mayas para mostrar solo las de tipo regular:
```typescript
const mayaOptions = mayaData.filter((maya) => maya.tipopensum_id === 1);
```

---

### Implementación en Frontend

**Archivo:** `src/fetch/getMaya.ts`

```typescript
export default async function getMaya({ sagaPNFID }: { sagaPNFID: string | null | undefined }) {
  const url = import.meta.env.MODE === 'development' 
    ? "http://localhost:3000/proyecciones/mayas/" 
    : "/proyecciones/mayas/";

  const headersList = {
    "Accept": "*/*"
  };

  const response = await fetch(`${url}${sagaPNFID}`, {
    method: "GET",
    headers: headersList,
  });

  const data = await response.json();
  return data;
}
```

---

### Implementación en Backend

**Archivo:** `backend/src/backEnd/routes/proyectionRoutes/proyectionRoutes.js`

```javascript
Router.get('/proyecciones/mayas/:sagaPNFID', async (req, res) => {
  const { sagaPNFID } = req.params;
  
  // Llamada a API Tecnológico
  const apiUrl = process.env.TECNOLOGICO_API_URL || 'http://api-tecnologico.uptll.edu.ve';
  const response = await fetch(`${apiUrl}/proyecciones/mayas/${sagaPNFID}`);
  const data = await response.json();
  
  res.json(data);
});
```

---

## 📚 Uso en el Proyecto

### 1. Creación de Proyecciones

**Componente:** `src/components/createProyectionPanel/createProyectionPanel.tsx`

```typescript
const fetchMayaOptions = async (sagaPNFID: string) => {
  const mayaData = await getMaya({ sagaPNFID });
  const mayaOptions = mayaData
    .filter((maya) => maya.tipopensum_id === 1)
    .map((maya) => ({
      value: maya.id,
      label: maya.name,
    }));
  setMayaOptions(mayaOptions);
};
```

**Flujo:**
1. Usuario selecciona PNF
2. Sistema obtiene `sagaPNFID` del PNF seleccionado
3. Llama a `getMaya({ sagaPNFID })`
4. Filtra mayas por `tipopensum_id === 1`
5. Muestra opciones en dropdown

---

### 2. Gestión de Perfiles Docentes

**Componente:** `src/components/teachers/profiles/Profiles.tsx`

```typescript
const getSubjectList = async () => {
  if (!selectedPnf || !selectedTrayecto || !selectedMaya) {
    setSubjectList([]);
    return;
  }

  const pensumData = await getPensum({
    programaId: selectedPnf,
    trayectoId: selectedTrayecto,
    mayaId: selectedMaya,
  });

  const pensums = pensumData?.data?.pensums ?? pensumData?.pensums ?? [];
  const subjectInputData = pensums.map((s: any) => {
    const name = s.subject || s.name || s.subject_name || "";
    const backendId = String(s.pensum_id ?? s.id ?? generateSubjectProfileId(name));
    return { value: backendId, label: name };
  });

  setSubjectList(subjectInputData);
};
```

**Flujo:**
1. Usuario selecciona PNF, trayecto, y maya
2. Llama a `getPensum()` que internamente usa la API Saga
3. Obtiene materias del pensum
4. Genera IDs normalizados para perfiles

---

### 3. Edición de Pensum

**Componente:** `src/components/pensum/editPensum/editPensum.tsx`

```typescript
const fetchPensumData = async () => {
  const data = await getPensum({
    programaId: selectedPnf,
    trayectoId: selectedTrayecto,
    mayaId: selectedMaya,
  });
  setPensumData(data);
};
```

---

### 4. Gestión de Materias en Proyecciones

**Componente:** `src/components/proyeccionesSubjects/proyeccionesSubjects.tsx`

```typescript
const fetchSubjects = async () => {
  const data = await getPensum({
    programaId: pnfId,
    trayectoId: trayectoId,
    mayaId: mayaId,
  });
  setSubjects(data);
};
```

---

## ⚠️ Errores Comunes

### Error: API Tecnológico no responde

**Síntoma:** Timeout al llamar a `getMaya()`

**Causa:** API Tecnológico no disponible o servidor caído

**Solución:**
1. Verificar que el servidor de API Tecnológico esté activo
2. Verificar conexión de red
3. Verificar `TECNOLOGICO_API_URL` en variables de entorno

---

### Error: sagaPNFID es null o undefined

**Síntoma:** Error "Cannot read property 'sagaPNFID' of null"

**Causa:** PNF seleccionado no tiene `sagaPNFID` en la base de datos

**Solución:**
1. Verificar que el PNF tenga `saga_id` en la base de datos
2. Actualizar datos del PNF si es necesario

---

### Error: Respuesta vacía de API

**Síntoma:** `getMaya()` retorna array vacío

**Causa:** No hay mayas disponibles para el PNF en Saga

**Solución:**
1. Verificar que el PNF tenga mayas configuradas en Saga
2. Contactar administrador de Saga si es necesario

---

## 🔗 Referencias

- **[docs/Proyecciones.md](./Proyecciones.md)** - Gestión de proyecciones
- **[docs/Teachers.md](./Teachers.md)** - Gestión de perfiles docentes
- **[docs/Pensum.md](./Pensum.md)** - Gestión de pensum
- **[docs/Fetch.md](./Fetch.md)** - Llamadas a la API

---

## 🔧 Variables de Entorno

```env
TECNOLOGICO_API_URL=http://api-tecnologico.uptll.edu.ve
```

Si no está configurada, se usa un valor por defecto en el backend.

---

## 📝 Notas Importantes

1. **Proxy del Backend:** El frontend nunca llama directamente a la API Tecnológico. Siempre pasa por el backend.

2. **Filtrado por Tipo:** Solo se usan mayas con `tipopensum_id === 1` (pensums regulares, no de prosecución).

3. **IDs Normalizados:** Los IDs de materias se normalizan usando `generateSubjectProfileId()` para consistencia con perfiles docentes.

4. **Servidor Interno:** La API Tecnológico y el sistema Saga están en el mismo servidor interno de la universidad.

---

*Última actualización: 21 de abril de 2026*
