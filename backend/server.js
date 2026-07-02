const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const dotenv = require('dotenv');

// Load root .env.local first for Supabase-style public variables, then backend env files.
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const storyRoutes = require('./routes/stories');
const donationRoutes = require('./routes/donations');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const adminRoutes = require('./routes/admin');
const cmsRoutes = require('./routes/cms');
const analyticsRoutes = require('./routes/analytics');

const app = express();

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://images.pexels.com", "https://dzlbkjtnwdqentelbnwh.supabase.co"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'self'", "https://maps.google.com"]
        }
    }
}));
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

function isLocalRequest(req) {
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || req.hostname === 'localhost';
}

const localSkip = (req) => isLocalRequest(req);
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.ADMIN_RATE_LIMIT_MAX || 1200),
    standardHeaders: true,
    legacyHeaders: false,
    skip: localSkip
});
const cmsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.CMS_RATE_LIMIT_MAX || 240),
    standardHeaders: true,
    legacyHeaders: false,
    skip: localSkip
});
const analyticsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.ANALYTICS_RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false,
    skip: localSkip
});
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.API_RATE_LIMIT_MAX || 600),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => localSkip(req) || req.originalUrl.startsWith('/api/admin') || req.originalUrl.startsWith('/api/cms') || req.originalUrl.startsWith('/api/analytics/visit')
});

app.use('/api/admin', adminLimiter);
app.use('/api/cms', cmsLimiter);
app.use('/api/analytics/visit', analyticsLimiter);
app.use('/api/', apiLimiter);

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Enkiama API is running' }));

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} with Supabase backend storage`));
