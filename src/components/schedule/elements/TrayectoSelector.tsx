import { Select } from "antd";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";

export interface SelectorOption {
  value: string;
  label: string;
  order: number;
}

export interface TrayectoSelectorProps {
  value: string;
  setValue: (value: string) => void;
}

export default function TrayectoSelector({ value, setValue }: TrayectoSelectorProps) {
  const { trayectosList } = useContext(MainContext) as MainContextValues;
  const [options, setOptions] = useState<SelectorOption[]>([]);

  useEffect(() => {
    if (!trayectosList) return;
    const trayectoOpt = trayectosList.map((trayecto) => ({
      value: trayecto.id.toString(),
      label: trayecto.name.toString(),
      order: trayecto.order,
    }));
    setOptions(trayectoOpt.sort((a, b) => a.order - b.order));
  }, [trayectosList]);

  return (
    <div>
      <label>Selecciona un trayecto</label>
      <Select
        showSearch
        style={{ width: 200 }}
        placeholder="Selecciona un trayecto"
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

