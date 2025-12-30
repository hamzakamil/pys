const express = require('express');
const router = express.Router();
const WhatsAppSettings = require('../models/WhatsAppSettings');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

// GET /api/whatsapp/settings/:companyId - Şirket WhatsApp ayarlarını getir
router.get('/settings/:companyId', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { companyId } = req.params;

    // Yetki kontrolü
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      if (req.user.company.toString() !== companyId) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi admin için şirket kontrolü
      const company = await Company.findById(companyId);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    const settings = await WhatsAppSettings.findOne({ company: companyId })
      .populate('company', 'name')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');

    if (!settings) {
      return res.json({ 
        success: true, 
        data: null,
        message: 'WhatsApp ayarları henüz yapılandırılmamış'
      });
    }

    res.json({ 
      success: true, 
      data: settings,
      // API key'i response'da gösterme (güvenlik)
      message: 'WhatsApp ayarları başarıyla getirildi'
    });
  } catch (error) {
    console.error('WhatsApp ayarları getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// POST /api/whatsapp/settings - WhatsApp ayarlarını kaydet/güncelle
router.post('/settings', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const {
      companyId,
      whatsappBusinessNumber,
      apiProvider,
      apiKey,
      messageTemplates,
      isActive
    } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Şirket seçimi zorunludur' });
    }

    // Yetki kontrolü
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      if (req.user.company.toString() !== companyId) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    } else if (req.user.role.name === 'bayi_admin') {
      const company = await Company.findById(companyId);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    // Şirket kontrolü
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
    }

    // Validasyon
    if (!whatsappBusinessNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'WhatsApp işletme numarası zorunludur' 
      });
    }

    // API key kontrolü: Yeni kayıt için zorunlu, güncelleme için opsiyonel
    const isNewRecord = !settings;
    if (isNewRecord && !apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API anahtarı zorunludur' 
      });
    }

    // Telefon numarası format kontrolü
    const phoneRegex = /^\+90\s?[0-9]{3}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;
    if (!phoneRegex.test(whatsappBusinessNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: 'WhatsApp işletme numarası +90 ile başlamalı ve geçerli formatta olmalıdır (örn: +90 532 000 00 00)' 
      });
    }

    // Mevcut ayarları kontrol et
    let settings = await WhatsAppSettings.findOne({ company: companyId });

    // Şifreleme helper'ını import et
    const crypto = require('crypto');
    const ENCRYPTION_KEY = process.env.WHATSAPP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    const IV_LENGTH = 16;

    function encrypt(text) {
      if (!text) return null;
      try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
      } catch (error) {
        console.error('Token şifreleme hatası:', error);
        return text; // Hata durumunda şifrelemeden kaydet
      }
    }

    if (settings) {
      // Güncelle
      settings.whatsappBusinessNumber = whatsappBusinessNumber;
      settings.apiProvider = apiProvider || settings.apiProvider;
      // API key sadece yeni değer verilmişse güncelle
      if (apiKey && apiKey.trim() !== '') {
        settings.apiKey = encrypt(apiKey); // Şifrele
      }
      if (messageTemplates) {
        settings.messageTemplates = { ...settings.messageTemplates, ...messageTemplates };
      }
      if (isActive !== undefined) {
        settings.isActive = isActive;
      }
      settings.updatedBy = req.user._id;
    } else {
      // Yeni kayıt
      const defaultTemplates = whatsappService.getDefaultTemplates();
      settings = new WhatsAppSettings({
        company: companyId,
        whatsappBusinessNumber,
        apiProvider: apiProvider || 'Meta Cloud API',
        apiKey: encrypt(apiKey), // Şifrele
        messageTemplates: messageTemplates || defaultTemplates,
        isActive: isActive || false,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
    }

    await settings.save();

    // Response'da API key'i gösterme
    const responseData = settings.toJSON();
    delete responseData.apiKey;

    res.json({
      success: true,
      message: 'WhatsApp entegrasyon ayarları başarıyla kaydedildi',
      data: responseData
    });
  } catch (error) {
    console.error('WhatsApp ayarları kaydetme hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// POST /api/whatsapp/validate - API credentials doğrulama (test)
router.post('/validate', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Şirket seçimi zorunludur' });
    }

    // Yetki kontrolü
    if (req.user.role.name === 'company_admin' || req.user.role.name === 'resmi_muhasebe_ik') {
      if (req.user.company.toString() !== companyId) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    const settings = await WhatsAppSettings.findOne({ company: companyId });
    if (!settings) {
      return res.status(404).json({ success: false, message: 'WhatsApp ayarları bulunamadı' });
    }

    // Credential doğrulama (şimdilik sadece format kontrolü)
    const isValid = await whatsappService.validateCredentials(settings);

    if (isValid) {
      settings.lastTestedAt = new Date();
      await settings.save();
    }

    res.json({
      success: isValid,
      message: isValid ? 'API credentials geçerli' : 'API credentials geçersiz',
      lastTestedAt: settings.lastTestedAt
    });
  } catch (error) {
    console.error('WhatsApp credential doğrulama hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// GET /api/whatsapp/templates/:companyId - Mesaj şablonlarını getir
router.get('/templates/:companyId', auth, requireRole('company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const { companyId } = req.params;

    const settings = await WhatsAppSettings.findOne({ company: companyId });
    if (!settings) {
      return res.json({ 
        success: true, 
        data: whatsappService.getDefaultTemplates(),
        message: 'Varsayılan şablonlar döndürüldü'
      });
    }

    res.json({
      success: true,
      data: settings.messageTemplates || whatsappService.getDefaultTemplates()
    });
  } catch (error) {
    console.error('Mesaj şablonları getirme hatası:', error);
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

module.exports = router;

