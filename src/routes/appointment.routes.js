const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointment.controller');

router.post('/', controller.createAppointment);
router.get('/:id', controller.getAppointmentById);
router.get('/', controller.getAppointmentsByStudentId);
router.put('/:id', controller.updateAppointment);
router.delete('/:id', controller.deleteAppointment);

module.exports = router;
