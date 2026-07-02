const express = require('express');
        const { body, validationResult } = require('express-validator');
        const { supabase } = require('../config/supabase');

        const router = express.Router();
        const allowedCategories = new Set(['education', 'technology', 'heritage', 'women', 'community']);

        router.get('/', async (req, res) => {
          const { data, error } = await supabase
            .from('story_submissions')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Supabase story fetch failed:', error);
            return res.status(500).json({ success: false, message: 'Server error' });
          }

          return res.json({ success: true, stories: data });
        });

        const storyValidators = [
          body('title').trim().notEmpty().withMessage('Story title is required.').isLength({ max: 200 }).withMessage('Story title is too long.'),
          body('content').trim().notEmpty().withMessage('Story content is required.').isLength({ min: 10, max: 10000 }).withMessage('Story content must be between 10 and 10000 characters.'),
          body('category').trim().custom((value) => {
            if (!allowedCategories.has(value)) throw new Error('Select a valid story category.');
            return true;
          })
        ];

        router.post('/', storyValidators, async (req, res) => {
          const errors = validationResult(req);

          if (!errors.isEmpty()) {
            return res.status(400).json({
              success: false,
              message: errors.array()[0].msg,
              errors: errors.array()
            });
          }

          const payload = {
            title: req.body.title,
            content: req.body.content,
            author_name: req.body.author?.name || req.body['author.name'] || null,
            author_email: req.body.author?.email || req.body['author.email'] || null,
            author_location: req.body.author?.location || req.body['author.location'] || null,
            category: req.body.category,
            status: 'pending',
            views: 0,
            likes: 0
          };

          const { data, error } = await supabase
            .from('story_submissions')
            .insert(payload)
            .select('id, created_at')
            .single();

          if (error) {
            console.error('Supabase story insert failed:', error);
            return res.status(500).json({ success: false, message: 'We could not submit your story right now. Please try again shortly.' });
          }

          return res.status(201).json({ success: true, message: 'Story submitted for review.', story: data });
        });

        module.exports = router;
