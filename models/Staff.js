const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  photo: String, // base64 image string
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  other_names: String,
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  dob: { type: Date, required: true },
  marital_status: { type: String, required: true, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  designation: { type: String, required: true },
  department: { type: String, required: true },
  duties: [{ type: String }],
  staff_type: { type: String, required: true, enum: ['Teaching', 'Non-Teaching'] },
  date_joined: { type: Date, required: true },
  qualification: { type: String, required: true },
  experience: { type: Number, required: true },
  previous_employer: String,
  specialization: String,
  id_type: { type: String, required: true },
  id_number: { type: String, required: true },
  id_upload: String, // base64 or file url
  kin_name: { type: String, required: true },
  kin_relationship: { type: String, required: true },
  kin_phone: { type: String, required: true },
  kin_address: String,
  bank_name: { type: String, required: true },
  account_name: { type: String, required: true },
  account_number: { type: String, required: true, unique: true },
  pension: String,
  tax_id: String,
  emergency_name: { type: String, required: true },
  emergency_phone: { type: String, required: true },
  emergency_relationship: { type: String, required: true },
  login_email: { type: String, required: true, unique: true },
  login_password: { type: String, required: true }, // hashed
  access_level: { type: String, required: true, enum: [
    'Teacher', 'Head Teacher', 'Principal', 'HR', 'Account/Admin'
  ] },
}, { timestamps: true });

module.exports = mongoose.model('Staff', StaffSchema);
