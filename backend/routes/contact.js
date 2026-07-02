const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');

const router = express.Router();

const allowedReasons = new Set(['general', 'programs', 'partnership', 'volunteer', 'donate', 'media', 'other']);

const contactValidators = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required.')
    .isLength({ max: 100 })
    .withMessage('First name is too long.'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required.')
    .isLength({ max: 100 })
    .withMessage('Last name is too long.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Enter a valid email address.')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email is too long.'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phone number is too long.'),
  body('organisation')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organisation is too long.'),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Reason for contact is required.')
    .custom((value) => {
      if (!allowedReasons.has(value)) {
        throw new Error('Select a valid reason for contact.');
      }
      return true;
    }),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required.')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Message must be between 10 and 5000 characters.')
];

router.post('/', contactValidators, async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }

  const { firstName, lastName, email, phone, organisation, organization, subject, message } = req.body;
  const payload = {
    name: `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim(),
    email,
    phone: phone || null,
    organisation: organisation || organization || null,
    reason: subject,
    message
  };

  const { error } = await supabase.from('contact_messages').insert(payload);

  if (error) {
    console.error('Supabase contact insert failed:', error);
    return res.status(500).json({
      success: false,
      message: 'We could not send your message right now. Please try again shortly.'
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Message sent successfully. We will respond as soon as possible.'
  });
});

module.exports = router;
