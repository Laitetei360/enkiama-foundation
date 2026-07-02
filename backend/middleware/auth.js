const jwt = require('jsonwebtoken');
        const { supabase } = require('../config/supabase');

        exports.protect = async (req, res, next) => {
          let token;

          if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
          }

          if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { data: user, error } = await supabase
              .from('users')
              .select('id, first_name, last_name, email, role')
              .eq('id', decoded.id)
              .maybeSingle();

            if (error || !user) return res.status(401).json({ success: false, message: 'Not authorized' });

            req.user = {
              id: user.id,
              firstName: user.first_name,
              lastName: user.last_name,
              email: user.email,
              role: user.role
            };
            return next();
          } catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
          }
        };

        exports.authorize = (...roles) => {
          return (req, res, next) => {
            if (!req.user || !roles.includes(req.user.role)) {
              return res.status(403).json({ success: false, message: 'Not authorized for this action' });
            }
            return next();
          };
        };
