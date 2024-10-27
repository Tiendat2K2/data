const jwt = require('jsonwebtoken');
// Middleware to verify token
const authMiddleware = (req, res, next) => {
    // Get token from the authorization header
    const token = req.headers['authorization']?.split(' ')[1];

    // Check if token exists
    if (!token) {
        return res.status(401).json({ message: 'Không có token' }); // No token provided
    }
    
    // Verify token
    jwt.verify(token, process.env.access_token, (err, decoded) => { // Ensure your secret key is set in environment variables
        if (err) {
            return res.status(403).json({ message: 'Token không hợp lệ' }); // Invalid token
        }
        // Store user information in req for later use
        req.user = decoded; // Store user info in req object
        next(); // Proceed to the next middleware or route
    });
};
module.exports = {
    authMiddleware,
};
