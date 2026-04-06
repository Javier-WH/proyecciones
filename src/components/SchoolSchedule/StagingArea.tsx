import React from 'react';
import { Event } from './fucntions';
import { Badge, Empty, Tooltip, Button } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, ArrowLeftOutlined, ClearOutlined, CloseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import styles from './StagingArea.module.css';

interface StagingAreaProps {
  stagedEvents: Event[];
  subjectColors?: Record<string, string> | null;
  onRemoveGroupFromStaging: (events: Event[]) => void;
  onClearAll: () => void;
  onConfirmChanges: () => void;
  onClose: () => void;
  onDragStart?: (event: Event) => void;
  onDragEnd?: () => void;
  onDropFromSchedule?: (event: Event) => void;
  confirmLoading?: boolean;
}

const getEventId = (event: Event): string => {
  // Include section to make ID unique across different sections with same subject
  return `${event.extendedProps?.subjectId}-${event.extendedProps?.seccion}-${event.daysOfWeek?.[0]}-${event.startTime}`;
};

const StagingArea: React.FC<StagingAreaProps> = ({ 
  stagedEvents, 
  subjectColors,
  onRemoveGroupFromStaging,
  onClearAll,
  onConfirmChanges,
  onClose,
  onDragStart,
  onDragEnd,
  onDropFromSchedule,
  confirmLoading = false,
}) => {
  const dayNames = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Group events by subject
  const groupedEvents = stagedEvents.reduce((acc, event) => {
    const subjectId = event.extendedProps?.subjectId || 'unknown';
    if (!acc[subjectId]) {
      acc[subjectId] = {
        title: event.title || 'Sin nombre',
        pnfId: event.extendedProps?.pnfId,
        events: [],
      };
    }
    acc[subjectId].events.push(event);
    return acc;
  }, {} as Record<string, { title: string; pnfId?: string; events: Event[] }>);

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Handle drag over for the entire staging area
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Handle drop from schedule onto staging area
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    // Check if this is a drop from the schedule (not from staging area itself)
    const isStagedEvent = e.dataTransfer.types.includes("application/staged-event");
    const isScheduleEvent = e.dataTransfer.types.includes("application/schedule-event");
    
    if (isStagedEvent) {
      return; // Ignore drops from staging area to itself
    }
    
    if (!isScheduleEvent) {
      return; // Only accept drops from schedule
    }

    try {
      const eventData = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (eventData && onDropFromSchedule) {
        onDropFromSchedule(eventData);
      }
    } catch (error) {
      console.error("Error parsing dropped event data:", error);
    }
  };

  return (
    <div 
      className={styles.stagingArea}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 className={styles.title}>
            📦 Área de Depósito
            {stagedEvents.length > 0 && (
              <Badge 
                count={stagedEvents.length} 
                style={{ backgroundColor: '#722ed1', marginLeft: 8 }}
              />
            )}
          </h3>
          <Button 
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ marginTop: -4, marginRight: -8 }}
          />
        </div>
        <p className={styles.subtitle}>
          Haz clic o arrastra eventos del horario para moverlos aquí
        </p>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={confirmLoading}
            onClick={onConfirmChanges}
          >
            Confirmar cambios
          </Button>
          {stagedEvents.length > 0 && (
            <Button 
              size="small" 
              icon={<ClearOutlined />}
              onClick={onClearAll}
            >
              Limpiar todo
            </Button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {stagedEvents.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className={styles.emptyText}>
                Haz clic o arrastra eventos del horario para guardarlos aquí temporalmente y reubicarlos
              </span>
            }
          />
        ) : (
          <div className={styles.eventsList}>
            {Object.entries(groupedEvents).map(([subjectId, group]) => (
              <div key={subjectId} className={styles.subjectGroup}>
                <div 
                  className={styles.subjectHeader}
                  style={{ 
                    backgroundColor: subjectColors?.[group.pnfId || ''] 
                      ? `${subjectColors[group.pnfId || '']}20` 
                      : '#f5f5f5',
                    borderLeft: `3px solid ${subjectColors?.[group.pnfId || ''] || '#1890ff'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.subjectName}>{truncateText(group.title, 25)}</span>
                      <Badge count={group.events.length} style={{ backgroundColor: '#8c8c8c' }} />
                    </div>
                    <Tooltip title={`Devolver toda la materia (${group.events.length} hora(s))`}>
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<ArrowLeftOutlined />}
                        style={{ color: '#52c41a' }}
                        onClick={() => onRemoveGroupFromStaging(group.events)}
                      />
                    </Tooltip>
                  </div>
                </div>
                <div className={styles.subjectEvents}>
                  {group.events.map((event) => {
                    const eventId = getEventId(event);
                    const dayName = dayNames[event.daysOfWeek?.[0] || 0];
                    const color = subjectColors?.[group.pnfId || ''];

                    return (
                      <div
                        key={eventId}
                        className={styles.eventCard}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", JSON.stringify(event));
                          e.dataTransfer.setData("application/staged-event", "true");
                          onDragStart?.(event);
                        }}
                        onDragEnd={() => {
                          onDragEnd?.();
                        }}
                        style={{
                          backgroundColor: color ? `${color}15` : '#f0f0f0',
                          borderLeft: `4px solid ${color || '#1890ff'}`,
                          cursor: 'grab',
                        }}
                      >
                        <div className={styles.eventContent}>
                          <div className={styles.eventTitle}>
                            <Tooltip title={event.title}>
                              <span>{truncateText(event.title || '', 22)}</span>
                            </Tooltip>
                          </div>
                          <div className={styles.eventMeta}>
                            <span className={styles.metaItem}>
                              <ClockCircleOutlined /> {dayName} {event.startTime} - {event.endTime}
                            </span>
                          </div>
                          <div className={styles.eventMeta}>
                            <span className={styles.metaItem}>
                              <EnvironmentOutlined /> {event.extendedProps?.classroomName || 'Sin aula'}
                            </span>
                          </div>
                          <div className={styles.eventSection}>
                            Sección {event.extendedProps?.seccion} • {event.extendedProps?.trayectoName || `Tray. ${event.extendedProps?.trayectoId}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.hint}>
          💡 Selecciona un evento y haz clic en el horario para reubicarlo
        </div>
      </div>
    </div>
  );
};

export default StagingArea;
