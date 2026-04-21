# Backend Database - Modelos y Consultas

Este módulo documenta la estructura de la base de datos, modelos Sequelize, migraciones, y consultas.

---

## 📋 Descripción General

El backend usa **Sequelize ORM** con **MySQL** como motor de base de datos. La estructura está organizada en modelos, consultas, migraciones, y scripts de sincronización.

**Stack:**
- Sequelize como ORM
- MySQL como motor de base de datos
- ES Modules para importación
- Import maps para rutas limpias (`#models/*`, `#querys/*`, `#dataBaseConnection`)

---

## 🔗 Conexión a la Base de Datos

### ORMconnection.js

```javascript
import dotenv from 'dotenv'
import { Sequelize } from 'sequelize'

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'mysql',
    port: process.env.DB_PORT,
    logging: false
  }
)
```

**Variables de Entorno:**
```env
DB_NAME=nombre_base_datos
DB_USER=usuario
DB_PASSWORD=contraseña
DB_HOST=localhost
DB_PORT=3306
DB_DIALECT=mysql
```

**Uso:**
```javascript
import sequelize from '#dataBaseConnection'
```

---

## 📁 Estructura de Directorios

```
backend/src/backEnd/dataBase/
├── connection/          # Conexión a la base de datos
│   └── ORMconnection.js
├── models/              # Modelos Sequelize
│   ├── schedule/        # Modelos de horarios
│   ├── teachers.js
│   ├── proyections.js
│   └── ...
├── querys/              # Consultas a la base de datos
│   ├── teachers/
│   ├── proyections/
│   └── ...
├── create/              # Creación de tablas
├── relations/           # Relaciones entre modelos
├── alters/              # Migraciones y alteraciones
├── sycnSagaDB/          # Sincronización con base externa
└── syncScheduleTables/  # Sincronización de tablas de horarios
```

---

## 🗃️ Modelos Principales

### Teachers (Profesores)

**Archivo:** `models/teachers.js`

```javascript
class Teacher extends Model {}
Teacher.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ci: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    gender_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "genders", key: "id" },
    },
    contractTypes_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "contract_types", key: "id" },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    perfil_name_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    PNF: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_placeholder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "teachers",
    timestamps: false,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);
```

**Campos Importantes:**
- `is_placeholder`: Indica si es un profesor genérico/temporal
- `perfil_name_id`: Referencia al perfil de materias del profesor
- `PNF`: PNF de adscripción del profesor

### Proyections (Proyecciones)

**Archivo:** `models/proyections.js`

```javascript
class Proyections extends Model {}
Proyections.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isInt: true, min: 1900, max: 2300 }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    subjects: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'proyections',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
)
```

**Campos Importantes:**
- `subjects`: JSON con las materias y asignaciones de la proyección

### Modelos de Horarios (schedule/)

#### subjectsRestrictions (Restricciones de Materias)

**Archivo:** `models/schedule/subjectsRestrictions.js`

```javascript
class SubjectsRestrictions extends Model {}
SubjectsRestrictions.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    proyection_id: {
      type: DataTypes.CHAR(36),
      allowNull: true, // NULL para restricciones globales
    },
    subject_key: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    subject_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    classroom_ids: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    pnf_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    is_exclusive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    split_hours: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "subjectsRestrictions",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);
```

**IMPORTANTE:** `proyection_id` puede ser NULL para restricciones globales. Ver `backend/README.md` para detalles sobre migración a restricciones globales.

#### teachersRestrictions (Restricciones de Profesores)

**Archivo:** `models/schedule/teacherRestrictions.js`

```javascript
class TeachersRestrictions extends Model {}
TeachersRestrictions.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    teacher_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    restricted_days: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    restricted_hours: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    restrictions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "teachersRestrictions",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);
```

**Estructura de restricted_hours:**
```json
[
  { "day": 1, "start": "08:00", "end": "10:00" },
  { "day": 3, "start": "14:00", "end": "16:00" }
]
```

#### scheduleConfig (Configuración de Horarios)

**Archivo:** `models/schedule/scheduleConfig.js`

```javascript
class ScheduleConfig extends Model {}
ScheduleConfig.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    days: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [1, 2, 3, 4, 5],
    },
    turnos: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    conserveSlots: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },
    minConsecutiveSlots: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
    },
    distributeEquitably: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    preventSingleHourBlocks: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "scheduleConfig",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);
```

---

## 🔍 Consultas (Querys)

### Estructura de Querys

```
querys/
├── teachers/
│   ├── getTeacherList.js
│   ├── postTeacher.js
│   └── getPhoto.js
├── proyections/
│   ├── getProyections.js
│   ├── postProyection.js
│   └── deleteProyection.js
├── profile/
│   ├── getProfileNames.js
│   ├── getProfile.js
│   ├── postSubjectToPerfil.js
│   └── deleteSubjectInPerfil.js
└── ...
```

### Ejemplo de Consulta

**Archivo:** `querys/teachers/getTeacherList.js`

```javascript
import Teachers from '#models/teachers.js'

export default async function getTeacherList() {
  const teachers = await Teachers.findAll({
    attributes: [
      'id',
      'name',
      'last_name',
      'ci',
      'email',
      'active',
      'is_placeholder',
      'perfil_name_id'
    ],
    order: [['last_name', 'ASC']]
  })
  return teachers
}
```

---

## 🔄 Migraciones y Alteraciones

### Directorio alters/

Contiene scripts de migración y alteraciones de la base de datos.

**Archivos Importantes:**
- `migrateToGlobalRestrictions.js` - Migración a restricciones globales
- `checkAndApplyGlobalRestrictions.js` - Verificación automática de migración
- `cleanupOldRestrictionsIndex.js` - Limpieza de índices antiguos

### Migración a Restricciones Globales

**Script:** `alters/migrateToGlobalRestrictions.js`

```javascript
// Cambia proyection_id de NOT NULL a NULL
// Migra 193 restricciones a globales
// Crea backup automático
```

**Ejecución Manual:**
```bash
cd backend
npm run migrate:restrictions
npm run check:migration
npm run rollback:migration
```

**Verificación Automática:**
El script `checkAndApplyGlobalRestrictions.js` se ejecuta automáticamente al iniciar el servidor (`index.js`).

---

## 🗄️ Creación de Tablas

### createTables.js

```javascript
import { createTables } from './dataBase/create/createTables.js'
await createTables()
```

Crea todas las tablas si no existen. No destruye datos existentes.

### setTableRelations()

```javascript
import setTableRelations from './dataBase/relations/tableRelations.js'
setTableRelations()
```

Establece las relaciones entre modelos (FKs, belongsTo, hasMany, etc.).

---

## 🔄 Sincronización

### syncSagaTables()

Sincroniza tablas con la base de datos externa (Saga).

```javascript
import syncSagaTables from './dataBase/sycnSagaDB/syncSagaTables.js'
await syncSagaTables()
```

### syncSchedule()

Sincroniza tablas de horarios.

```javascript
import syncSchedule from './dataBase/syncScheduleTables/syncSchedule.js'
await syncSchedule()
```

---

## 🎨 Patrones de Código

### Definición de Modelo

```javascript
import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class ModelName extends Model {}
ModelName.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    field: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'tableName',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  }
)

export default ModelName
```

### Consulta con Sequelize

```javascript
import ModelName from '#models/modelName.js'

const results = await ModelName.findAll({
  where: { field: value },
  attributes: ['id', 'name'],
  order: [['name', 'ASC']],
  include: [{ model: RelatedModel }]
})
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema: Error de conexión a la base de datos
**Causa:** Variables de entorno incorrectas o servidor MySQL no iniciado.

**Solución:** Verificar `.env` y que el servidor MySQL esté corriendo.

### Problema: Tablas no se crean
**Causa:** `createTables()` no se ejecutó o hubo error.

**Solución:** Verificar logs del servidor y ejecutar manualmente si es necesario.

### Problema: Relaciones no funcionan
**Causa:** `setTableRelations()` no se ejecutó o hay error en definiciones.

**Solución:** Verificar que las relaciones estén correctamente definidas y que `setTableRelations()` se ejecute después de `createTables()`.

### Problema: Restricciones globales no se aplican
**Causa:** Migración no se ejecutó.

**Solución:** Ejecutar `npm run check:migration` para verificar y aplicar migración si es necesaria.

---

## 🔗 Referencias a Otros Documentos

- **[database_schema.md](../database_schema.md)** - Esquema de la base de datos
- **[backend/README.md](../backend/README.md)** - Documentación de perfiles y restricciones
- **[backend/AUTO_MIGRATION_GUIDE.md](../backend/AUTO_MIGRATION_GUIDE.md)** - Guía de migración automática
- **[docs/BackendAPI.md](./BackendAPI.md)** - Endpoints de la API

---

## ⚙️ Configuración

### Import Maps

```javascript
// .sequelizerc
{
  "imports": {
    "#models/*": "./src/backEnd/dataBase/models/*.js",
    "#querys/*": "./src/backEnd/dataBase/querys/*.js",
    "#utils/*": "./src/backEnd/utils/*.js",
    "#dataBaseConnection": "./src/backEnd/dataBase/connection/ORMconnection.js"
  }
}
```

### Charset y Collation

Todos los modelos usan:
```javascript
charset: "utf8mb4",
collate: "utf8mb4_unicode_ci"
```

Esto asegura soporte completo para caracteres Unicode (tildes, ñ, etc.).

---

## 🧪 Pruebas Recomendadas

### Conexión
1. Verificar que el servidor se conecte a la base de datos
2. Verificar mensaje "La base de datos se conecto correctamente"
3. Probar consulta simple a una tabla

### Modelos
1. Crear registro con cada modelo
2. Leer registro
3. Actualizar registro
4. Eliminar registro
5. Verificar validaciones (unique, allowNull, etc.)

### Migraciones
1. Ejecutar `npm run check:migration`
2. Verificar que restricciones globales se apliquen
3. Verificar que no haya pérdida de datos

---

## ⚠️ Reglas Críticas

### Migraciones
- **SIEMPRE** hacer backup antes de migraciones
- **SIEMPRE** probar migraciones en desarrollo primero
- Usar scripts npm para migraciones automáticas
- Verificar `backend/AUTO_MIGRATION_GUIDE.md` antes de migrar

### Modelos
- **SIEMPRE** usar UUID como primary key
- **SIEMPRE** especificar charset y collate utf8mb4
- **SIEMPRE** definir allowNull explícitamente
- **SIEMPRE** usar DataTypes apropiados

### Consultas
- **SIEMPRE** usar import maps para importar modelos
- **SIEMPRE** manejar errores en consultas
- **SIEMPRE** usar transactions para operaciones múltiples

---

*Última actualización: 21 de abril de 2026*
