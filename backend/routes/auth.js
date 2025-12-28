const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Company = require('../models/Company');
const { auth } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  // #region agent log
  const fs = require('fs');
  const path = require('path');
  const logPath = path.join(__dirname, '../../.cursor/debug.log');
  try {
    fs.appendFileSync(logPath, JSON.stringify({location:'auth.js:11',message:'login endpoint entry',data:{email:req.body?.email,hasPassword:!!req.body?.password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}) + '\n');
  } catch(e) {}
  // #endregion
  try {
    const { email, password } = req.body;
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'auth.js:21',message:'request body parsed',data:{email:email,hasPassword:!!password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}) + '\n');
    } catch(e) {}
    // #endregion

    // #region agent log - MongoDB connection check
    const mongoose = require('mongoose');
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'auth.js:28',message:'MongoDB connection state before query',data:{readyState:mongoose.connection.readyState,readyStateText:['disconnected','connected','connecting','disconnecting'][mongoose.connection.readyState]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'}) + '\n');
    } catch(e) {}
    // #endregion
    
    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('role');
    // #region agent log
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'auth.js:36',message:'user found',data:{userFound:!!user,userId:user?._id?.toString(),userRole:user?.role?.name,userIsActive:user?.isActive},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'}) + '\n');
    } catch(e) {}
    // #endregion
    if (!user) {
      return res.status(401).json({ message: 'Email veya şifre hatalı' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Hesabınız aktif değil' });
    }

    // Employee rolü için işten çıkış tarihi kontrolü
    if (user.role.name === 'employee' && user.company) {
      const Employee = require('../models/Employee');
      const employee = await Employee.findOne({ 
        email: email.toLowerCase().trim(),
        company: user.company
      });
      
      if (employee && employee.exitDate) {
        const exitDate = new Date(employee.exitDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        exitDate.setHours(0, 0, 0, 0);
        
        if (exitDate <= today) {
          return res.status(401).json({ 
            message: 'İşten çıkış tarihiniz geçtiği için giriş yapamazsınız' 
          });
        }
      }
    }

    // Employee role: İlk girişte şifre kontrolü yapma (sadece email ile giriş)
    if (user.role.name === 'employee') {
      // Eğer şifre yoksa veya mustChangePassword true ise, şifre kontrolü yapma
      if (!user.password || user.mustChangePassword) {
        // İlk giriş - şifre belirleme gerekiyor
        const token = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          token,
          user: {
            id: user._id,
            email: user.email,
            role: user.role.name,
            dealer: user.dealer,
            company: user.company,
            mustChangePassword: true
          },
          requiresPasswordSetup: true
        });
      }
    }

    // Normal giriş: Şifre kontrolü yap
    if (!password) {
      return res.status(401).json({ message: 'Şifre gereklidir' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email veya şifre hatalı' });
    }

    // If company_admin, activate company on first login
    if (user.role.name === 'company_admin' && user.company) {
      const company = await Company.findById(user.company);
      if (company && !company.isActivated) {
        company.isActivated = true;
        company.activatedAt = new Date();
        await company.save();
      }
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role.name,
        dealer: user.dealer,
        company: user.company,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    // #region agent log
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '../../.cursor/debug.log');
    try {
      fs.appendFileSync(logPath, JSON.stringify({location:'auth.js:125',message:'login endpoint exception',data:{errorMessage:error.message,errorStack:error.stack?.substring(0,500),errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n');
    } catch(e) {}
    // #endregion
    res.status(500).json({ message: 'Giriş hatası', error: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('role')
      .populate('dealer')
      .populate('company');

    res.json({
      id: user._id,
      email: user.email,
      role: user.role.name,
      dealer: user.dealer,
      company: user.company,
      mustChangePassword: user.mustChangePassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'Yeni şifre gereklidir' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır' });
    }

    const user = await User.findById(req.user._id);

    // Verify current password (if not first login and password exists)
    if (!user.mustChangePassword && user.password) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Mevcut şifre gereklidir' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Mevcut şifre hatalı' });
      }
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.mustChangePassword = false; // Şifre değiştirildi, artık zorunlu değil
    await user.save();

    // If employee, also activate the employee record
    if (user.role.name === 'employee') {
      const Employee = require('../models/Employee');
      const employee = await Employee.findOne({ email: user.email });
      if (employee && !employee.isActivated) {
        employee.isActivated = true;
        employee.activatedAt = new Date();
        await employee.save();
      }
    }

    res.json({ message: 'Şifre başarıyla belirlendi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

