const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');

const authenticate = require('../middleware/authenticate'); // Import the Firebase token verification middleware


router.post('/', authenticate, patientController.createPatient);
router.get('/', authenticate, patientController.getPatients);
router.put('/:id', authenticate, patientController.updatePatient);
router.delete('/:id', authenticate, patientController.deletePatient);

router.get('/names', authenticate, patientController.getPatientNames);

module.exports = router;
