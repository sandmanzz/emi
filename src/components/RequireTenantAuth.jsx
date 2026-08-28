import { Navigate, useLocation } from 'react-router-dom';
import { isTenantAuthed } from '../lib/tenantAuth';

export default function RequireTenantAuth({ children }) {
  const location = useLocation();
  if (!isTenantAuthed()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
