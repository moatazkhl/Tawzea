import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { auth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (auth.isAuthenticated && requiredRole && auth.role !== requiredRole && auth.role !== 'admin') {
      toast.error('ليس لديك صلاحية الوصول لهذه الصفحة. يرجى تسجيل الدخول بحساب مسؤول.');
    }
  }, [auth, requiredRole]);

  if (!auth.isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && auth.role !== requiredRole && auth.role !== 'admin') {
    // Admin can access everything, otherwise check for role match
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
