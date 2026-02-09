import React, { useEffect, useState } from "react";
import { Modal, InputNumber, Button, Form, Typography } from "antd";

const { Text } = Typography;

interface AdministrativeHoursModalProps {
    open: boolean;
    onCancel: () => void;
    onSave: (hours: { q1: number; q2: number; q3: number }) => void;
    initialHours: { q1: number; q2: number; q3: number };
}

const AdministrativeHoursModal: React.FC<AdministrativeHoursModalProps> = ({
    open,
    onCancel,
    onSave,
    initialHours,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            form.setFieldsValue(initialHours);
        }
    }, [open, initialHours, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            onSave(values);
            setLoading(false);
            onCancel();
        } catch (error) {
            console.error("Validation failed:", error);
        }
    };

    return (
        <Modal
            title="Gestión de Horas Administrativas"
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="back" onClick={onCancel}>
                    Cancelar
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleOk}>
                    Guardar
                </Button>,
            ]}
        >
            <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                    Ingrese la cantidad de horas administrativas que el docente dedicará en cada trimestre.
                </Text>
            </div>
            <Form
                form={form}
                layout="vertical"
                initialValues={initialHours}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <Form.Item
                        name="q1"
                        label="Trimestre 1"
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <InputNumber min={0} max={40} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        name="q2"
                        label="Trimestre 2"
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <InputNumber min={0} max={40} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        name="q3"
                        label="Trimestre 3"
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <InputNumber min={0} max={40} style={{ width: '100%' }} />
                    </Form.Item>
                </div>
            </Form>
        </Modal>
    );
};

export default AdministrativeHoursModal;
