import { invalid } from './errors.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Detects attempts to exchange contact details inside free text.
export function containsContactInfo(text) {
  const s = String(text || '');
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(s)) return true;
  if (/https?:\/\/|www\./i.test(s)) return true;
  if (/\b(whatsapp|telegram|viber|call me|email me|my number|my phone)\b/i.test(s)) return true;
  const runs = s.match(/\+?\d[\d\s\-().]{6,}\d/g) || [];
  return runs.some((r) => r.replace(/\D/g, '').length >= 9);
}

/**
 * Tiny schema validator.
 * rule: { type: string|int|number|enum|email|phone|date|boolean, required, min, max, minLen, maxLen, values, label, noContact, default }
 */
export function validate(input, schema, { partial = false } = {}) {
  const errors = {};
  const out = {};
  const src = input && typeof input === 'object' ? input : {};
  for (const [key, rule] of Object.entries(schema)) {
    const label = rule.label || key;
    let v = src[key];
    const empty = v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    if (empty) {
      if (partial) { if (src[key] !== undefined && rule.required) errors[key] = `${label} is required`; continue; }
      if (rule.required) errors[key] = `${label} is required`;
      else if (rule.default !== undefined) out[key] = rule.default;
      continue;
    }
    switch (rule.type || 'string') {
      case 'string':
      case 'email':
      case 'phone': {
        if (typeof v !== 'string') { errors[key] = `${label} must be text`; break; }
        v = v.trim();
        if (rule.type === 'email' && !EMAIL.test(v)) { errors[key] = `${label} must be a valid email`; break; }
        if (rule.type === 'phone' && !/^\+?[\d\s\-()]{7,20}$/.test(v)) { errors[key] = `${label} must be a valid phone number`; break; }
        if (rule.minLen && v.length < rule.minLen) { errors[key] = `${label} must be at least ${rule.minLen} characters`; break; }
        if (v.length > (rule.maxLen || 500)) { errors[key] = `${label} must be at most ${rule.maxLen || 500} characters`; break; }
        if (rule.noContact && containsContactInfo(v)) { errors[key] = `${label} must not contain phone numbers, emails or links. Use the platform to communicate.`; break; }
        out[key] = rule.type === 'email' ? v.toLowerCase() : v;
        break;
      }
      case 'int':
      case 'number': {
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n)) { errors[key] = `${label} must be a number`; break; }
        if (rule.type === 'int' && !Number.isInteger(n)) { errors[key] = `${label} must be a whole number`; break; }
        if (rule.min !== undefined && n < rule.min) { errors[key] = `${label} must be at least ${rule.min}`; break; }
        if (rule.max !== undefined && n > rule.max) { errors[key] = `${label} must be at most ${rule.max}`; break; }
        out[key] = n;
        break;
      }
      case 'enum':
        if (!rule.values.includes(v)) errors[key] = `${label} must be one of: ${rule.values.join(', ')}`;
        else out[key] = v;
        break;
      case 'boolean':
        out[key] = v === true || v === 'true';
        break;
      case 'date': {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) errors[key] = `${label} must be a valid date`;
        else out[key] = String(v).slice(0, 10);
        break;
      }
      default:
        errors[key] = `${label} has an unsupported type`;
    }
  }
  if (Object.keys(errors).length) throw invalid(errors);
  return out;
}
