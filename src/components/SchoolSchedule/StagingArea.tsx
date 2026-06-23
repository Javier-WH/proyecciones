import React from 'react';
import { Event } from './fucntions';
import { Badge, Empty, Tooltip, Button, Tabs } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, ArrowLeftOutlined, ClearOutlined, CloseOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import styles from './StagingArea.module.css';
import { scheduleError } from './ErrorsModal';

interface StagingAreaProps {
  stagedEvents: Event[];
  subjectColors?: Record<string, string> | null;
  onRemoveGroupFromStaging: (events: Event[]) => void;
  onDeleteSubjectFromStaging?: (events: Event[]) => void;
  onClearAll: () => void;
  onConfirmChanges: () => void;
  onClose: () => void;
  onRefresh?: () => void;
  onAddSubjects?: () => void;
  onDragStart?: (event: Event) => void;
  onDragEnd?: () => void;
  onDropFromSchedule?: (event: Event) => void;
  confirmLoading?: boolean;
  manualEditSaving?: boolean;
  errors?: scheduleError[];
}

const getEventId = (event: Event): string => {
  // Include section to make ID unique across different sections with same subject
  return `${event.extendedProps?.subjectId}-${event.extendedProps?.seccion}-${event.daysOfWeek?.[0]}-${event.startTime}`;
};

const StagingArea: React.FC<StagingAreaProps> = ({
  stagedEvents,
  subjectColors,
  onRemoveGroupFromStaging,
  onDeleteSubjectFromStaging,
  onClearAll,
  onConfirmChanges,
  onClose,
  onRefresh,
  onAddSubjects,
  onDragStart,
  onDragEnd,
  onDropFromSchedule,
  confirmLoading = false,
  manualEditSaving = false,
  errors = [],
}) => {
  const dayNames = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const [activeTab, setActiveTab] = React.useState<'staged' | 'unassigned'>('staged');

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

  // Group unassigned errors by subjectId and convert to individual events
  const groupedErrors = errors.reduce((acc, error) => {
    const subjectId = error.subjectId || 'unknown';
    if (!acc[subjectId]) {
      acc[subjectId] = {
        title: error.name || 'Sin nombre',
        pnfId: error.pnfId,
        events: [],
        seccion: error.seccion,
        professorName: error.professorName,
        description: error.description,
      };
    }

    // Create individual events for each hour
    const hoursToCreate = error.totalHours || 1;
    for (let i = 0; i < hoursToCreate; i++) {
      const individualEvent: Event = {
        title: error.name || 'Sin nombre',
        daysOfWeek: [1], // Placeholder day, will be set on drop
        startTime: '00:00', // Placeholder time, will be set on drop
        endTime: '00:40', // Placeholder time, will be set on drop
        extendedProps: {
          subjectId: error.subjectId || '',
          seccion: error.seccion,
          trayectoId: error.trayectoId || '',
          pnfId: error.pnfId || '',
          professorId: error.professorId || null,
          classroomId: '',
          classroomName: '',
          pnfName: error.pnfName,
          turnName: error.turn,
          blockId: `${subjectId}-${i}`,
          location: 'staging' as const,
        },
      };
      acc[subjectId].events.push(individualEvent);
    }

    return acc;
  }, {} as Record<string, { title: string; pnfId?: string; events: Event[]; seccion: string; professorName?: string; description: string }>);

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
            📦 Área de Edición Manual
            {stagedEvents.length > 0 && activeTab === 'staged' && (
              <Badge
                count={stagedEvents.length}
                style={{ backgroundColor: '#722ed1', marginLeft: 8 }}
              />
            )}
            {errors.length > 0 && activeTab === 'unassigned' && (
              <Badge
                count={errors.length}
                style={{ backgroundColor: '#ff4d4f', marginLeft: 8 }}
              />
            )}
          </h3>
          {manualEditSaving && (
            <Tooltip title="Guardando el último movimiento">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#faad14', fontSize: 12, marginTop: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#faad14', display: 'inline-block' }} />
                Guardando...
              </div>
            </Tooltip>
          )}
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ marginTop: -4, marginRight: -8 }}
          />
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'staged' | 'unassigned')}
          size="small"
          style={{ marginTop: 8 }}
          items={[
            {
              key: 'staged',
              label: (
                <span>
                  📦 Depositadas
                  {stagedEvents.length > 0 && <Badge count={stagedEvents.length} style={{ marginLeft: 4 }} />}
                </span>
              ),
            },
            {
              key: 'unassigned',
              label: (
                <span>
                  ⚠️ No Asignadas
                  {errors.length > 0 && <Badge count={errors.length} style={{ marginLeft: 4, backgroundColor: '#ff4d4f' }} />}
                </span>
              ),
            },
          ]}
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
           <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={confirmLoading}
            onClick={onConfirmChanges}
          >
            Confirmar cambios
          </Button>
          {onAddSubjects && (
            <Tooltip title="Agregar materias de la proyección a la edición manual">
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={onAddSubjects}
              >
                Agregar
              </Button>
            </Tooltip>
          )}
          {onRefresh && (
            <Tooltip title="Sincronizar profesores y horas con la proyección activa">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={onRefresh}
              >
                Refrescar
              </Button>
            </Tooltip>
          )}
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
        {activeTab === 'staged' ? (
          stagedEvents.length === 0 ? (
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
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    // Store all events in the group for block drag
                    e.dataTransfer.setData("text/plain", JSON.stringify(group.events));
                    e.dataTransfer.setData("application/staged-event", "true");
                    e.dataTransfer.setData("application/staged-block", "true"); // Indicate this is a block drag
                    onDragStart?.(group.events[0]); // Pass first event for compatibility
                  }}
                  onDragEnd={() => {
                    onDragEnd?.();
                  }}
                  style={{
                    backgroundColor: subjectColors?.[group.pnfId || '']
                      ? `${subjectColors[group.pnfId || '']}20`
                      : '#f5f5f5',
                    borderLeft: `3px solid ${subjectColors?.[group.pnfId || ''] || '#1890ff'}`,
                    cursor: 'grab',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.subjectName}>{truncateText(group.title, 25)}</span>
                      <Badge count={group.events.length} style={{ backgroundColor: '#8c8c8c' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Tooltip title={`Devolver toda la materia (${group.events.length} hora(s))`}>
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowLeftOutlined />}
                          style={{ color: '#52c41a' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveGroupFromStaging(group.events);
                          }}
                        />
                      </Tooltip>
                      {onDeleteSubjectFromStaging && (
                        <Tooltip title={`Eliminar "${truncateText(group.title, 20)}" de la edición manual`}>
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{ color: '#ff4d4f' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSubjectFromStaging(group.events);
                            }}
                          />
                        </Tooltip>
                      )}
                    </div>
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
        )) : (
          <div className={styles.eventsList}>
            {Object.keys(groupedErrors).length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className={styles.emptyText}>
                    No hay materias sin asignar
                  </span>
                }
              />
            ) : (
              Object.entries(groupedErrors).map(([subjectId, group]) => (
                <div key={subjectId} className={styles.subjectGroup}>
                  <div
                    className={styles.subjectHeader}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      // Store all events in the group for block drag
                      e.dataTransfer.setData("text/plain", JSON.stringify(group.events));
                      e.dataTransfer.setData("application/staged-event", "true");
                      e.dataTransfer.setData("application/staged-block", "true"); // Indicate this is a block drag
                      e.dataTransfer.setData("application/unassigned-block", "true"); // Indicate this is from unassigned tab
                      onDragStart?.(group.events[0]); // Pass first event for compatibility
                    }}
                    onDragEnd={() => {
                      onDragEnd?.();
                    }}
                    style={{
                      backgroundColor: subjectColors?.[group.pnfId || '']
                        ? `${subjectColors[group.pnfId || '']}20`
                        : '#fff2f0',
                      borderLeft: `3px solid ${subjectColors?.[group.pnfId || ''] || '#ff4d4f'}`,
                      cursor: 'grab',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.subjectName}>{truncateText(group.title, 25)}</span>
                        <Badge count={group.events.length} style={{ backgroundColor: '#ff4d4f' }} />
                      </div>
                      <Tooltip title={truncateText(group.description, 50)}>
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
                      </Tooltip>
                    </div>
                  </div>
                  <div className={styles.subjectEvents}>
                    {group.events.map((event, eventIndex) => {
                      const color = subjectColors?.[group.pnfId || ''] || '#ff4d4f';
                      return (
                        <div
                          key={eventIndex}
                          className={styles.eventCard}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", JSON.stringify(event));
                            e.dataTransfer.setData("application/staged-event", "true");
                            e.dataTransfer.setData("application/unassigned-event", "true"); // Indicate this is from unassigned tab
                            onDragStart?.(event);
                          }}
                          onDragEnd={() => {
                            onDragEnd?.();
                          }}
                          style={{
                            backgroundColor: `${color}15`,
                            borderLeft: `4px solid ${color}`,
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
                                <ClockCircleOutlined /> Hora {eventIndex + 1}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.hint}>
          {activeTab === 'staged' ? (
            '💡 Arrastra eventos del horario aquí para guardarlos temporalmente'
          ) : (
            '💡 Arrastra materias sin asignar al horario para ubicarlas manualmente'
          )}
        </div>
      </div>
    </div>
  );
};

export default StagingArea;
