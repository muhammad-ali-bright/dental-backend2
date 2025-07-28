const express = require('express');
const router = express.Router();
const controller = require('../controllers/incident.controller');
const authenticate = require("../middleware/authenticate");

router.get('/', authenticate, controller.getIncidents);
router.get('/range', authenticate, controller.getIncidentsByRange);
router.get('/patient/:patientId', authenticate, controller.getPatientIncidents);
// router.get('/:id', controller.getAppointmentById);
router.post('/', authenticate, controller.createIncident);
router.put('/:id', authenticate, controller.updateIncident);
router.put('/status/:id', authenticate, controller.updateIncidentStatus)
router.delete('/:id', authenticate, controller.deleteIncident);

// router.get('/dateRange', controller.getAppointmentsByDateRange);

module.exports = router;
