const express = require('express');
const { supabase } = require('../config/supabase');
const { getCache, setCache } = require('../lib/simpleCache');

const router = express.Router();
const CMS_CACHE_TTL_MS = Number(process.env.CMS_CACHE_TTL_MS || 30000);

function cacheHeaders(res, hit = false) {
  res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
  res.set('X-CMS-Cache', hit ? 'HIT' : 'MISS');
}

function parsePages(req) {
  const page = String(req.query.page || '').trim();
  const pages = String(req.query.pages || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(page ? [page] : pages));
  return unique.filter((item) => /^[a-z0-9_-]+$/i.test(item)).slice(0, 8);
}

router.get('/site-content', async (req, res) => {
  const pages = parsePages(req);
  const cacheKey = `cms:${pages.length ? pages.slice().sort().join('|') : 'all'}`;
  const cached = getCache(cacheKey);
  if (cached) {
    cacheHeaders(res, true);
    return res.json(cached);
  }

  let query = supabase
    .from('site_content')
    .select('page,section,content_key,content_value,content_type,updated_at')
    .order('page')
    .order('section')
    .order('content_key');

  if (pages.length === 1) {
    query = query.eq('page', pages[0]);
  } else if (pages.length > 1) {
    query = query.in('page', pages);
  } else {
    query = query.limit(500);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ success: false, message: 'Unable to load website content' });
  }

  const payload = { success: true, content: data || [] };
  setCache(cacheKey, payload, CMS_CACHE_TTL_MS);
  cacheHeaders(res, false);
  res.json(payload);
});

module.exports = router;
