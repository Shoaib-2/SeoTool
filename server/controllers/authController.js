const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
  const { AuthenticationError, ValidationError, asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');

const authController = {
  // Register new user
  register: asyncHandler(async (req, res) => {
    const { email, password, name, website } = req.body;
    // logger.info('Registration attempt', { email, name }); // Disabled for cleaner output

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.warn('Registration failed - email already exists', { email });
      throw new ValidationError('Email already registered');
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      website
    });

    await user.save();
    // logger.info('User registered successfully', { userId: user._id, email: user.email }); // Disabled for cleaner output

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.tokenVersion);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        website: user.website,
        apiUsage: user.apiUsage
      }
    });
  }),

  // Login user
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    // logger.info('Login attempt', { email }); // Disabled for cleaner output

    // Find user with timeout
    const user = await User.findOne({ email: email.toLowerCase() }).maxTimeMS(5000);
    
    if (!user) {
      logger.warn('Login failed - user not found', { email });
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn('Login failed - invalid password', { email });
      throw new AuthenticationError('Invalid email or password');
    }

    // logger.info('Login successful', { userId: user._id, email: user.email }); // Disabled for cleaner output

    // Update last login and increment token version for security
    user.lastLogin = new Date();
    user.tokenVersion += 1;

    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.tokenVersion);
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        website: user.website,
        apiUsage: user.apiUsage
      }
    });
  }),

  // Refresh token endpoint
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Find user and verify refresh token
      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new tokens
      const tokens = generateTokens(user._id, user.tokenVersion);
      
      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      res.json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
  },

  // Logout user
  async logout(req, res) {
    try {
      const userId = req.userId;
      
      // Invalidate refresh token
      await User.findByIdAndUpdate(userId, {
        $unset: { refreshToken: 1 },
        $inc: { tokenVersion: 1 }
      });

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error logging out'
      });
    }
  },

  // Reset password
  async forgotPassword(req, res) {
    try {
      const { email, newPassword } = req.body;
      
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
  
      user.password = newPassword;
      user.tokenVersion += 1; // Invalidate all existing tokens
      user.refreshToken = undefined; // Clear refresh token
      await user.save();
      
      console.log('Password updated successfully for:', email);
  
      res.json({ 
        success: true,
        message: 'Password updated successfully' 
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error resetting password',
        error: error.message 
      });
    }
  }
};

module.exports = authController;