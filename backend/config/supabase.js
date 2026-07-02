const path = require('path');
        const dotenv = require('dotenv');
        const { createClient } = require('@supabase/supabase-js');

        dotenv.config({ path: path.join(__dirname, '../.env.local') });
        dotenv.config({ path: path.join(__dirname, '../.env') });
        dotenv.config({ path: path.join(__dirname, '../../.env.local') });

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl) {
          throw new Error('Missing SUPABASE_URL in backend environment variables.');
        }

        if (!supabaseServiceRoleKey || supabaseServiceRoleKey === 'PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE') {
          throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in backend environment variables.');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false
          }
        });

        module.exports = { supabase };
