# Report - Generación de Reportes (Frontend)

Este módulo gestiona la generación de reportes desde el frontend.

---

## 📋 Descripción General

El módulo de reportes permite generar reportes en Excel para proyecciones trimestrales y anuales.

---

## 🎯 Componentes Principales

### ReportMenu.tsx
Menú para selección de tipo de reporte.

**Funcionalidades:**
- Menú dropdown con opciones de reporte
- Generación de reporte trimestral (type=1)
- Generación de reporte anual (type=2)
- Usa PNF del usuario del contexto
- Muestra mensajes de carga y éxito/error

**Estado:**
```typescript
- userPNF: string | null - PNF del usuario (del contexto)
```

**Tipos de Reporte:**
- **1**: Proyección Trimestral
- **2**: Proyección Anual

---

## 🔧 Funciones Clave

### Generación de Reporte
```typescript
const handleMenuClick = async (e) => {
  const pnfId = userPNF?.replace(/"/g, "") || "";
  const type = Number.parseInt(e.key);
  const report = await getReport({ pnfId, type });
};
```

---

## 🔗 Referencias

- **[docs/BackendReport.md](./BackendReport.md)** - Generación de reportes en backend
- **[docs/Fetch.md](./Fetch.md)** - Llamadas a la API

---

*Última actualización: 21 de abril de 2026*
