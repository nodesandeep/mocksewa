'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  return (
    <ProtectedRoute role="admin">
       <AdminDashboard />
    </ProtectedRoute>
  );
}
