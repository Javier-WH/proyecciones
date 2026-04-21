# Backend Report - Generación de Reportes

Este módulo documenta la generación de reportes en el backend.

---

## 📋 Descripción General

El backend genera reportes en Excel usando la librería `xlsx`. Los reportes incluyen proyecciones trimestrales y anuales con desglose de horas por profesor y materia.

---

## 📁 Estructura

```
backend/src/backEnd/report/
├── excelReport.js          - Generación principal de Excel
├── singleQuarterSheet.js   - Hoja de trimestre individual
├── triQuarterSheet copy.js - Hoja de tres trimestres
└── utils.js               - Utilidades de cálculo
```

---

## 🎯 Funciones Principales

### excelReport.js
Endpoint POST `/excelreport`.

**Funcionalidades:**
- Genera archivo Excel basado en tipo de reporte
- Tipo 1: Reporte trimestral
- Tipo 2: Reporte anual
- Retorna archivo descargable

### singleQuarterSheet.js
Genera hoja de Excel para un trimestre específico.

**Funcionalidades:**
- Cálculo de horas por profesor
- Desglose por materia
- Totales por trimestre

### utils.js
Utilidades de cálculo para reportes.

**Funciones:**
- Cálculo de totales de horas
- Suma de horas por trimestre
- **CRÍTICO**: Corrección de bug en suma de horas de segundo semestre

**Bug Corregido:**
```javascript
// ANTES (Incorrecto):
totalHoras.q3 += +item.hours.q2

// AHORA (Corregido):
totalHoras.q2 += +item.hours.q2
```

---

## 🔗 Referencias

- **[docs/Report.md](./Report.md)** - Generación de reportes en frontend
- **[docs/BackendAPI.md](./BackendAPI.md)** - Endpoint /excelreport

---

*Última actualización: 21 de abril de 2026*
