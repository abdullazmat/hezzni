/**
 * Lightweight validation middleware factory.
 * Define a schema as { fieldName: { required, type, enum, min, max, isFile } }
 * Usage: router.post('/path', validate(MySchema), controller.handler)
 */

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const errors = [];
    const data = source === 'body' ? req.body : req.params;

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const isEmpty = value === undefined || value === null || value === '';

      // Required check
      if (rules.required && isEmpty) {
        // For file fields, check req.files or req.file instead
        if (rules.isFile) {
          const filePresent = (req.files && (req.files[field]?.length > 0)) ||
                              (req.file && req.file.fieldname === field);
          if (!filePresent) {
            errors.push(`${field} is required`);
          }
        } else {
          errors.push(`${field} is required`);
        }
        continue;
      }

      if (isEmpty) continue; // optional and not provided — skip further checks

      // Type check
      if (rules.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${field} must be a number`);
          continue;
        }
        if (rules.min !== undefined && num < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && num > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }

      if (rules.type === 'date') {
        const d = new Date(value);
        if (isNaN(d.getTime())) {
          errors.push(`${field} must be a valid date (YYYY-MM-DD)`);
        }
      }

      if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`${field} must be an array`);
      }

      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors,
      });
    }

    next();
  };
}

module.exports = validate;
