import React, { useEffect, useState } from "react";
import { Modal, Form, InputNumber, Checkbox, Tabs, Button, message, TimePicker } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { ScheduleConfig, getScheduleConfig, updateScheduleConfig } from "../../fetch/schedule/scheduleConfigFetch";

interface ScheduleConfigModalProps {
    visible: boolean;
    onClose: () => void;
    onConfigUpdate: (config: ScheduleConfig) => void;
}

const DAYS_OPTIONS = [
    { label: "Lunes", value: 1 },
    { label: "Martes", value: 2 },
    { label: "Miércoles", value: 3 },
    { label: "Jueves", value: 4 },
    { label: "Viernes", value: 5 },
    { label: "Sábado", value: 6 },
    { label: "Domingo", value: 7 },
];

const ScheduleConfigModal: React.FC<ScheduleConfigModalProps> = ({ visible, onClose, onConfigUpdate }) => {
    const [form] = Form.useForm();
    const [config, setConfig] = useState<ScheduleConfig | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchConfig();
        }
    }, [visible]);

    const fetchConfig = async () => {
        setLoading(true);
        const data = await getScheduleConfig();
        if (data) {
            setConfig(data);
            form.setFieldsValue({
                days: data.days,
                conserve_slots: data.conserve_slots,
                min_consecutive_slots: data.min_consecutive_slots,
                distribute_equitably: data.distribute_equitably,
                prevent_single_hour_blocks: data.prevent_single_hour_blocks,
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (!config) return;

            const updatedConfig = {
                ...config,
                ...values,
                // Turnos are handled separately in state mostly, but we can verify if we need to merge anything
                // turnos: config.turnos (already in state)
            };

            const result = await updateScheduleConfig(config.id, updatedConfig);

            if ('error' in result) {
                message.error(result.message);
            } else {
                message.success("Configuración actualizada correctamente");
                onConfigUpdate(result);
                onClose();
            }
        } catch (error) {
            console.error(error);
            message.error("Error al guardar la configuración");
        }
    };

    const updateTurno = (turnoKey: string, index: number, field: 0 | 1, value: string) => {
        if (!config) return;
        const newTurnos = { ...config.turnos };
        if (!newTurnos[turnoKey]) return;

        const newBlocks = [...newTurnos[turnoKey]];
        newBlocks[index] = [...newBlocks[index]]; // copy sub-array
        newBlocks[index][field] = value;
        newTurnos[turnoKey] = newBlocks;

        setConfig({ ...config, turnos: newTurnos });
    };

    const addBlock = (turnoKey: string) => {
        if (!config) return;
        const newTurnos = { ...config.turnos };
        const blocks = newTurnos[turnoKey] || [];
        // Default new block
        newTurnos[turnoKey] = [...blocks, ["00:00", "00:00"]];
        setConfig({ ...config, turnos: newTurnos });
    };

    const removeBlock = (turnoKey: string, index: number) => {
        if (!config) return;
        const newTurnos = { ...config.turnos };
        const blocks = newTurnos[turnoKey] || [];

        newTurnos[turnoKey] = blocks.filter((_, i) => i !== index);
        setConfig({ ...config, turnos: newTurnos });
    };

    const renderTurnoEditor = (turnoKey: string) => {
        const blocks = config?.turnos[turnoKey] || [];

        return (
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {blocks.map((block, index) => (
                    <div key={index} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                        <TimePicker
                            format="HH:mm"
                            value={block[0] ? dayjs(block[0], "HH:mm") : null}
                            onChange={(_, timeString) => updateTurno(turnoKey, index, 0, Array.isArray(timeString) ? timeString[0] : timeString)}
                            minuteStep={15}
                            style={{ width: "120px" }}
                            allowClear={false}
                        />
                        <span>-</span>
                        <TimePicker
                            format="HH:mm"
                            value={block[1] ? dayjs(block[1], "HH:mm") : null}
                            onChange={(_, timeString) => updateTurno(turnoKey, index, 1, Array.isArray(timeString) ? timeString[0] : timeString)}
                            minuteStep={15}
                            style={{ width: "120px" }}
                            allowClear={false}
                        />
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeBlock(turnoKey, index)}
                        />
                    </div>
                ))}
                <Button type="dashed" onClick={() => addBlock(turnoKey)} icon={<PlusOutlined />} block>
                    Agregar Bloque
                </Button>
            </div>
        );
    };

    const turnosTabs = config ? Object.keys(config.turnos).map(key => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        children: renderTurnoEditor(key)
    })) : [];

    return (
        <Modal
            title="Configuración de Horarios"
            open={visible}
            onCancel={onClose}
            onOk={handleSave}
            width={600}
            confirmLoading={loading}
        >
            {config ? (
                <Form form={form} layout="vertical">
                    <Form.Item label="Días Hábiles" name="days">
                        <Checkbox.Group options={DAYS_OPTIONS} />
                    </Form.Item>

                    <Form.Item name="distribute_equitably" valuePropName="checked">
                        <Checkbox>Distribuir horas equitativamente (Ej: 4 horas en 2 días de 2 horas)</Checkbox>
                    </Form.Item>

                    <Form.Item name="prevent_single_hour_blocks" valuePropName="checked">
                        <Checkbox>Evitar que las materias queden con bloques de solo 1 hora</Checkbox>
                    </Form.Item>

                    <div style={{ display: "flex", gap: "16px" }}>
                        <Form.Item label="Max. Horas Consecutivas (Conserve Slots)" name="conserve_slots">
                            <InputNumber min={1} max={10} />
                        </Form.Item>
                        <Form.Item label="Min. Horas Consecutivas" name="min_consecutive_slots">
                            <InputNumber min={1} max={10} />
                        </Form.Item>
                    </div>

                    <h3>Configuración de Turnos</h3>
                    <Tabs defaultActiveKey="mañana" items={turnosTabs} />

                </Form>
            ) : (
                <p>Cargando configuración...</p>
            )}
        </Modal>
    );
};

export default ScheduleConfigModal;
