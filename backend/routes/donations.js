const express = require('express');
        const { body, validationResult } = require('express-validator');
        const { supabase } = require('../config/supabase');

        const router = express.Router();

        const allowedCurrencies = new Set(['KES', 'USD', 'EUR', 'GBP']);
        const allowedPaymentMethods = new Set(['mpesa', 'paypal', 'wise', 'card', 'bank']);

        const donationValidators = [
          body('name').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 200 }).withMessage('Full name is too long.'),
          body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail().isLength({ max: 254 }).withMessage('Email is too long.'),
          body('amount').isFloat({ min: 1 }).withMessage('Enter a valid donation amount.'),
          body('currency').trim().custom((value) => {
            if (!allowedCurrencies.has(value)) throw new Error('Select a valid currency.');
            return true;
          }),
          body('paymentMethod').trim().custom((value) => {
            if (!allowedPaymentMethods.has(value)) throw new Error('Select a valid payment method.');
            return true;
          })
        ];

        router.post('/', donationValidators, async (req, res) => {
          const errors = validationResult(req);

          if (!errors.isEmpty()) {
            return res.status(400).json({
              success: false,
              message: errors.array()[0].msg,
              errors: errors.array()
            });
          }

          const payload = {
            name: req.body.name,
            email: req.body.email,
            amount: Number(req.body.amount),
            currency: req.body.currency,
            payment_method: req.body.paymentMethod,
            payment_status: 'pending',
            anonymous: req.body.anonymous === true || req.body.anonymous === 'true',
            receipt_number: `ENK-${Date.now()}`
          };

          const { data, error } = await supabase
            .from('donations')
            .insert(payload)
            .select('id, receipt_number, created_at')
            .single();

          if (error) {
            console.error('Supabase donation insert failed:', error);
            return res.status(500).json({
              success: false,
              message: 'We could not start your donation right now. Please try again shortly.'
            });
          }

          return res.status(201).json({
            success: true,
            message: 'Donation initiated successfully.',
            donation: data
          });
        });

        module.exports = router;
