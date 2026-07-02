const express = require('express');
        const { body, validationResult } = require('express-validator');
        const { supabase } = require('../config/supabase');

        const router = express.Router();

        router.post('/subscribe', [
          body('name').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Name is too long.'),
          body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail().isLength({ max: 254 }).withMessage('Email is too long.')
        ], async (req, res) => {
          const errors = validationResult(req);

          if (!errors.isEmpty()) {
            return res.status(400).json({
              success: false,
              message: errors.array()[0].msg,
              errors: errors.array()
            });
          }

          const email = req.body.email;
          const { data: existing, error: lookupError } = await supabase
            .from('newsletter_subscribers')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (lookupError) {
            console.error('Supabase newsletter lookup failed:', lookupError);
            return res.status(500).json({ success: false, message: 'Server error' });
          }

          if (existing) return res.status(400).json({ success: false, message: 'Already subscribed' });

          const { error } = await supabase
            .from('newsletter_subscribers')
            .insert({
              name: req.body.name || null,
              email,
              subscribed: true
            });

          if (error) {
            console.error('Supabase newsletter insert failed:', error);
            return res.status(500).json({ success: false, message: 'We could not subscribe you right now. Please try again shortly.' });
          }

          return res.status(201).json({ success: true, message: 'Subscribed successfully' });
        });

        module.exports = router;
