export function getTeacherHous(teacherLoad, teacherId) {
  // Inicializamos un objeto para almacenar las sumas
  const totalHoras = {
    q1: 0,
    q2: 0,
    q3: 0
  }

  // Iteramos sobre cada objeto en el array
  teacherLoad.forEach(item => {
    // Verificamos si el objeto tiene la propiedad 'hours' y si es un objeto válido
    if (item.hours && typeof item.hours === 'object') {
      const isSemestral = item.isSemestral === true

      if (isSemestral) {
        // Para materias semestrales: Q1 = Semestre 1, Q2 o Q3 = Semestre 2
        // Solo contamos las horas de Q1 para el Semestre 1 
        if (item.hours.q1 !== undefined && item?.quarter?.q1 === teacherId) {
          totalHoras.q1 += +item.hours.q1
        }
        
        // Q2 y Q3 forman el Semestre 2. Si está en Q3 usamos esas horas, 
        // si no, verificamos Q2 (por si el semestre se configuró en Q2)
        if (item.hours.q3 !== undefined && item?.quarter?.q3 === teacherId) {
          totalHoras.q3 += +item.hours.q3
        } else if (item.hours.q2 !== undefined && item?.quarter?.q2 === teacherId) {
          totalHoras.q2 += +item.hours.q2  // Corregido: sumar a q2, no a q3
        }
      } else {
        // Trimestral: contar todos los trimestres normalmente
        if (item.hours.q1 !== undefined && item?.quarter?.q1 === teacherId) {
          totalHoras.q1 += +item.hours.q1
        }
        if (item.hours.q2 !== undefined && item?.quarter?.q2 === teacherId) {
          totalHoras.q2 += +item.hours.q2
        }
        if (item.hours.q3 !== undefined && item?.quarter?.q3 === teacherId) {
          totalHoras.q3 += +item.hours.q3
        }
      }
    }
  })

  // Devolvemos el objeto con las sumas totales
  return totalHoras
}
