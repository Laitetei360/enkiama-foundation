const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { getCache, setCache, clearCache } = require('../lib/simpleCache');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are supported'));
    }
    cb(null, true);
  },
});

const TABLES = {
  volunteer_applications: {
    label: 'Volunteer Applications',
    search: ['first_name', 'last_name', 'email', 'skills', 'motivation', 'status'],
    status: true,
  },
  mentor_applications: {
    label: 'Mentor Applications',
    search: ['first_name', 'last_name', 'email', 'expertise', 'motivation', 'status'],
    status: true,
  },
  partnership_applications: {
    label: 'Partnership Applications',
    search: ['organisation', 'contact_person', 'email', 'partnership_type', 'message', 'status'],
    status: true,
  },
  sponsor_applications: {
    label: 'Sponsor Applications',
    search: ['first_name', 'last_name', 'email', 'sponsorship_type', 'message', 'status'],
    status: true,
  },
  donations: {
    label: 'Donations',
    search: ['first_name', 'last_name', 'email', 'donation_type', 'amount', 'status'],
    status: true,
  },
  contact_messages: {
    label: 'Contact Messages',
    search: ['name', 'email', 'phone', 'organisation', 'reason', 'message'],
    status: false,
  },
  newsletter_subscribers: {
    label: 'Newsletter Subscribers',
    search: ['email'],
    status: false,
  },
  story_submissions: {
    label: 'Story Submissions',
    search: ['name', 'email', 'title', 'story', 'status'],
    status: true,
  },
};

const SUMMARY = [
  ['volunteer_applications', 'Total volunteers'],
  ['mentor_applications', 'Total mentors'],
  ['partnership_applications', 'Total partners'],
  ['sponsor_applications', 'Total sponsors'],
  ['donations', 'Total donations'],
  ['contact_messages', 'Total contact messages'],
  ['newsletter_subscribers', 'Total newsletter subscribers'],
  ['story_submissions', 'Total story submissions'],
];

const STATUS_VALUES = ['new', 'pending', 'reviewed', 'approved', 'rejected', 'completed'];
const ADMIN_STATS_CACHE_TTL_MS = Number(process.env.ADMIN_STATS_CACHE_TTL_MS || 30000);
const ADMIN_ANALYTICS_CACHE_TTL_MS = Number(process.env.ADMIN_ANALYTICS_CACHE_TTL_MS || 20000);

function noStore(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '8h',
  });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    phone: user.phone || '',
    avatar: user.avatar || '',
    role: user.role,
    createdAt: user.created_at,
  };
}

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    return false;
  }
  return true;
}

function isAllowedTable(table) {
  return Boolean(TABLES[table]);
}

function normalizeSearch(value) {
  return (value || '').toString().trim().toLowerCase();
}

function matchesSearch(record, fields, search) {
  if (!search) return true;
  return fields.some((field) => String(record[field] || '').toLowerCase().includes(search));
}

function uploadPath(file) {
  const ext = (file.originalname.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `cms/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext || 'jpg'}`;
}

async function countRows(table, gteDate) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  if (gteDate) query = query.gte('created_at', gteDate.toISOString());
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

router.post(
  '/login',
  [body('email').isEmail().withMessage('Enter a valid email'), body('password').notEmpty().withMessage('Password is required')],
  async (req, res) => {
    if (!handleValidation(req, res)) return;

    const { email, password } = req.body;
    const { data: user, error } = await supabase
      .from('users')
      .select('id,email,password_hash,first_name,last_name,phone,avatar,role,created_at')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) return res.status(500).json({ success: false, message: 'Unable to sign in' });
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Admin access is required' });
    }

    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({ success: true, token: signToken(user), user: publicUser(user) });
  }
);

router.use(protect, authorize('admin'));

router.get('/me', (req, res) => {
  noStore(res);
  res.json({ success: true, user: publicUser(req.user) });
});

router.get('/profile', async (req, res) => {
  noStore(res);
  const { data: user, error } = await supabase
    .from('users')
    .select('id,email,first_name,last_name,phone,avatar,role,created_at')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error || !user) {
    return res.status(404).json({ success: false, message: 'Admin profile was not found' });
  }

  res.json({ success: true, profile: publicUser(user) });
});

router.put(
  '/profile',
  [
    body('firstName').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('First name is too long'),
    body('lastName').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('Last name is too long'),
    body('email').isEmail().withMessage('Enter a valid email'),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 40 }).withMessage('Phone is too long'),
    body('avatar').optional({ checkFalsy: true }).isURL().withMessage('Avatar must be a valid image URL'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;

    const email = req.body.email.toLowerCase();
    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', req.user.id)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ success: false, message: 'Could not validate email address' });
    }
    if (existing) {
      return res.status(409).json({ success: false, message: 'That email is already in use' });
    }

    const updates = {
      first_name: req.body.firstName || '',
      last_name: req.body.lastName || '',
      email,
      phone: req.body.phone || '',
      avatar: req.body.avatar || '',
    };

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id,email,first_name,last_name,phone,avatar,role,created_at')
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: 'Could not update profile' });
    }

    res.json({ success: true, profile: publicUser(user), token: signToken(user) });
  }
);

router.put(
  '/profile/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;

    const { data: user, error } = await supabase
      .from('users')
      .select('id,email,password_hash,first_name,last_name,phone,avatar,role,created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'Admin profile was not found' });
    }

    const matches = await bcrypt.compare(req.body.currentPassword, user.password_hash || '');
    if (!matches) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
    const { error: updateError } = await supabase.from('users').update({ password_hash: passwordHash }).eq('id', req.user.id);

    if (updateError) {
      return res.status(500).json({ success: false, message: 'Could not update password' });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  }
);

router.get('/stats', async (req, res) => {
  const cached = getCache('admin:stats');
  if (cached) {
    res.set('Cache-Control', 'private, max-age=15');
    res.set('X-Admin-Stats-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const cards = await Promise.all(
      SUMMARY.map(async ([table, label]) => {
        const count = await countRows(table);
        return { table, label, count };
      })
    );
    const payload = { success: true, cards };
    setCache('admin:stats', payload, ADMIN_STATS_CACHE_TTL_MS);
    res.set('Cache-Control', 'private, max-age=15');
    res.set('X-Admin-Stats-Cache', 'MISS');
    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load dashboard statistics' });
  }
});

router.get('/analytics/visits', async (req, res) => {
  const cached = getCache('admin:analytics');
  if (cached) {
    res.set('Cache-Control', 'private, max-age=15');
    res.set('X-Admin-Analytics-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const week = new Date(today);
    week.setDate(week.getDate() - 6);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalVisits, visitsToday, visitsThisWeek, visitsThisMonth, recentResult, pageRowsResult] = await Promise.all([
      countRows('site_visits'),
      countRows('site_visits', today),
      countRows('site_visits', week),
      countRows('site_visits', month),
      supabase.from('site_visits').select('id,page,path,referrer,user_agent,created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('site_visits').select('page,path,created_at').order('created_at', { ascending: false }).limit(5000),
    ]);

    if (recentResult.error) throw recentResult.error;
    if (pageRowsResult.error) throw pageRowsResult.error;

    const pageMap = new Map();
    (pageRowsResult.data || []).forEach((visit) => {
      const key = visit.page || visit.path || 'unknown';
      const current = pageMap.get(key) || { page: key, path: visit.path || '', count: 0 };
      current.count += 1;
      if (!current.path && visit.path) current.path = visit.path;
      pageMap.set(key, current);
    });

    const pageViews = Array.from(pageMap.values()).sort((a, b) => b.count - a.count).slice(0, 12);

    const payload = {
      success: true,
      summary: {
        totalVisits,
        visitsToday,
        visitsThisWeek,
        visitsThisMonth,
      },
      pageViews,
      recent: recentResult.data || [],
    };
    setCache('admin:analytics', payload, ADMIN_ANALYTICS_CACHE_TTL_MS);
    res.set('Cache-Control', 'private, max-age=15');
    res.set('X-Admin-Analytics-Cache', 'MISS');
    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load visitor analytics' });
  }
});

router.get('/tables', (req, res) => {
  noStore(res);
  res.json({
    success: true,
    tables: Object.entries(TABLES).map(([name, config]) => ({
      name,
      label: config.label,
      hasStatus: config.status,
    })),
  });
});

router.get('/records/:table', async (req, res) => {
  noStore(res);
  const { table } = req.params;
  if (!isAllowedTable(table)) {
    return res.status(404).json({ success: false, message: 'Unknown table' });
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 250);
  const search = normalizeSearch(req.query.search);

  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(limit);

  if (error) {
    return res.status(500).json({ success: false, message: `Unable to load ${TABLES[table].label}` });
  }

  const records = (data || []).filter((record) => matchesSearch(record, TABLES[table].search, search));
  res.json({ success: true, records, hasStatus: TABLES[table].status, table: TABLES[table].label });
});

router.patch(
  '/records/:table/:id/status',
  [body('status').isIn(STATUS_VALUES).withMessage('Invalid status')],
  async (req, res) => {
    if (!handleValidation(req, res)) return;

    const { table, id } = req.params;
    if (!isAllowedTable(table) || !TABLES[table].status) {
      return res.status(404).json({ success: false, message: 'Status updates are not available for this table' });
    }

    const { data, error } = await supabase.from(table).update({ status: req.body.status }).eq('id', id).select('*').single();

    if (error) {
      return res.status(500).json({ success: false, message: 'Unable to update status' });
    }

    res.json({ success: true, record: data });
  }
);

router.delete('/records/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  if (!isAllowedTable(table)) {
    return res.status(404).json({ success: false, message: 'Unknown table' });
  }

  const { error } = await supabase.from(table).delete().eq('id', id);
  clearCache('admin:stats');
  if (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete record' });
  }

  res.json({ success: true });
});

router.get('/site-content', async (req, res) => {
  noStore(res);
  let query = supabase.from('site_content').select('*').order('page').order('section').order('content_key');
  if (req.query.page) query = query.eq('page', req.query.page);

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ success: false, message: 'Unable to load website content' });
  }

  res.json({ success: true, content: data || [] });
});

router.post(
  '/site-content',
  [
    body('page').trim().notEmpty().withMessage('Page is required'),
    body('section').trim().notEmpty().withMessage('Section is required'),
    body('content_key').trim().notEmpty().withMessage('Content key is required'),
    body('content_value').exists().withMessage('Content value is required'),
    body('content_type').optional().isIn(['text', 'textarea', 'long_text', 'image', 'image_url', 'url', 'number', 'json']).withMessage('Unsupported content type'),
  ],
  async (req, res) => {
    if (!handleValidation(req, res)) return;

    const contentTypeMap = {
      textarea: 'long_text',
      image: 'image_url',
    };
    const payload = {
      page: req.body.page,
      section: req.body.section,
      content_key: req.body.content_key,
      content_value: String(req.body.content_value || ''),
      content_type: contentTypeMap[req.body.content_type] || req.body.content_type || 'text',
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from('site_content')
      .select('id')
      .eq('content_key', payload.content_key)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ success: false, message: 'Unable to validate content key' });
    }

    const query = existing
      ? supabase.from('site_content').update(payload).eq('id', existing.id).select('*').single()
      : supabase.from('site_content').insert(payload).select('*').single();

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, message: 'Unable to save content' });
    }

    clearCache('cms:');
    noStore(res);
    res.json({ success: true, content: data });
  }
);

router.delete('/site-content/:id', async (req, res) => {
  const { error } = await supabase.from('site_content').delete().eq('id', req.params.id);
  clearCache('cms:');
  if (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete content' });
  }
  res.json({ success: true });
});

router.post('/site-assets', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Image file is required' });
  }

  const path = uploadPath(req.file);
  const { error } = await supabase.storage.from('site-assets').upload(path, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false,
  });

  if (error) {
    return res.status(500).json({ success: false, message: 'Unable to upload image' });
  }

  const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
  res.status(201).json({ success: true, url: data.publicUrl, path });
});

module.exports = router;
