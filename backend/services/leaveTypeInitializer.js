const LeaveType = require('../models/LeaveType');
const CompanyLeaveType = require('../models/CompanyLeaveType');
const LeaveSubType = require('../models/LeaveSubType');

/**
 * Global default LeaveType kayıtlarını oluşturur (ilk kurulum için)
 */
async function initializeGlobalLeaveTypes() {
  try {
    // Zaten kayıtlar varsa atla
    const existingCount = await LeaveType.countDocuments({ isDefault: true });
    if (existingCount > 0) {
      return { success: true, message: 'Global izin türleri zaten mevcut' };
    }

    // Global default izin türleri
    const globalTypes = [
      {
        name: 'Yıllık izin (Ücretli İzin)',
        description: 'Yıllık ücretli izin',
        isDefault: true,
        code: 'ANNUAL_LEAVE',
        defaultDays: 14, // İş Kanunu: 1 yıl için 14 gün
        isOtherCategory: false
      },
      {
        name: 'Hastalık izni (Rapor İzni)',
        description: 'Hastalık raporu ile alınan izin',
        isDefault: true,
        code: 'SICK_LEAVE',
        defaultDays: 0, // Rapor süresine göre
        isOtherCategory: false
      },
      {
        name: 'Mazeret izni (Ücretsiz İzin)',
        description: 'Ücretsiz mazeret izni',
        isDefault: true,
        code: 'UNPAID_LEAVE',
        defaultDays: 0,
        isOtherCategory: false
      },
      {
        name: 'Saatlik İzin',
        description: 'Saatlik izin',
        isDefault: true,
        code: 'HOURLY_LEAVE',
        defaultDays: 0,
        isOtherCategory: false
      },
      {
        name: 'Diğer',
        description: 'Diğer izin türleri',
        isDefault: true,
        code: 'OTHER',
        defaultDays: 0,
        isOtherCategory: true // Alt izinler için ana kategori
      }
    ];

    const createdGlobalTypes = await LeaveType.insertMany(globalTypes);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leaveTypeInitializer.js:60',message:'Global leave types created',data:{count:createdGlobalTypes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Alt izin türleri global olarak oluşturulmaz, şirket bazında oluşturulur
    // Bu yüzden burada LeaveSubType oluşturmuyoruz

    return { success: true, message: 'Global izin türleri oluşturuldu' };
  } catch (error) {
    console.error('Global izin türleri oluşturulurken hata:', error);
    throw error;
  }
}

/**
 * Yeni şirket oluşturulduğunda global default LeaveType'ları CompanyLeaveType'a kopyalar
 * @param {String} companyId - Şirket ID'si
 */
async function initializeCompanyLeaveTypes(companyId) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leaveTypeInitializer.js:103',message:'initializeCompanyLeaveTypes entry',data:{companyId:companyId?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // Global default LeaveType'ları bul
    const globalDefaults = await LeaveType.find({ isDefault: true, isActive: true });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leaveTypeInitializer.js:108',message:'Global defaults check',data:{companyId:companyId?.toString(),globalDefaultsCount:globalDefaults.length,globalDefaultIds:globalDefaults.map(gt=>gt._id?.toString())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (globalDefaults.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leaveTypeInitializer.js:111',message:'No global defaults - initializing',data:{companyId:companyId?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Eğer global default'lar yoksa önce onları oluştur
      await initializeGlobalLeaveTypes();
      const refreshed = await LeaveType.find({ isDefault: true, isActive: true });
      globalDefaults.push(...refreshed);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leaveTypeInitializer.js:115',message:'After global initialization',data:{companyId:companyId?.toString(),refreshedCount:refreshed.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    // Her global default için CompanyLeaveType oluştur
    const companyLeaveTypes = globalDefaults.map(globalType => ({
      company: companyId,
      leaveType: globalType._id,
      name: globalType.name,
      description: globalType.description,
      isActive: true, // Yeni şirket için aktif
      customDays: null, // Varsayılan gün sayısı kullanılacak
      isDefault: true, // Global default'tan geldi
      isOtherCategory: globalType.isOtherCategory
    }));

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leaveTypeInitializer.js:127',message:'Before insertMany',data:{companyId:companyId?.toString(),companyLeaveTypesCount:companyLeaveTypes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const createdCompanyLeaveTypes = await CompanyLeaveType.insertMany(companyLeaveTypes);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leaveTypeInitializer.js:131',message:'Company leave types created successfully',data:{companyId:companyId?.toString(),count:createdCompanyLeaveTypes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // "Diğer" kategorisi için alt izin türlerini oluştur
    const globalOtherCategory = globalDefaults.find(gt => gt.isOtherCategory);
    if (globalOtherCategory) {
      // CompanyLeaveType'ı bul (yeni oluşturulan)
      const companyOtherCategory = createdCompanyLeaveTypes.find(lt => 
        lt.leaveType && lt.leaveType.toString() === globalOtherCategory._id.toString()
      ) || await CompanyLeaveType.findOne({
        company: companyId,
        leaveType: globalOtherCategory._id
      });

      if (companyOtherCategory) {
        // Alt izin türleri
        const subTypes = [
          { name: 'Babalık izni', description: 'Babalık izni', isDefault: true },
          { name: 'Evlilik izni', description: 'Evlilik izni', isDefault: true },
          { name: 'Ölüm izni', description: 'Ölüm izni', isDefault: true },
          { name: 'Doğum izni', description: 'Doğum izni', isDefault: true }
        ];

        const companySubTypes = subTypes.map(subType => ({
          name: subType.name,
          description: subType.description,
          parentLeaveType: companyOtherCategory._id,
          company: companyId,
          isDefault: subType.isDefault
        }));

        await LeaveSubType.insertMany(companySubTypes);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leaveTypeInitializer.js:155',message:'Company leave sub-types created',data:{companyId:companyId?.toString(),count:companySubTypes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
    }

    return { success: true, message: 'Şirket izin türleri oluşturuldu' };
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/ef99827f-649a-4ca0-b31c-87f9b1697091',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leaveTypeInitializer.js:136',message:'Error in initializeCompanyLeaveTypes',data:{companyId:companyId?.toString(),error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('Şirket izin türleri oluşturulurken hata:', error);
    throw error;
  }
}

module.exports = {
  initializeGlobalLeaveTypes,
  initializeCompanyLeaveTypes
};

