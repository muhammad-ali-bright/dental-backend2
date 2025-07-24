const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');

const authenticate = require('../middleware/authenticate'); // Import the Firebase token verification middleware


router.get('/', patientController.getPatients);
router.post('/', patientController.createPatient);
router.put('/:id', patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

router.get('/names', patientController.getPatientNames);

module.exports = router;
