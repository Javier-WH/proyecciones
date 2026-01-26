import express from "express";
import ClassroomsRoutes from "./classroomsRoutes/classroomsRoutes.js";
import DaysRoutes from "./daysRoutes/daysRoutes.js";
import HoursRoutes from "./hoursRoutes.js";
import SchedulesRoutes from "./schedule.js";
import RestrictionsRoutes from "./restrictionRoutes.js";

const Router = express.Router();

Router.use(ClassroomsRoutes);
Router.use(DaysRoutes);
Router.use(HoursRoutes);
Router.use(SchedulesRoutes);
Router.use(RestrictionsRoutes);

export default Router;

