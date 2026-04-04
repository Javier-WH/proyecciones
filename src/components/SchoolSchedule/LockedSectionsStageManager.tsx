import React, { useState, useEffect } from 'react';
import { Modal, Select, Tag, Button, Space, message, Badge, Tabs, Alert } from 'antd';
import { LockOutlined, UnlockOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { MainContextValues } from '../../interfaces/contextInterfaces';
import { MainContext } from '../../context/mainContext';
import { Event } from './fucntions';
import { updateLockedSectionStage } from '../../fetch/schedule/lockedSectionsFetch';

const { Option } = Select;

type Stage = 'planning' | 'official';

interface LockedSectionInfo {
  sectionKey: string;
  pnfId: string;
  trayectoId: string;
  seccion: string;
  trimestre: string;
  events: Event[];
  stage: Stage;
  lastModified?: string;
}

interface LockedSectionsStageManagerProps {
  open: boolean;
  onClose: () => void;
}

export const LockedSectionsStageManager: React.FC<LockedSectionsStageManagerProps> = ({ open, onClose }) => {
  const { lockedSections, subjects, proyectionId } = React.useContext(MainContext) as MainContextValues;
  const [lockedSectionsInfo, setLockedSectionsInfo] = useState<LockedSectionInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'q1' | 'q2' | 'q3'>('q1');
  const [loading, setLoading] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);

  // Parse locked sections into structured info
  useEffect(() => {
    if (!lockedSections || !subjects) return;

    const sections: LockedSectionInfo[] = Object.entries(lockedSections)
      .filter(([key]) => key.endsWith(`-${activeTab}`))
      .map(([sectionKey, events]) => {
        const [pnfId, trayectoId, seccion, trimestre] = sectionKey.split('-');
        // const subject = subjects.find(s => 
        //   s.pnfId === pnfId && 
        //   s.trayectoId === trayectoId && 
        //   s.seccion === seccion
        // );
        
        return {
          sectionKey,
          pnfId,
          trayectoId,
          seccion,
          trimestre,
          events: Array.isArray(events) ? events : [],
          stage: (events as any)?.[0]?.extendedProps?.stage || 'planning', // Default to planning
          lastModified: (events as any)?.[0]?.extendedProps?.lastModified
        };
      });

    setLockedSectionsInfo(sections);
  }, [lockedSections, subjects, activeTab]);

  const updateSectionStage = async (sectionKey: string, newStage: Stage) => {
    setLoading(true);
    setEditingStage(null);

    try {
      const result = await updateLockedSectionStage(proyectionId!, sectionKey, newStage);
      
      if (result.error) {
        throw new Error(result.message || 'Failed to update stage');
      }

      message.success(result.message || `Sección actualizada a etapa "${newStage}"`);

      // Update local state
      setLockedSectionsInfo(prev => 
        prev.map(section => 
          section.sectionKey === sectionKey 
            ? { ...section, stage: newStage }
            : section
        )
      );
    } catch (error) {
      console.error('Error updating section stage:', error);
      message.error('Error al actualizar la etapa de la sección');
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: Stage) => {
    return stage === 'official' ? '#52c41a' : '#1890ff';
  };

  const getStageIcon = (stage: Stage) => {
    return stage === 'official' ? <CheckCircleOutlined /> : <ClockCircleOutlined />;
  };

  const getStageText = (stage: Stage) => {
    return stage === 'official' ? 'Oficial' : 'Planificación';
  };

  const getStageDescription = (stage: Stage) => {
    return stage === 'official' 
      ? 'Etapa oficial - Solo cambios de emergencia permitidos'
      : 'Etapa de planificación - Edición permitida';
  };

  const groupByPnf = (sections: LockedSectionInfo[]) => {
    const grouped: Record<string, LockedSectionInfo[]> = {};
    sections.forEach(section => {
      const pnfName = subjects?.find(s => s.pnfId === section.pnfId)?.pnf || section.pnfId;
      if (!grouped[pnfName]) {
        grouped[pnfName] = [];
      }
      grouped[pnfName].push(section);
    });
    return grouped;
  };

  const tabItems = [
    { key: 'q1', label: 'Trimestre 1' },
    { key: 'q2', label: 'Trimestre 2' },
    { key: 'q3', label: 'Trimestre 3' }
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LockOutlined />
          <span>Gestión de Etapas - Secciones Bloqueadas</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>
      ]}
    >
      <div style={{ marginBottom: '16px' }}>
        <Alert
          message="Gestión de Etapas"
          description="Las secciones bloqueadas pueden estar en 'Planificación' (editable) o 'Oficial' (solo cambios de emergencia)."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'q1' | 'q2' | 'q3')}
          items={tabItems}
        />
      </div>

      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {Object.entries(groupByPnf(lockedSectionsInfo)).map(([pnfName, sections]) => (
          <div key={pnfName} style={{ marginBottom: '24px', border: '1px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#fafafa', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <h4 style={{ margin: 0, color: '#262626' }}>{pnfName}</h4>
              <Badge 
                count={sections.length} 
                style={{ backgroundColor: '#1890ff', marginLeft: '8px' }}
              />
            </div>
            
            <div style={{ padding: '16px' }}>
              {sections.map((section) => (
                <div 
                  key={section.sectionKey} 
                  style={{ 
                    marginBottom: '16px', 
                    padding: '12px', 
                    border: '1px solid #e8e8e8', 
                    borderRadius: '6px',
                    backgroundColor: '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <LockOutlined style={{ color: '#1890ff' }} />
                      <strong>Sección {section.seccion}</strong>
                      <Tag color="blue">Trayecto {section.trayectoId}</Tag>
                      <Tag color="purple">{section.events.length} eventos</Tag>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag 
                        color={getStageColor(section.stage)} 
                        icon={getStageIcon(section.stage)}
                      >
                        {getStageText(section.stage)}
                      </Tag>
                      
                      <Select
                        value={editingStage === section.sectionKey ? undefined : section.stage}
                        placeholder="Cambiar etapa"
                        style={{ width: 140 }}
                        size="small"
                        loading={editingStage === section.sectionKey && loading}
                        onChange={(value) => updateSectionStage(section.sectionKey, value as Stage)}
                        onFocus={() => setEditingStage(section.sectionKey)}
                        onBlur={() => setEditingStage(null)}
                      >
                        <Option value="planning">
                          <Space>
                            <ClockCircleOutlined style={{ color: '#1890ff' }} />
                            <span>Planificación</span>
                          </Space>
                        </Option>
                        <Option value="official">
                          <Space>
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            <span>Oficial</span>
                          </Space>
                        </Option>
                      </Select>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    {getStageDescription(section.stage)}
                  </div>
                  
                  {section.lastModified && (
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      Última modificación: {new Date(section.lastModified).toLocaleString('es-VE')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {lockedSectionsInfo.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <UnlockOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>No hay secciones bloqueadas en este trimestre</div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default LockedSectionsStageManager;
