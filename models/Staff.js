const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  photo: String, // base64 image string
  first_name: String,
  last_name: String,
  other_names: String,
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  dob: Date,
  marital_status: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
  address: String,
  phone: String,
  email: { type: String, unique: true },
  designation: String,
  department: String,
  duties: [{ type: String }],
  staff_type: { type: String, enum: ['Teaching', 'Non-Teaching'] },
  date_joined: Date,
  qualification: String,
  experience: Number,
  previous_employer: String,
  specialization: String,
  id_type: String,
  id_number: String,
  id_upload: String, // base64 or file url
  kin_name: String,
  kin_relationship: String,
  kin_phone: String,
  kin_address: String,
  bank_name: String,
  account_name: String,
  account_number: { type: String, unique: true },
  pension: String,
  tax_id: String,
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  emergency_name: { type: String },
  emergency_phone: { type: String },
  emergency_relationship: { type: String },
  login_email: { type: String, required: true, unique: true },
  login_password: { type: String, required: true }, // hashed
  access_level: { type: String, required: true, enum: [
    'Teacher', 'Head Teacher', 'Principal', 'HR', 'Account/Admin'
  ] },
}, { timestamps: true });

module.exports = mongoose.model('Staff', StaffSchema);
