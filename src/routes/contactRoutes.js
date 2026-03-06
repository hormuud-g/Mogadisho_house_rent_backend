const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  submitContact,
  getMessages,
  replyToMessage,
  markAsRead
} = require('../controllers/contactController');

router.post('/', submitContact);
router.get('/admin', protect, admin, getMessages);
router.post('/admin/:id/reply', protect, admin, replyToMessage);
router.put('/admin/:id/read', protect, admin, markAsRead);

module.exports = router;
