import { Select } from "antd";
import { useContext, useEffect, useState } from "react";
import { MainContext } from "../../../context/mainContext";
import { MainContextValues } from "../../../interfaces/contextInterfaces";

export interface PnfSelectorOption {
  value: string;
  label: string;
}

export interface PnfSelectorProps {
  value: string;
  setValue: (value: string) => void;
}

export default function PnfSelector({ value, setValue }: PnfSelectorProps) {
  const { pnfList } = useContext(MainContext) as MainContextValues;
  const [options, setOptions] = useState<PnfSelectorOption[]>([]);

  useEffect(() => {
    if (!pnfList) return;
    const pnfOpt = pnfList.map((pnf) => ({
      value: pnf.id.toString(),
      label: pnf.name.toString(),
    }));
    setOptions(pnfOpt);
  }, [pnfList]);

  return (
    <div>
      <label>Selecciona un PNF</label>
      <Select
        showSearch
        style={{ width: 200 }}
        placeholder="Selecciona un PNF"
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

