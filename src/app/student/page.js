'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import StudentHub from '@/components/StudentHub';

export default function StudentPage() {
  return (
    <ProtectedRoute role="student">
      <StudentHub />
    </ProtectedRoute>
  );
}
