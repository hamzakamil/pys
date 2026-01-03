const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const User = require('../models/User');

/**
 * Creates a notification for a user.
 * @param {string} userId - The ID of the user to notify.
 * @param {string} message - The notification message.
 * @param {string} [link] - An optional link for the notification.
 */
const createNotification = async (userId, message, link = '') => {
  try {
    const notification = new Notification({
      userId,
      message,
      link,
    });
    await notification.save();
    // Here you could also trigger a push notification or email
  } catch (error) {
    console.error(`Failed to create notification for user ${userId}:`, error);
  }
};

/**
 * Notifies an employee's manager.
 * @param {string} employeeId - The ID of the employee triggering the event.
 * @param {string} message - The notification message.
 * @param {string} [link] - An optional link for the notification.
 */
const notifyManager = async (employeeId, message, link = '') => {
  try {
    const employee = await Employee.findById(employeeId).populate('departmentId');
    if (!employee || !employee.departmentId || !employee.departmentId.manager) {
      console.error(`Could not find manager for employee ${employeeId}`);
      return;
    }
    
    const manager = await User.findById(employee.departmentId.manager);
    if (manager) {
      await createNotification(manager._id, message, link);
    }
  } catch (error) {
    console.error(`Failed to notify manager for employee ${employeeId}:`, error);
  }
};

/**
 * Notifies all users with a specific role within a company.
 * @param {string} companyId - The ID of the company.
 * @param {string} roleName - The name of the role to notify (e.g., 'resmi_muhasebe_ik').
 * @param {string} message - The notification message.
 * @param {string} [link] - An optional link for the notification.
 */
const notifyRole = async (companyId, roleName, message, link = '') => {
    try {
        const role = await Role.findOne({ name: roleName });
        if (!role) return;

        const users = await User.find({ company: companyId, role: role._id });
        for (const user of users) {
            await createNotification(user._id, message, link);
        }
    } catch (error) {
        console.error(`Failed to notify role ${roleName} for company ${companyId}:`, error);
    }
};


module.exports = {
  createNotification,
  notifyManager,
  notifyRole,
};
