const express = require('express');
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const patientController = require('../controllers/patient.controller');

router.get('/', authenticate, patientController.getPatients);
router.get('/dropdown', authenticate, patientController.getPatientNames);
router.get('/:id', authenticate, patientController.getPatientById);
router.post('/', authenticate, patientController.createPatient);
router.put('/:id', authenticate, patientController.updatePatient);
router.delete('/:id', authenticate, patientController.deletePatient);


module.exports = router;
