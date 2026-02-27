export interface ScheduleConfig {
    id: string;
    days: number[];
    turnos: Record<string, [string, string][]>;
    conserve_slots: number;
    min_consecutive_slots: number;
    active: boolean;
    distribute_equitably?: boolean;
    prevent_single_hour_blocks?: boolean;
    header_text?: string[];
    logo_url?: string;
    auto_solve?: boolean;
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
        const data = await response.json();
        if (data) {
            if (typeof data.turnos === 'string') data.turnos = JSON.parse(data.turnos);
            if (typeof data.days === 'string') data.days = JSON.parse(data.days);
            if (typeof data.header_text === 'string') data.header_text = JSON.parse(data.header_text);
        }
        return data;
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

        const result = await response.json();
        if (result && !result.error) {
            if (typeof result.turnos === 'string') result.turnos = JSON.parse(result.turnos);
            if (typeof result.days === 'string') result.days = JSON.parse(result.days);
            if (typeof result.header_text === 'string') result.header_text = JSON.parse(result.header_text);
        }
        return result;
    } catch (error) {
        console.error(error);
        return { error: true, message: 'Internal server error' };
    }
};
