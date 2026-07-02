const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed an admin user.');
  }

  if (password.length < 6) {
    throw new Error('ADMIN_PASSWORD must be at least 6 characters.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  const { data: existing, error: lookupError } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        role: 'admin',
        is_verified: true
      })
      .eq('id', existing.id);

    if (error) throw error;
    console.log(`Admin user updated: ${normalizedEmail}`);
    return;
  }

  const { error } = await supabase
    .from('users')
    .insert({
      first_name: 'Enkiama',
      last_name: 'Admin',
      email: normalizedEmail,
      password_hash: passwordHash,
      role: 'admin',
      is_verified: true
    });

  if (error) throw error;
  console.log(`Admin user created: ${normalizedEmail}`);
}

seedAdmin().catch((error) => {
  console.error('Admin seed failed:', error.message);
  process.exit(1);
});
