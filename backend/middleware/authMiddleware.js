const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Authorization header se token nikalna
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: "Access denied" });

  // "Bearer <token>" format mein se sirf token nikalna
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid token" });
  }
};

module.exports = authMiddleware;