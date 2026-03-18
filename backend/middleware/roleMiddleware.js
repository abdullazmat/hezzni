const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied: No role assigned" });
    }

    const { role } = req.user;
    
    // Convert allowedRoles to array if it's a single string
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    const isSuperAdmin = role.toLowerCase() === "super admin";
    
    // Check if the user's role is in the allowedRoles list
    // We do a case-insensitive check and allow Super Admin to bypass
    const isAllowed = isSuperAdmin || roles.some(
      (r) => r.toLowerCase() === role.toLowerCase()
    );

    if (isAllowed) {
      next();
    } else {
      res.status(403).json({ 
        message: `Permission denied: ${role} does not have access to this action` 
      });
    }
  };
};

module.exports = { checkRole };
