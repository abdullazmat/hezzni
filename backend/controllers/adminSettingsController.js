const db = require('../config/db');

exports.getPrivacyPolicy = async (req, res) => {
  try {
    const [rows] = await db.pool.execute('SELECT value_content FROM settings WHERE key_name = ?', ['privacy_policy']);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Privacy policy not found' });
    }
    res.status(200).json({ content: rows[0].value_content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTermsOfService = async (req, res) => {
  try {
    const [rows] = await db.pool.execute('SELECT value_content FROM settings WHERE key_name = ?', ['terms_of_service']);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Terms of service not found' });
    }
    res.status(200).json({ content: rows[0].value_content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
