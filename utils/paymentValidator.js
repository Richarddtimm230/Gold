const validateSalaryPayment = (data) => {
  const errors = [];

  if (!data.staffId) {
    errors.push('Staff member is required');
  }

  if (!data.month || !['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'].includes(data.month)) {
    errors.push('Valid month is required');
  }

  if (!data.year || data.year < 2000 || data.year > 2100) {
    errors.push('Valid year is required (2000-2100)');
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateAdminTransaction = (data) => {
  const errors = [];

  const validTypes = ['Utilities', 'Maintenance', 'Supplies', 'Insurance', 'Contractor', 'Equipment', 'Other'];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.push('Valid transaction type is required');
  }

  if (!data.description || data.description.trim().length < 5) {
    errors.push('Description must be at least 5 characters');
  }

  if (!data.vendor || data.vendor.trim().length < 2) {
    errors.push('Vendor/Recipient name is required');
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateSalaryPayment,
  validateAdminTransaction
};
