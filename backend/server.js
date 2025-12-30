const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
const path = require('path');
const fs = require('fs');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directories exist
const uploadsDirs = [
  'uploads', 
  'uploads/leaves',
  'uploads/employment',
  'uploads/employment/contracts',
  'uploads/employment/resignations',
  'uploads/employment/severance'
];
uploadsDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personel_yonetim', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // 5 saniye timeout
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('MongoDB bağlantısı başarılı')
})
.catch(err => {
  console.error('MongoDB bağlantı hatası:', err);
});

// MongoDB bağlantı durumunu kontrol et
mongoose.connection.on('error', (err) => {
  console.error('MongoDB bağlantı hatası:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB bağlantısı kesildi');
});

// Routes
const authRoutes = require('./routes/auth');
const dealerRoutes = require('./routes/dealers');
const companyRoutes = require('./routes/companies');
const departmentRoutes = require('./routes/departments');
const employeeRoutes = require('./routes/employees');
const workingPermitRoutes = require('./routes/workingPermits');
const workingHoursRoutes = require('./routes/workingHours');
const settingsRoutes = require('./routes/settings');
const attendanceTemplateRoutes = require('./routes/attendanceTemplates');
const attendanceRoutes = require('./routes/attendances');
const leaveRequestRoutes = require('./routes/leaveRequests');
const leaveBalanceRoutes = require('./routes/leaveBalances');
const weekendSettingsRoutes = require('./routes/weekendSettings');
const checkInRoutes = require('./routes/checkIns');
const workplaceRoutes = require('./routes/workplaces');
const leaveTypeRoutes = require('./routes/leaveTypes');
const managerRoutes = require('./routes/managers');
const employmentRoutes = require('./routes/employment');
const companyHolidaysRoutes = require('./routes/companyHolidays');
const dashboardRoutes = require('./routes/dashboard');
const requestsRoutes = require('./routes/requests');
const whatsappRoutes = require('./routes/whatsapp');
const leavesRoutes = require('./routes/leaves');
const rolesRoutes = require('./routes/roles');
const permissionsRoutes = require('./routes/permissions');
const usersRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/working-permits', workingPermitRoutes);
app.use('/api/working-hours', workingHoursRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/attendance-templates', attendanceTemplateRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/leave-balances', leaveBalanceRoutes);
app.use('/api/weekend-settings', weekendSettingsRoutes);
app.use('/api/check-ins', checkInRoutes);
app.use('/api/workplaces', workplaceRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/employment', employmentRoutes);
app.use('/api/company-holidays', companyHolidaysRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/leave', leavesRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/users', usersRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Bir hata oluştu', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});

