import sequelize from '#dataBaseConnection'
import { DataTypes, Model } from 'sequelize'

class ScheduleConfig extends Model { }

ScheduleConfig.init(
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        days: {
            type: DataTypes.JSON,
            allowNull: false,
            comment: 'Array of active days, e.g. [1, 2, 3, 4, 5]'
        },
        turnos: {
            type: DataTypes.JSON, // Storing the whole turnos object structure
            allowNull: false
        },
        conserve_slots: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
            allowNull: false
        },
        min_consecutive_slots: {
            type: DataTypes.INTEGER,
            defaultValue: 2,
            allowNull: false
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        distribute_equitably: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        prevent_single_hour_blocks: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        header_text: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: ["", "", "", ""]
        },
        logo_url: {
            type: DataTypes.TEXT('long'),
            allowNull: true
        },
        auto_solve: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }
    },
    {
        sequelize,
        modelName: 'schedule_config',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
    }
)

export default ScheduleConfig
