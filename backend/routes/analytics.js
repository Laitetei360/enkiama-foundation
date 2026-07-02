const crypto = require('crypto');
const express = require('express');
const { supabase } = require('../config/supabase');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const recentVisits = new Map();
const VISIT_DEDUPE_MS = Number(process.env.ANALYTICS_DEDUPE_MS || 30000);

function trim(value, max = 500) {
  return String(value || '').slice(0, max);
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
}

function hashIp(req) {
  const ip = clientIp(req);
  if (!ip) return '';
  const salt = process.env.ANALYTICS_IP_HASH_SALT || process.env.JWT_SECRET || 'enkiama-foundation';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

function recentlyTracked(key) {
  const now = Date.now();
  for (const [storedKey, expiresAt] of recentVisits.entries()) {
    if (expiresAt <= now) recentVisits.delete(storedKey);
  }
  const expiresAt = recentVisits.get(key);
  if (expiresAt && expiresAt > now) return true;
  recentVisits.set(key, now + VISIT_DEDUPE_MS);
  return false;
}

router.post('/visit', async (req, res) => {
  const payload = {
    page: trim(req.body.page || 'unknown', 120),
    path: trim(req.body.path || req.originalUrl || '/', 500),
    referrer: trim(req.body.referrer || req.get('referer') || '', 500),
    user_agent: trim(req.body.user_agent || req.body.userAgent || req.get('user-agent') || '', 600),
    ip_hash: hashIp(req),
  };

  const visitKey = `${payload.ip_hash}:${payload.path}:${payload.user_agent}`;
  if (recentlyTracked(visitKey)) {
    return res.status(202).json({ success: true, duplicate: true });
  }

  const { error } = await supabase.from('site_visits').insert(payload);
  if (error) {
    return res.status(500).json({ success: false, message: 'Unable to record visit' });
  }

  res.status(201).json({ success: true });
});

router.get('/visits', protect, authorize('admin'), async (req, res) => {
  res.set('Cache-Control', 'private, max-age=15');
  const { data, error } = await supabase
    .from('site_visits')
    .select('id,page,path,referrer,user_agent,created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return res.status(500).json({ success: false, message: 'Unable to load visits' });
  }

  res.json({ success: true, visits: data || [] });
});

module.exports = router;
