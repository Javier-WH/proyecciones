import { Select } from "antd";
import { useState } from "react";

export interface QuarterSelectorOption {
  value: string;
  label: string;
}

export interface QuarterSelectorProps {
  value: string;
  setValue: (value: string) => void;
}

export default function QuarterSelector({ value, setValue }: QuarterSelectorProps) {
  const [options] = useState<QuarterSelectorOption[]>([
    { value: "1", label: "Trimestre 1" },
    { value: "2", label: "Trimestre 2" },
    { value: "3", label: "Trimestre 3" },
  ]);

  return (
    <div>
      <label>Selecciona un trimestre</label>
      <Select
        showSearch
        style={{ width: 200 }}
        placeholder="Selecciona un trimestre"
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

