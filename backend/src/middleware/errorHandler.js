const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      details: errors.array(),
    });
  }
  next();
};

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Dữ liệu đã tồn tại' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Dữ liệu không tìm thấy' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Lỗi server',
  });
};

module.exports = {
  validate,
  errorHandler,
};
