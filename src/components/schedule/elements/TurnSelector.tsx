import { Select } from "antd";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";

export interface SelectorOption {
  value: string;
  label: string;
  order: number;
}

export interface TurnSelectorProps {
  value: string;
  setValue: (value: string) => void;
}

export default function TurnSelector({ value, setValue }: TurnSelectorProps) {
  const { turnosList } = useContext(MainContext) as MainContextValues;
  const [options, setOptions] = useState<SelectorOption[]>([]);

  useEffect(() => {
    if (!turnosList) return;
    const trayectoOpt = turnosList.map((trayecto) => ({
      value: trayecto.id.toString(),
      label: trayecto.name.toString(),
      order: trayecto.saga_id,
    }));
    setOptions(trayectoOpt.sort((a, b) => a.order - b.order));
  }, [turnosList]);

  return (
    <div>
      <label>Selecciona un turno</label>
      <Select
        showSearch
        style={{ width: 200 }}
        placeholder="Selecciona un turno"
        optionFilterProp="label"
        filterSort={(optionA, optionB) =>
          (optionA?.label ?? "").toLowerCase().localeCompare((optionB?.label ?? "").toLowerCase())
        }
        options={options}
        value={value}
        onChange={(value) => setValue(value)}
      />
    </div>
  );
}

