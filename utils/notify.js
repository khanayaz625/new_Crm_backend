const Notification = require('../models/Notification');

const createNotification = async (userId, title, message) => {
  try {
    const notification = new Notification({
      userId,
      title,
      message
    });
    await notification.save();
  } catch (err) {
    console.error('Notification Error:', err);
  }
};

module.exports = createNotification;
