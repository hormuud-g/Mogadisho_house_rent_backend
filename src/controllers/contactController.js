const Contact = require('../models/Contact');
const { sendContactAutoReply } = require('../services/emailService');

// Submit contact form
const submitContact = async (req, res) => {
  try {
    const contact = await Contact.create({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Send auto-reply email
    await sendContactAutoReply(contact.email, contact.name);

    res.status(201).json({ 
      success: true, 
      message: 'Message sent successfully. We will get back to you soon.' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all contact messages (Admin only)
const getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const messages = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Contact.countDocuments(query);

    res.json({
      success: true,
      count: messages.length,
      total,
      data: messages,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Reply to contact message
const replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    contact.replies.push({
      message,
      repliedBy: req.user.id
    });
    contact.status = 'replied';
    await contact.save();

    // Send reply email
    await sendContactReply(contact.email, contact.name, message);

    res.json({ success: true, message: 'Reply sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Contact.findByIdAndUpdate(id, { status: 'read' });
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
