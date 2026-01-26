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
      // Sumamos las horas, convirtiendo los valores a números usando el operador unario '+'
      // Añadimos un check para asegurarnos de que la clave existe antes de sumar
      if (item.hours.q1 !== undefined && (item?.quarter?.q1 === teacherId || (teacherId === 'UNASIGNED' && !item?.quarter?.q1))) {
        totalHoras.q1 += +item.hours.q1
      }
      if (item.hours.q2 !== undefined && (item?.quarter?.q2 === teacherId || (teacherId === 'UNASIGNED' && !item?.quarter?.q2))) {
        totalHoras.q2 += +item.hours.q2
      }
      if (item.hours.q3 !== undefined && (item?.quarter?.q3 === teacherId || (teacherId === 'UNASIGNED' && !item?.quarter?.q3))) {
        totalHoras.q3 += +item.hours.q3
      }
    }
  })

  // Devolvemos el objeto con las sumas totales
  return totalHoras
}
