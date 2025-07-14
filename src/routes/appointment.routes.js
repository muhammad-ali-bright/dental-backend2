const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointment.controller');

const verifyFirebaseToken = require('../middleware/verifyFirebaseToken'); // Import the Firebase token verification middleware

router.post('/', verifyFirebaseToken, controller.createAppointment);
router.get('/:id', verifyFirebaseToken, controller.getAppointmentById);
router.get('/', verifyFirebaseToken, controller.getAppointmentsByStudentId);
router.put('/:id', verifyFirebaseToken, controller.updateAppointment);
router.delete('/:id', verifyFirebaseToken, controller.deleteAppointment);

module.exports = router;
