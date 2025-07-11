const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');

const verifyFirebaseToken = require('../middleware/verifyFirebaseToken'); // Import the Firebase token verification middleware

router.post('/', verifyFirebaseToken, patientController.createPatient);
router.get('/', verifyFirebaseToken, patientController.getPatients);
router.put('/:id', verifyFirebaseToken, patientController.updatePatient);
router.delete('/:id', verifyFirebaseToken, patientController.deletePatient);

module.exports = router;
