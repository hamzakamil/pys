const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OvertimeRequestSchema = new Schema({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    date: { type: Date, required: true },
    hours: { type: Number, required: true },
    description: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestDate: { type: Date, default: Date.now },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedDate: { type: Date },
    rejectionReason: { type: String }
}, {
    timestamps: true,
    collection: 'overtimerequests'
});

module.exports = mongoose.model('OvertimeRequest', OvertimeRequestSchema);
