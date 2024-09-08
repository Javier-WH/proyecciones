import getInscriptionData from "../../../fetch/getInscriptionData"
import { useEffect, useState } from "react"

import Spinner from "../../spinner/spinner"
export default function NewProyectionContainer({ programaId, trayectoId }: { programaId: string | null | undefined, trayectoId: string | null | undefined }) {


  const [inscriptionData, setInscriptionData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [passed, setPassed] = useState(null)

  useEffect(() => {
    if (!programaId || !trayectoId) return
    setLoading(true)
    getInscriptionData({ programId: programaId, trayectoId: trayectoId })
      .then(data => setInscriptionData(data))
  }, [programaId, trayectoId])

  useEffect(() => {
    if (!inscriptionData) return
    setLoading(false)
    setPassed(inscriptionData.data.passed)
  }, [inscriptionData])

  return <div>
    {
      loading
        ? <Spinner />
        : <div>
          
          {
           passed ? Object.keys(passed).map((key, index) => {
              return <div key={index}>
                <p>{key}</p>
              </div>
            })

            : <p>No hay materias a proyectar</p>
          }


     
        </div>
    }
  </div>

}