const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  subscribe,
  unsubscribe,
  getSubscribers
} = require('../controllers/subscriberController');

router.post('/subscribe', subscribe);
router.get('/unsubscribe/:email', unsubscribe);
router.get('/admin/all', protect, admin, getSubscribers);

module.exports = router;
