const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AdvanceRequestSchema = new Schema({
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    amount: { type: Number, required: true },
    repaymentType: { type: String, enum: ['payroll', 'date', 'installment'], required: true },
    repaymentDate: { type: Date },
    installments: [{
        amount: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        isPaid: { type: Boolean, default: false }
    }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestDate: { type: Date, default: Date.now },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedDate: { type: Date },
    rejectionReason: { type: String }
}, {
    timestamps: true,
    collection: 'advancerequests'
});

module.exports = mongoose.model('AdvanceRequest', AdvanceRequestSchema);
