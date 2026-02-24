export interface ScheduleConfig {
    id: string;
    days: number[];
    turnos: Record<string, [string, string][]>;
    conserve_slots: number;
    min_consecutive_slots: number;
    active: boolean;
    distribute_equitably?: boolean;
    prevent_single_hour_blocks?: boolean;
}

const API_BASE_URL = import.meta.env.MODE === 'development'
    ? 'http://localhost:3000/schedule-config'
    : '/schedule-config';

export const getScheduleConfig = async (): Promise<ScheduleConfig | null> => {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Error fetching schedule config');
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const updateScheduleConfig = async (
    id: string,
    data: Partial<ScheduleConfig>
): Promise<ScheduleConfig | { error: boolean; message: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return { error: true, message: errorData.message || 'Error updating schedule config' };
        }

        return await response.json();
    } catch (error) {
        console.error(error);
        return { error: true, message: 'Internal server error' };
    }
};
