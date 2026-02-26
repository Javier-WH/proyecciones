import React, { useEffect, useState } from "react";
import { Modal, Form, InputNumber, Checkbox, Tabs, Button, message, TimePicker, Input } from "antd";
import { PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { ScheduleConfig, getScheduleConfig, updateScheduleConfig } from "../../fetch/schedule/scheduleConfigFetch";
import fetchPhoto from "../../fetch/fetchPhoto";
import { turnos as defaultTurnos } from "./fucntions";

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
    const [logoPreview, setLogoPreview] = useState<string>("");

    // Watch logo for preview
    const watchedLogo = Form.useWatch("logo_url", form);

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
                header_text: data.header_text || ["", "", "", ""],
                logo_url: data.logo_url || "",
            });

            if (data.logo_url) {
                if (data.logo_url.startsWith("data:")) {
                    setLogoPreview(data.logo_url);
                } else {
                    const url = await fetchPhoto(data.logo_url);
                    if (url) setLogoPreview(url);
                }
            }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (!config) return;

            // Asegurar que los checkboxes siempre envíen un boolean explícito
            // (Antd puede devolver undefined para checkboxes no tocados)
            const updatedConfig = {
                ...config,
                ...values,
                distribute_equitably: !!values.distribute_equitably,
                prevent_single_hour_blocks: !!values.prevent_single_hour_blocks,
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

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamaño máximo 5MB (igual que el backend)
        if (file.size > 5 * 1024 * 1024) {
            message.error("La imagen es demasiado grande. Máximo 5MB.");
            return;
        }

        const formData = new FormData();
        formData.append('name', 'logo_impresion_horario');
        formData.append('foto', file);

        setLoading(true);
        try {
            const apiUrl = import.meta.env.MODE === 'development'
                ? 'http://localhost:3000/photo'
                : '/photo';

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                message.success("Logo subido correctamente al servidor");
                form.setFieldsValue({ logo_url: "logo_impresion_horario" });

                // Actualizar vista previa
                const url = await fetchPhoto("logo_impresion_horario");
                if (url) {
                    setLogoPreview(url);
                }
            } else {
                const errData = await response.json();
                message.error(errData.error || "Error al subir el logo");
            }
        } catch (error) {
            console.error(error);
            message.error("Error de conexión al subir el logo");
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreDefaults = () => {
        if (!config) return;

        Modal.confirm({
            title: "¿Restaurar valores predeterminados?",
            icon: <ExclamationCircleOutlined />,
            content: "Esto restaurará todos los turnos, horarios, días, encabezado y logo a sus valores originales. Esta acción se guardará inmediatamente.",
            okText: "Sí, restaurar",
            cancelText: "Cancelar",
            okButtonProps: { danger: true },
            onOk: async () => {
                const defaultConfig: Partial<ScheduleConfig> = {
                    days: [1, 2, 3, 4, 5],
                    turnos: { ...defaultTurnos },
                    conserve_slots: 3,
                    min_consecutive_slots: 2,
                    distribute_equitably: false,
                    prevent_single_hour_blocks: false,
                    header_text: ["", "", ""],
                    logo_url: "",
                };

                // Update form fields
                form.setFieldsValue({
                    days: defaultConfig.days,
                    conserve_slots: defaultConfig.conserve_slots,
                    min_consecutive_slots: defaultConfig.min_consecutive_slots,
                    distribute_equitably: defaultConfig.distribute_equitably,
                    prevent_single_hour_blocks: defaultConfig.prevent_single_hour_blocks,
                    header_text: defaultConfig.header_text,
                    logo_url: defaultConfig.logo_url,
                });

                // Update config state (which holds turnos)
                const restoredConfig = { ...config, ...defaultConfig };
                setConfig(restoredConfig);
                setLogoPreview("");

                // Save immediately
                try {
                    const result = await updateScheduleConfig(config.id, restoredConfig);
                    if ('error' in result) {
                        message.error(result.message);
                    } else {
                        message.success("Configuración restaurada a valores predeterminados");
                        onConfigUpdate(result);
                    }
                } catch (error) {
                    console.error(error);
                    message.error("Error al restaurar la configuración");
                }
            },
        });
    };

    const headerTab = (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

            <Form.Item label="Logo de la Institución" name="logo_url" style={{ marginBottom: "0px" }}>
                <Input style={{ display: "none" }} />
            </Form.Item>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input type="file" id="logo-upload" style={{ display: "none" }} accept="image/*" onChange={handleLogoChange} />
                    <Button onClick={() => document.getElementById('logo-upload')?.click()}>
                        Seleccionar Imagen Local
                    </Button>
                    {watchedLogo && (
                        <Button danger icon={<DeleteOutlined />} onClick={() => {
                            form.setFieldsValue({ logo_url: "" });
                            setLogoPreview("");
                        }}>
                            Quitar Logo
                        </Button>
                    )}
                </div>
                {logoPreview && (
                    <div style={{ marginTop: "10px", textAlign: "center", border: "1px solid #ddd", padding: "10px", borderRadius: "4px" }}>
                        <p style={{ fontSize: "12px", color: "#666" }}>Vista previa del logo:</p>
                        <img src={logoPreview} alt="Logo preview" style={{ maxHeight: "80px", maxWidth: "100%" }} />
                    </div>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[0, 1, 2].map((index) => (
                    <Form.Item
                        key={index}
                        label={`Línea ${index + 1} del Encabezado`}
                        name={['header_text', index]}
                        style={{ marginBottom: "0" }}
                    >
                        <Input
                            placeholder={`Línea ${index + 1}...`}
                            suffix={
                                <DeleteOutlined
                                    style={{ color: "#ff4d4f", cursor: "pointer" }}
                                    onClick={() => {
                                        const current = form.getFieldValue("header_text") || ["", "", "", ""];
                                        const next = [...current];
                                        next[index] = "";
                                        form.setFieldsValue({ header_text: next });
                                    }}
                                />
                            }
                        />
                    </Form.Item>
                ))}
            </div>

            <p style={{ fontSize: "12px", color: "#666", marginTop: "15px", fontStyle: "italic" }}>
                Nota: La línea 4 se genera automáticamente durante la impresión a partir del PNF seleccionado, eliminando prefijos y convirtiendo el nombre a MAYÚSCULAS.
            </p>
        </div>
    );

    const mainItems = [
        {
            key: "general",
            label: "General",
            children: (
                <>
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
                        <Form.Item label="Max. Horas Consecutivas" name="conserve_slots">
                            <InputNumber min={1} max={10} />
                        </Form.Item>
                        <Form.Item label="Min. Horas Consecutivas" name="min_consecutive_slots">
                            <InputNumber min={1} max={10} />
                        </Form.Item>
                    </div>
                </>
            )
        },
        {
            key: "turnos",
            label: "Turnos y Horarios",
            children: (
                <>
                    <Tabs type="card" items={turnosTabs} />
                </>
            )
        },
        {
            key: "encabezado",
            label: "Encabezado Impresión",
            children: headerTab
        }
    ];

    return (
        <Modal
            title="Configuración de Horarios"
            open={visible}
            onCancel={onClose}
            onOk={handleSave}
            width={700}
            confirmLoading={loading}
            footer={(_, { OkBtn, CancelBtn }) => (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Button
                        icon={<ReloadOutlined />}
                        size="small"
                        onClick={handleRestoreDefaults}
                        disabled={!config}
                    >
                        Restaurar Predeterminados
                    </Button>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <CancelBtn />
                        <OkBtn />
                    </div>
                </div>
            )}
        >
            {config ? (
                <Form form={form} layout="vertical">
                    <Tabs items={mainItems} />
                </Form>
            ) : (
                <p>Cargando configuración...</p>
            )}
        </Modal>
    );
};

export default ScheduleConfigModal;
