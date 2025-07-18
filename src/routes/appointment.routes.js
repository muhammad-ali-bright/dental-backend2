const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointment.controller');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

router.get('/', verifyFirebaseToken, controller.getAppointmentsByStudentId);
router.get('/dateRange', verifyFirebaseToken, controller.getAppointmentsByDateRange);
router.get('/:id', verifyFirebaseToken, controller.getAppointmentById);
router.post('/', verifyFirebaseToken, controller.createAppointment);
router.put('/:id', verifyFirebaseToken, controller.updateAppointment);
router.delete('/:id', verifyFirebaseToken, controller.deleteAppointment);

module.exports = router;
