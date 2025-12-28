const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const WorkingHours = require('../models/WorkingHours');
const { auth, requireRole } = require('../middleware/auth');

// Debug logging helper
const debugLog = (location, message, data, hypothesisId) => {
  try {
    const logPath = path.join(__dirname, '..', '.cursor', 'debug.log');
    const logEntry = JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    }) + '\n';
    fs.appendFileSync(logPath, logEntry, 'utf8');
  } catch (e) {}
};

// Get all working hours
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role.name === 'super_admin') {
      // Super admin can see all
    } else if (req.user.role.name === 'bayi_admin') {
      // Get companies of dealer
      const Company = require('../models/Company');
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    } else {
      query.company = req.user.company;
    }

    const workingHours = await WorkingHours.find(query)
      .populate('company')
      .sort({ createdAt: -1 });

    res.json(workingHours);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get working hours by company
router.get('/company/:companyId', auth, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Şirket bulunamadı' });
    }

    // Check access
    if (req.user.role.name === 'bayi_admin' && req.user.dealer.toString() !== company.dealer.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) && 
        req.user.company.toString() !== req.params.companyId) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    const workingHours = await WorkingHours.find({ company: req.params.companyId })
      .sort({ createdAt: -1 });

    res.json(workingHours);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Get single working hours
router.get('/:id', auth, async (req, res) => {
  try {
    const workingHours = await WorkingHours.findById(req.params.id).populate('company');
    if (!workingHours) {
      return res.status(404).json({ message: 'Çalışma saatleri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik', 'employee'].includes(req.user.role.name) && 
        req.user.company.toString() !== workingHours.company._id.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    res.json(workingHours);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Create working hours
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  // #region agent log
  debugLog('workingHours.js:80', 'POST /working-hours entry', {body:{...req.body},userRole:req.user?.role?.name,userCompany:req.user?.company?.toString(),userDealer:req.user?.dealer?.toString()}, 'F');
  // #endregion
  try {
    const { name, company, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      // #region agent log
      debugLog('workingHours.js:87', 'Validation failed: name empty', {name:name}, 'F');
      // #endregion
      return res.status(400).json({ message: 'Ad gereklidir' });
    }

    let companyId = company;
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      companyId = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      // bayi_admin için şirket seçilmeli veya kullanıcının şirketlerinden biri olmalı
      if (!company) {
        // #region agent log
        debugLog('workingHours.js:96', 'Validation failed: bayi_admin needs company', {company:company,userDealer:req.user?.dealer?.toString()}, 'F');
        // #endregion
        return res.status(400).json({ message: 'Şirket seçilmelidir' });
      }
      // Bayi admin'in bu şirkete erişimi var mı kontrol et
      const Company = require('../models/Company');
      const companyDoc = await Company.findById(company);
      if (!companyDoc) {
        return res.status(404).json({ message: 'Şirket bulunamadı' });
      }
      if (companyDoc.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ message: 'Bu şirket için yetkiniz yok' });
      }
      companyId = company;
    } else if (req.user.role.name === 'super_admin') {
      if (!company) {
        // #region agent log
        debugLog('workingHours.js:110', 'Validation failed: super_admin needs company', {company:company}, 'F');
        // #endregion
        return res.status(400).json({ message: 'Şirket seçilmelidir' });
      }
      companyId = company;
    }

    // #region agent log
    debugLog('workingHours.js:116', 'Before creating working hours', {name:name,companyId:companyId?.toString()}, 'F');
    // #endregion

    // Helper function to create default day structure
    const getDefaultDay = (isWorking = true) => ({
      start: '09:00',
      end: '18:00',
      isWorking,
      lunchBreak: {
        start: '12:00',
        end: '13:00'
      },
      breaks: {
        morningBreak: {
          enabled: false,
          start: '',
          end: ''
        },
        afternoonBreak: {
          enabled: false,
          start: '',
          end: ''
        }
      }
    });

    const workingHours = new WorkingHours({
      name,
      company: companyId,
      monday: monday || getDefaultDay(true),
      tuesday: tuesday || getDefaultDay(true),
      wednesday: wednesday || getDefaultDay(true),
      thursday: thursday || getDefaultDay(true),
      friday: friday || getDefaultDay(true),
      saturday: saturday || getDefaultDay(false),
      sunday: sunday || getDefaultDay(false)
    });
    await workingHours.save();

    // #region agent log
    debugLog('workingHours.js:133', 'Working hours saved successfully', {workingHoursId:workingHours._id?.toString()}, 'F');
    // #endregion

    const populated = await WorkingHours.findById(workingHours._id).populate('company');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Çalışma saatleri oluşturma hatası:', error);
    // #region agent log
    debugLog('workingHours.js:140', 'POST /working-hours catch block', {errorName:error.name,errorMessage:error.message,errorCode:error.code,errorStack:error.stack?.substring(0,200)}, 'F');
    // #endregion
    
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ 
        message: `Validasyon hatası: ${errors}` 
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Çalışma saatleri oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.' 
    });
  }
});

// Update working hours
router.put('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const workingHours = await WorkingHours.findById(req.params.id);
    if (!workingHours) {
      return res.status(404).json({ message: 'Çalışma saatleri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== workingHours.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    Object.assign(workingHours, req.body);
    await workingHours.save();

    const populated = await WorkingHours.findById(workingHours._id).populate('company');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

// Delete working hours
router.delete('/:id', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const workingHours = await WorkingHours.findById(req.params.id);
    if (!workingHours) {
      return res.status(404).json({ message: 'Çalışma saatleri bulunamadı' });
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) && 
        req.user.company.toString() !== workingHours.company.toString()) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }

    await WorkingHours.findByIdAndDelete(req.params.id);
    res.json({ message: 'Çalışma saatleri silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Hata', error: error.message });
  }
});

module.exports = router;

