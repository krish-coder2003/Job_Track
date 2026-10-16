import { Navigate, useLocation, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../common/LoadingIndicator';

/**
 * Route guard that redirects already-authenticated users away from auth pages (login/register).
 */
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader message="Checking authentication..." />;
  }

  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return children ? children : <Outlet />;
}

PublicOnlyRoute.propTypes = {
  children: PropTypes.node,
};
