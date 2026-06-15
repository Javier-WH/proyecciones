import express from "express";
import ClassroomsRoutes from "./classroomsRoutes/classroomsRoutes.js";
import DaysRoutes from "./daysRoutes/daysRoutes.js";
import HoursRoutes from "./hoursRoutes.js";
import SchedulesRoutes from "./schedule.js";
import RestrictionsRoutes from "./restrictionRoutes.js";
import ScheduleConfigRoutes from "./scheduleConfigRoutes.js";
import ClassroomOverrideRoutes from "./classroomOverrideRoutes.js";
import LockedSectionsRoutes from "./lockedSectionsRoutes.js";
import ScheduleVersionRoutes from "./scheduleVersionRoutes.js";

const Router = express.Router();

Router.use(ClassroomsRoutes);
Router.use(DaysRoutes);
Router.use(HoursRoutes);
Router.use(SchedulesRoutes);
Router.use(RestrictionsRoutes);
Router.use(ScheduleConfigRoutes);
Router.use(ClassroomOverrideRoutes);
Router.use(LockedSectionsRoutes);
Router.use(ScheduleVersionRoutes);

export default Router;

