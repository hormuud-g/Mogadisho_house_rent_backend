const Subscriber = require('../models/Subscriber');
const { sendNewsletterEmail } = require('../services/emailService');

// Subscribe to newsletter
const subscribe = async (req, res) => {
  try {
    const { email, name, source } = req.body;

    // Check if already subscribed
    let subscriber = await Subscriber.findOne({ email });
    
    if (subscriber) {
      if (subscriber.status === 'unsubscribed') {
        subscriber.status = 'active';
        subscriber.subscribedAt = new Date();
        await subscriber.save();
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already subscribed' 
        });
      }
    } else {
      subscriber = await Subscriber.create({
        email,
        name,
        source: source || 'website'
      });
    }

    // Send welcome email
    await sendNewsletterEmail(email, 'welcome');

    res.status(201).json({ 
      success: true, 
      message: 'Successfully subscribed to newsletter' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Unsubscribe
const unsubscribe = async (req, res) => {
  try {
    const { email } = req.params;
    
    const subscriber = await Subscriber.findOneAndUpdate(
      { email },
      { 
        status: 'unsubscribed',
        unsubscribedAt: new Date()
      },
      { new: true }
    );

    if (!subscriber) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all subscribers (Admin only)
const getSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ subscribedAt: -1 });
    res.json({ 
      success: true, 
      count: subscribers.length,
      data: subscribers 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
