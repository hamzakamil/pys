const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const RolePermission = require('../models/RolePermission');
const Permission = require('../models/Permission');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// Tüm rolleri listele
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    // Super admin tüm rolleri görür
    if (req.user.role.name === 'super_admin') {
      // Tüm rolleri getir
    } else if (req.user.role.name === 'bayi_admin') {
      // Bayi admin sadece sistem rolleri ve kendi oluşturduğu rolleri görür
      query = {
        $or: [
          { isSystemRole: true },
          { dealer: req.user.dealer, createdBy: req.user._id }
        ]
      };
    } else {
      // Diğer kullanıcılar sadece sistem rolleri görür
      query = { isSystemRole: true };
    }

    const roles = await Role.find(query)
      .populate('dealer', 'name')
      .populate('createdBy', 'email')
      .sort({ isSystemRole: -1, name: 1 });

    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Rol detayını getir (yetkileriyle birlikte)
router.get('/:id', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('dealer', 'name')
      .populate('createdBy', 'email');

    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol bulunamadı' });
    }

    // Yetki kontrolü: Bayi admin sadece kendi rolleri görebilir
    if (req.user.role.name === 'bayi_admin' && !role.isSystemRole) {
      if (role.dealer?.toString() !== req.user.dealer?.toString() || 
          role.createdBy?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    // Role atanmış yetkileri getir
    const rolePermissions = await RolePermission.find({ role: role._id })
      .populate('permission')
      .populate('companies', 'name')
      .populate('assignedBy', 'email');

    res.json({ 
      success: true, 
      data: {
        role,
        permissions: rolePermissions.map(rp => ({
          id: rp._id,
          permission: rp.permission,
          companies: rp.companies,
          assignedBy: rp.assignedBy
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Yeni rol oluştur
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, dealer } = req.body;

    if (!name || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rol adı ve açıklama gereklidir' 
      });
    }

    // Super admin her rolü oluşturabilir
    // Bayi admin sadece kendi bayiine özel roller oluşturabilir
    if (req.user.role.name === 'bayi_admin') {
      if (!req.user.dealer) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bayi bilgisi bulunamadı' 
        });
      }
    } else if (req.user.role.name !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Rol oluşturma yetkiniz yok' 
      });
    }

    const role = new Role({
      name,
      description,
      isSystemRole: req.user.role.name === 'super_admin' && !dealer,
      dealer: req.user.role.name === 'bayi_admin' ? req.user.dealer : (dealer || null),
      createdBy: req.user._id
    });

    await role.save();
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu rol adı zaten kullanılıyor' 
      });
    }
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Rol güncelle
router.put('/:id', auth, async (req, res) => {
  try {
    const { description } = req.body;

    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol bulunamadı' });
    }

    // Sistem rolleri sadece super_admin tarafından güncellenebilir
    if (role.isSystemRole && req.user.role.name !== 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Sistem rolleri güncellenemez' 
      });
    }

    // Bayi admin sadece kendi rolleri güncelleyebilir
    if (req.user.role.name === 'bayi_admin') {
      if (role.dealer?.toString() !== req.user.dealer?.toString() || 
          role.createdBy?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    role.description = description || role.description;
    await role.save();

    res.json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Rol sil
router.delete('/:id', auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol bulunamadı' });
    }

    // Sistem rolleri silinemez
    if (role.isSystemRole) {
      return res.status(403).json({ 
        success: false, 
        message: 'Sistem rolleri silinemez' 
      });
    }

    // Bayi admin sadece kendi rolleri silebilir
    if (req.user.role.name === 'bayi_admin') {
      if (role.dealer?.toString() !== req.user.dealer?.toString() || 
          role.createdBy?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    } else if (req.user.role.name !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
    }

    // Bu role sahip kullanıcı var mı kontrol et
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu role sahip kullanıcılar var. Önce kullanıcıların rolleri değiştirilmelidir.' 
      });
    }

    // İlişkili RolePermission kayıtlarını sil
    await RolePermission.deleteMany({ role: role._id });

    await role.deleteOne();
    res.json({ success: true, message: 'Rol silindi' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

// Role yetki ata/kaldır
// Bayi Admin: Kendi bayisine bağlı şirketlerin kullanıcılarının rolleri için yetki atayabilir
// Company Admin: Kendi şirketine bağlı kullanıcıların rolleri için yetki atayabilir
router.post('/:id/permissions', auth, async (req, res) => {
  try {
    const { permissionId, action, companies } = req.body; // action: 'add' veya 'remove'

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol bulunamadı' });
    }

    const userRole = req.user.role.name;

    // Yetki kontrolü
    if (role.isSystemRole && userRole !== 'super_admin') {
      // Sistem rolleri için: Bayi admin ve company admin kendi kullanıcıları için yetki atayabilir
      if (userRole === 'bayi_admin') {
        // Bayi admin: Kendi bayisine bağlı şirketlerin kullanıcıları için yetki atayabilir
        // Şirket kontrolü companies array'inde yapılacak
      } else if (userRole === 'company_admin') {
        // Company admin: Sadece kendi şirketine bağlı kullanıcılar için yetki atayabilir
        if (!req.user.company) {
          return res.status(403).json({ success: false, message: 'Şirket bilgisi bulunamadı' });
        }
        // Company admin sadece kendi şirketini companies array'ine ekleyebilir
        if (companies && companies.length > 0) {
          const userCompanyStr = req.user.company.toString();
          const hasOtherCompanies = companies.some(c => c.toString() !== userCompanyStr);
          if (hasOtherCompanies) {
            return res.status(403).json({ 
              success: false, 
              message: 'Sadece kendi şirketinize yetki atayabilirsiniz' 
            });
          }
        }
      } else {
        return res.status(403).json({ 
          success: false, 
          message: 'Sistem rolleri sadece super_admin, bayi_admin veya company_admin tarafından yönetilebilir' 
        });
      }
    } else {
      // Özel roller için
      if (userRole === 'bayi_admin') {
        if (role.dealer?.toString() !== req.user.dealer?.toString()) {
          return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
        }
      } else if (userRole !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });
      }
    }

    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return res.status(404).json({ success: false, message: 'Yetki bulunamadı' });
    }

    if (action === 'add') {
      // Bayi admin ve company admin için şirket bazlı yetki ataması
      let finalCompanies = companies || [];
      
      // Company admin sadece kendi şirketini atayabilir
      if (userRole === 'company_admin') {
        if (!req.user.company) {
          return res.status(403).json({ 
            success: false, 
            message: 'Şirket bilgisi bulunamadı' 
          });
        }
        finalCompanies = [req.user.company];
      } else if (userRole === 'bayi_admin' && companies && companies.length > 0) {
        // Bayi admin sadece kendi bayisine ait şirketleri atayabilir
        const Company = require('../models/Company');
        const validCompanies = await Company.find({ 
          _id: { $in: companies },
          dealer: req.user.dealer 
        });
        finalCompanies = validCompanies.map(c => c._id);
      }
      
      const rolePermissionData = {
        role: role._id,
        permission: permission._id,
        assignedBy: (userRole === 'bayi_admin' || userRole === 'company_admin') ? req.user._id : null,
        companies: finalCompanies
      };

      // Aynı kombinasyon varsa güncelle, yoksa oluştur
      await RolePermission.findOneAndUpdate(
        { role: role._id, permission: permission._id, assignedBy: rolePermissionData.assignedBy },
        rolePermissionData,
        { upsert: true, new: true }
      );
    } else if (action === 'remove') {
      // Yetki kaldırma: Sadece atayan kişi veya super_admin kaldırabilir
      const deleteQuery = {
        role: role._id,
        permission: permission._id
      };
      
      // Eğer bayi_admin veya company_admin tarafından atanmışsa, sadece onlar kaldırabilir
      if (userRole === 'bayi_admin' || userRole === 'company_admin') {
        deleteQuery.assignedBy = req.user._id;
      } else if (userRole !== 'super_admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Yetkiniz yok' 
        });
      }
      
      await RolePermission.deleteOne(deleteQuery);
    }

    res.json({ success: true, message: `Yetki ${action === 'add' ? 'atandı' : 'kaldırıldı'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata', error: error.message });
  }
});

module.exports = router;

