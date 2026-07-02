const express = require('express');
        const { body, validationResult } = require('express-validator');
        const { supabase } = require('../config/supabase');

        const router = express.Router();

        const allowedCurrencies = new Set(['KES', 'USD', 'EUR', 'GBP']);
        const allowedPaymentMethods = new Set(['mpesa', 'paypal', 'wise', 'card', 'bank']);

        function sendValidationErrors(req, res) {
          const errors = validationResult(req);
          if (errors.isEmpty()) return false;

          res.status(400).json({
            success: false,
            message: errors.array()[0].msg,
            errors: errors.array()
          });
          return true;
        }

        function textOrNull(value) {
          if (typeof value !== 'string') return value ?? null;
          const trimmed = value.trim();
          return trimmed ? trimmed : null;
        }

        async function insertApplication(table, payload, res, message) {
          const { data, error } = await supabase
            .from(table)
            .insert(payload)
            .select('id, created_at')
            .single();

          if (error) {
            console.error(`Supabase insert failed for ${table}:`, error);
            return res.status(500).json({
              success: false,
              message: 'We could not submit your application right now. Please try again shortly.'
            });
          }

          return res.status(201).json({
            success: true,
            message,
            application: data
          });
        }

        const personValidators = [
          body('firstName').trim().notEmpty().withMessage('First name is required.').isLength({ max: 100 }).withMessage('First name is too long.'),
          body('lastName').trim().notEmpty().withMessage('Last name is required.').isLength({ max: 100 }).withMessage('Last name is too long.'),
          body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail().isLength({ max: 254 }).withMessage('Email is too long.')
        ];

        const volunteerValidators = [
          ...personValidators,
          body('phone').trim().notEmpty().withMessage('Phone number is required.').isLength({ max: 50 }).withMessage('Phone number is too long.'),
          body('availability').trim().notEmpty().withMessage('Availability is required.').isLength({ max: 250 }).withMessage('Availability is too long.'),
          body('motivation').trim().notEmpty().withMessage('Motivation is required.').isLength({ min: 10, max: 5000 }).withMessage('Motivation must be between 10 and 5000 characters.')
        ];

        const partnershipValidators = [
          ...personValidators,
          body('organization').trim().notEmpty().withMessage('Organization is required.').isLength({ max: 200 }).withMessage('Organization is too long.'),
          body('partnershipType').trim().notEmpty().withMessage('Partnership type is required.').isLength({ max: 120 }).withMessage('Partnership type is too long.'),
          body('partnershipIdea').trim().notEmpty().withMessage('Partnership idea is required.').isLength({ min: 10, max: 5000 }).withMessage('Partnership idea must be between 10 and 5000 characters.')
        ];

        const programValidators = [
          ...personValidators,
          body('phone').trim().notEmpty().withMessage('Phone number is required.').isLength({ max: 50 }).withMessage('Phone number is too long.'),
          body('age').isInt({ min: 16, max: 35 }).withMessage('Age must be between 16 and 35.'),
          body('programName').trim().notEmpty().withMessage('Program is required.').isLength({ max: 160 }).withMessage('Program name is too long.'),
          body('goals').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }).withMessage('Goals are too long.')
        ];

        const sponsorValidators = [
          body('name').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 200 }).withMessage('Full name is too long.'),
          body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail().isLength({ max: 254 }).withMessage('Email is too long.'),
          body('amount').isFloat({ min: 1 }).withMessage('Enter a valid sponsorship amount.'),
          body('currency').trim().custom((value) => {
            if (!allowedCurrencies.has(value)) throw new Error('Select a valid currency.');
            return true;
          }),
          body('paymentMethod').trim().custom((value) => {
            if (!allowedPaymentMethods.has(value)) throw new Error('Select a valid payment method.');
            return true;
          })
        ];

        router.post('/volunteer', volunteerValidators, async (req, res) => {
          if (sendValidationErrors(req, res)) return;

          const payload = {
            first_name: req.body.firstName,
            last_name: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            availability: req.body.availability,
            motivation: req.body.motivation,
            status: 'pending'
          };

          return insertApplication('volunteer_applications', payload, res, 'Volunteer application submitted successfully.');
        });

        router.post('/mentor', volunteerValidators, async (req, res) => {
          if (sendValidationErrors(req, res)) return;

          const payload = {
            first_name: req.body.firstName,
            last_name: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            availability: req.body.availability,
            motivation: req.body.motivation,
            status: 'pending'
          };

          return insertApplication('mentor_applications', payload, res, 'Mentor application submitted successfully.');
        });

        router.post('/partnership', partnershipValidators, async (req, res) => {
          if (sendValidationErrors(req, res)) return;

          const payload = {
            first_name: req.body.firstName,
            last_name: req.body.lastName,
            email: req.body.email,
            organization: req.body.organization,
            partnership_type: req.body.partnershipType,
            partnership_idea: req.body.partnershipIdea,
            status: 'pending'
          };

          return insertApplication('partnership_applications', payload, res, 'Partnership application submitted successfully.');
        });

        router.post('/program', programValidators, async (req, res) => {
          if (sendValidationErrors(req, res)) return;

          const payload = {
            first_name: req.body.firstName,
            last_name: req.body.lastName,
            email: req.body.email,
            phone: req.body.phone,
            age: Number(req.body.age),
            program_name: req.body.programName,
            goals: textOrNull(req.body.goals),
            status: 'pending'
          };

          return insertApplication('program_applications', payload, res, 'Program application submitted successfully.');
        });

        router.post('/sponsor', sponsorValidators, async (req, res) => {
          if (sendValidationErrors(req, res)) return;

          const payload = {
            name: req.body.name,
            email: req.body.email,
            amount: Number(req.body.amount),
            currency: req.body.currency,
            payment_method: req.body.paymentMethod,
            status: 'pending',
            receipt_number: `SPN-${Date.now()}`
          };

          return insertApplication('sponsor_applications', payload, res, 'Student sponsorship submitted successfully.');
        });

        module.exports = router;
