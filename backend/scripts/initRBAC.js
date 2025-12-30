const mongoose = require('mongoose');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const RolePermission = require('../models/RolePermission');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const initRBAC = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personel_yonetim', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('RBAC sistemi başlatılıyor...');

    // 1. Varsayılan yetkileri oluştur
    const permissions = [
      { name: 'company:create', description: 'Yeni şirket ekleme', category: 'company' },
      { name: 'company:view', description: 'Şirket görüntüleme', category: 'company' },
      { name: 'company:update', description: 'Şirket güncelleme', category: 'company' },
      { name: 'company:delete', description: 'Şirket silme', category: 'company' },
      { name: 'employee:create', description: 'Çalışan ekleme', category: 'employee' },
      { name: 'employee:view', description: 'Çalışan görüntüleme', category: 'employee' },
      { name: 'employee:update', description: 'Çalışan güncelleme', category: 'employee' },
      { name: 'employee:delete', description: 'Çalışan silme', category: 'employee' },
      { name: 'attendance:approve', description: 'İşe giriş/çıkış onayı', category: 'attendance' },
      { name: 'attendance:view', description: 'İşe giriş/çıkış görüntüleme', category: 'attendance' },
      { name: 'leave:approve', description: 'İzin talebi onayı', category: 'leave' },
      { name: 'leave:request', description: 'İzin talebi oluşturma', category: 'leave' },
      { name: 'leave:view', description: 'İzin talebi görüntüleme', category: 'leave' },
      { name: 'system:manage_roles', description: 'Rol yönetimi', category: 'system' },
      { name: 'system:manage_permissions', description: 'Yetki yönetimi', category: 'system' }
    ];

    for (const permData of permissions) {
      const existingPerm = await Permission.findOne({ name: permData.name });
      if (!existingPerm) {
        await Permission.create(permData);
        console.log(`Yetki oluşturuldu: ${permData.name}`);
      } else {
        console.log(`Yetki zaten mevcut: ${permData.name}`);
      }
    }

    // 2. Varsayılan rolleri oluştur (eğer yoksa)
    const roles = [
      { name: 'super_admin', description: 'Süper Admin', isSystemRole: true },
      { name: 'bayi_admin', description: 'Bayi Admin', isSystemRole: true },
      { name: 'bayi_yetkilisi', description: 'Bayi Yetkilisi', isSystemRole: true },
      { name: 'company_admin', description: 'Şirket Admin', isSystemRole: true },
      { name: 'resmi_muhasebe_ik', description: 'Resmi Muhasebe/İK', isSystemRole: true },
      { name: 'employee', description: 'Çalışan', isSystemRole: true }
    ];

    const createdRoles = {};
    for (const roleData of roles) {
      let role = await Role.findOne({ name: roleData.name });
      if (!role) {
        role = await Role.create(roleData);
        console.log(`Rol oluşturuldu: ${roleData.name}`);
      } else {
        // Mevcut rolü güncelle (isSystemRole ekle)
        if (!role.isSystemRole) {
          role.isSystemRole = true;
          await role.save();
        }
        console.log(`Rol zaten mevcut: ${roleData.name}`);
      }
      createdRoles[roleData.name] = role;
    }

    // 3. Rollere varsayılan yetkileri ata
    const allPermissions = await Permission.find();

    // Super Admin: Tüm yetkiler
    for (const perm of allPermissions) {
      await RolePermission.findOneAndUpdate(
        { role: createdRoles.super_admin._id, permission: perm._id },
        { role: createdRoles.super_admin._id, permission: perm._id, assignedBy: null },
        { upsert: true }
      );
    }
    console.log('Super Admin\'e tüm yetkiler atandı');

    // Bayi Admin: Şirket ve çalışan yönetimi, onay işlemleri
    const bayiAdminPerms = [
      'company:create', 'company:view', 'company:update',
      'employee:create', 'employee:view', 'employee:update',
      'attendance:approve', 'attendance:view',
      'leave:approve', 'leave:view'
    ];
    for (const permName of bayiAdminPerms) {
      const perm = allPermissions.find(p => p.name === permName);
      if (perm) {
        await RolePermission.findOneAndUpdate(
          { role: createdRoles.bayi_admin._id, permission: perm._id },
          { role: createdRoles.bayi_admin._id, permission: perm._id, assignedBy: null },
          { upsert: true }
        );
      }
    }
    console.log('Bayi Admin\'e yetkiler atandı');

    // Bayi Yetkilisi: Başlangıçta yetki yok (bayi admin tarafından atanacak)
    console.log('Bayi Yetkilisi için yetki ataması bayi admin tarafından yapılacak');

    // Company Admin: Şirket görüntüleme, çalışan yönetimi, onay işlemleri
    const companyAdminPerms = [
      'company:view',
      'employee:create', 'employee:view', 'employee:update',
      'attendance:approve', 'attendance:view',
      'leave:approve', 'leave:view'
    ];
    for (const permName of companyAdminPerms) {
      const perm = allPermissions.find(p => p.name === permName);
      if (perm) {
        await RolePermission.findOneAndUpdate(
          { role: createdRoles.company_admin._id, permission: perm._id },
          { role: createdRoles.company_admin._id, permission: perm._id, assignedBy: null },
          { upsert: true }
        );
      }
    }
    console.log('Company Admin\'e yetkiler atandı');

    // Resmi Muhasebe/İK: Çalışan görüntüleme, onay işlemleri
    const resmiMuhasebePerms = [
      'employee:view',
      'attendance:view',
      'leave:approve', 'leave:view'
    ];
    for (const permName of resmiMuhasebePerms) {
      const perm = allPermissions.find(p => p.name === permName);
      if (perm) {
        await RolePermission.findOneAndUpdate(
          { role: createdRoles.resmi_muhasebe_ik._id, permission: perm._id },
          { role: createdRoles.resmi_muhasebe_ik._id, permission: perm._id, assignedBy: null },
          { upsert: true }
        );
      }
    }
    console.log('Resmi Muhasebe/İK\'ye yetkiler atandı');

    // Employee: Sadece izin talebi oluşturma ve görüntüleme
    const employeePerms = [
      'leave:request', 'leave:view'
    ];
    for (const permName of employeePerms) {
      const perm = allPermissions.find(p => p.name === permName);
      if (perm) {
        await RolePermission.findOneAndUpdate(
          { role: createdRoles.employee._id, permission: perm._id },
          { role: createdRoles.employee._id, permission: perm._id, assignedBy: null },
          { upsert: true }
        );
      }
    }
    console.log('Employee\'ye yetkiler atandı');

    console.log('RBAC sistemi başarıyla başlatıldı!');
    process.exit(0);
  } catch (error) {
    console.error('RBAC başlatma hatası:', error);
    process.exit(1);
  }
};

initRBAC();

