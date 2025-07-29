import { Input } from "antd";

export interface PnfSelectorOption {
  value: string;
  label: string;
}

export interface SeccionSelectorProps {
  value: string;
  setValue: (value: string) => void;
}

export default function SeccionSelector({ value, setValue }: SeccionSelectorProps) {
  return (
    <div>
      <label>Indique el numero de la sección</label>
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

