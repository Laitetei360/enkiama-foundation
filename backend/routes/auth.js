const express = require('express');
        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');
        const { supabase } = require('../config/supabase');

        const router = express.Router();

        function signToken(user) {
          return jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
          );
        }

        function publicUser(user) {
          return {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role
          };
        }

        router.post('/register', async (req, res) => {
          try {
            const { firstName, lastName, email, password } = req.body;

            if (!firstName || !lastName || !email || !password || password.length < 6) {
              return res.status(400).json({ success: false, message: 'Provide first name, last name, valid email and a password with at least 6 characters.' });
            }

            const normalizedEmail = String(email).trim().toLowerCase();
            const { data: existing, error: lookupError } = await supabase
              .from('users')
              .select('id')
              .eq('email', normalizedEmail)
              .maybeSingle();

            if (lookupError) throw lookupError;
            if (existing) return res.status(400).json({ success: false, message: 'User already exists' });

            const passwordHash = await bcrypt.hash(password, 10);
            const { data: user, error } = await supabase
              .from('users')
              .insert({
                first_name: firstName,
                last_name: lastName,
                email: normalizedEmail,
                password_hash: passwordHash,
                role: 'user',
                is_verified: false
              })
              .select('id, first_name, last_name, email, role')
              .single();

            if (error) throw error;

            const token = signToken(user);
            return res.status(201).json({ success: true, token, user: publicUser(user) });
          } catch (error) {
            console.error('Supabase register failed:', error);
            return res.status(500).json({ success: false, message: 'Server error' });
          }
        });

        router.post('/login', async (req, res) => {
          try {
            const { email, password } = req.body;

            if (!email || !password) {
              return res.status(400).json({ success: false, message: 'Email and password are required.' });
            }

            const normalizedEmail = String(email).trim().toLowerCase();
            const { data: user, error } = await supabase
              .from('users')
              .select('id, first_name, last_name, email, password_hash, role')
              .eq('email', normalizedEmail)
              .maybeSingle();

            if (error) throw error;

            const isValidPassword = user ? await bcrypt.compare(password, user.password_hash) : false;
            if (!user || !isValidPassword) {
              return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const token = signToken(user);
            return res.json({ success: true, token, user: publicUser(user) });
          } catch (error) {
            console.error('Supabase login failed:', error);
            return res.status(500).json({ success: false, message: 'Server error' });
          }
        });

        module.exports = router;
