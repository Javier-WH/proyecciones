// agrupa la lista de inscripciones por programa
export function groupedByProgram (data) {
  // agrupar por programa
  const groupedByProgram = data.reduce((acc, item) => {
    const program = item.pnf_info.programa

    if (!acc[program]) {
      acc[program] = []
    }

    acc[program].push(item)

    return acc
  }, {})

  return groupedByProgram
}
