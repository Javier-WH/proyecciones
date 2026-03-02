import ScheduleConfig from '#models/schedule/scheduleConfig.js'

export const getScheduleConfig = async (req, res) => {
    try {
        const config = await ScheduleConfig.findOne({ where: { active: true } })
        if (!config) {
            return res.status(404).json({ message: 'No configuration found' })
        }
        return res.status(200).json(config)
    } catch (error) {
        console.error('Error fetching schedule config:', error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

export const updateScheduleConfig = async (req, res) => {
    try {
        const { id } = req.params
        const { days, turnos, conserve_slots, min_consecutive_slots, distribute_equitably, prevent_single_hour_blocks, auto_solve, header_text, logo_url, breaks } = req.body

        const config = await ScheduleConfig.findByPk(id)
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' })
        }

        config.days = days
        config.turnos = turnos
        config.conserve_slots = conserve_slots
        config.min_consecutive_slots = min_consecutive_slots
        config.distribute_equitably = distribute_equitably
        config.prevent_single_hour_blocks = prevent_single_hour_blocks
        config.auto_solve = auto_solve
        config.header_text = header_text
        config.logo_url = logo_url
        config.breaks = breaks
        await config.save()

        return res.status(200).json(config)
    } catch (error) {
        console.error('Error updating schedule config:', error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

export const createScheduleConfig = async (req, res) => {
    try {
        const { days, turnos, conserve_slots, min_consecutive_slots, distribute_equitably, prevent_single_hour_blocks, auto_solve, header_text, logo_url, breaks } = req.body

        // Deactivate previous configs
        await ScheduleConfig.update({ active: false }, { where: { active: true } })

        const newConfig = await ScheduleConfig.create({
            days,
            turnos,
            conserve_slots,
            min_consecutive_slots,
            distribute_equitably,
            prevent_single_hour_blocks,
            auto_solve,
            header_text,
            logo_url,
            breaks,
            active: true
        })

        return res.status(201).json(newConfig)
    } catch (error) {
        console.error('Error creating schedule config:', error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

export const deleteScheduleConfig = async (req, res) => {
    try {
        const { id } = req.params
        const config = await ScheduleConfig.findByPk(id)
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' })
        }
        await config.destroy()
        return res.status(200).json({ message: 'Configuration deleted' })
    } catch (error) {
        console.error('Error deleting schedule config:', error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}
