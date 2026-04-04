import React from 'react';
import { Event } from './fucntions';
import { Badge, Empty, Tooltip, Button } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, DeleteOutlined, ArrowLeftOutlined, ClearOutlined, CloseOutlined } from '@ant-design/icons';
import styles from './StagingArea.module.css';

interface StagingAreaProps {
  stagedEvents: Event[];
  subjectColors?: Record<string, string> | null;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string | null) => void;
  onRemoveFromStaging: (event: Event) => void;
  onClearAll: () => void;
  onClose: () => void;
  onDragStart?: (event: Event) => void;
  onDragEnd?: () => void;
}

const getEventId = (event: Event): string => {
  return `${event.extendedProps?.subjectId}-${event.daysOfWeek?.[0]}-${event.startTime}`;
};

const StagingArea: React.FC<StagingAreaProps> = ({ 
  stagedEvents, 
  subjectColors,
  selectedEventId,
  onSelectEvent,
  onRemoveFromStaging,
  onClearAll,
  onClose,
  onDragStart,
  onDragEnd
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

  return (
    <div className={styles.stagingArea}>
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
          Haz clic en un evento del horario para moverlo aquí
        </p>
        {stagedEvents.length > 0 && (
          <Button 
            size="small" 
            icon={<ClearOutlined />}
            onClick={onClearAll}
            style={{ marginTop: 8 }}
          >
            Limpiar todo
          </Button>
        )}
      </div>

      <div className={styles.content}>
        {stagedEvents.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className={styles.emptyText}>
                Haz clic en eventos del horario para guardarlos aquí temporalmente y reubicarlos
              </span>
            }
          />
        ) : (
          <div className={styles.eventsList}>
            {selectedEventId && (
              <div className={styles.selectionHint}>
                ✨ Evento seleccionado. Haz clic en una celda del horario para reubicarlo.
              </div>
            )}
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
                  <span className={styles.subjectName}>{truncateText(group.title, 25)}</span>
                  <Badge count={group.events.length} style={{ backgroundColor: '#8c8c8c' }} />
                </div>
                <div className={styles.subjectEvents}>
                  {group.events.map((event) => {
                    const eventId = getEventId(event);
                    const isSelected = selectedEventId === eventId;
                    const dayName = dayNames[event.daysOfWeek?.[0] || 0];
                    const color = subjectColors?.[group.pnfId || ''];

                    return (
                      <div
                        key={eventId}
                        className={`${styles.eventCard} ${isSelected ? styles.eventCardSelected : ''}`}
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
                        onClick={() => onSelectEvent(isSelected ? null : eventId)}
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
                        <div className={styles.eventActions}>
                          <Tooltip title={isSelected ? "Deseleccionar" : "Seleccionar para reubicar"}>
                            <Button 
                              type="text" 
                              size="small" 
                              icon={<ArrowLeftOutlined />}
                              style={{ color: isSelected ? '#1890ff' : '#8c8c8c' }}
                            />
                          </Tooltip>
                          <Tooltip title="Eliminar del depósito">
                            <Button 
                              type="text" 
                              size="small" 
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => { e.stopPropagation(); onRemoveFromStaging(event); }}
                            />
                          </Tooltip>
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
