const express = require('express');
const authenticate = require('../middleware/authenticate');
const authController = require('../controllers/auth.controller');

const admin = require('../../firebase/firebase'); // Ensure you have the Firebase admin SDK set up
const router = express.Router();

// POST /register
router.post('/register', authenticate, authController.register);

router.get('/format_firebase', (req, res) => {
    const deleteAllUsers = async (nextPageToken) => {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        const uids = listUsersResult.users.map(userRecord => userRecord.uid);

        if (uids.length) {
            await admin.auth().deleteUsers(uids);
            console.log(`Deleted ${uids.length} users`);
        }

        if (listUsersResult.pageToken) {
            return deleteAllUsers(listUsersResult.pageToken);
        }
    };
    deleteAllUsers().then(() => {
        console.log('All users deleted.');
        return true;
    }).catch(error => {
        console.error('Error deleting users:', error);
    });
});

module.exports = router;
