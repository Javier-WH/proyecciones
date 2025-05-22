/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Checkbox, Transfer } from 'antd';
import type { TransferProps } from 'antd';

interface RecordType {
  key: string;
  title: string;
  description: string;

}

interface TabConfProps {
  turnosList: string[];
  turnos: string[];
  setTurnos: (turnos: string[]) => void;
}

export default function TabConf({ turnosList, turnos, setTurnos }: TabConfProps) {
  const [allTurnsData, setAllTurnsData] = useState<RecordType[]>([]);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  

  useEffect(() => {
    if (turnosList) {

      const formattedTurns = turnosList.map((turno) => ({
        key: turno,
        title: turno,
        description: `Descripción de ${turno}`,
      }));
      setAllTurnsData(formattedTurns);

      const initialTargetKeys = turnos.filter(t => turnosList.includes(t));
      setTargetKeys(initialTargetKeys);
    }
  }, [turnosList, turnos]);

  const handleChange: TransferProps['onChange'] = (newTargetKeys) => {
    setTargetKeys(newTargetKeys as any);
    setTurnos(newTargetKeys as any);
  };

  return <div>
    <h3 style={{color: 'gray'}}>Turnos en para la proyección</h3>
    <Transfer
      dataSource={allTurnsData}
      titles={['Turnos Disponibles', 'Turnos Seleccionados']}
      targetKeys={targetKeys}
      onChange={handleChange}
      render={(item) => item.title}
      listStyle={{
        width: 300,
        height: 300,
      }}
    />

  </div>

}