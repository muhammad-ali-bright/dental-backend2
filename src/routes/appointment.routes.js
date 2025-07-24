const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointment.controller');

router.get('/', controller.getAppointments);
router.get('/:id', controller.getAppointmentById);
router.post('/', controller.createAppointment);
router.put('/:id', controller.updateAppointment);
router.delete('/:id', controller.deleteAppointment);

router.get('/dateRange', controller.getAppointmentsByDateRange);

module.exports = router;
