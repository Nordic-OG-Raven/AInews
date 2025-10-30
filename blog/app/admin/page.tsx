import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_session');
  
  if (!adminToken) return false;
  
  // Simple token validation (in production, use proper JWT)
  return adminToken.value === process.env.ADMIN_PASSWORD;
}

export default async function AdminPage() {
  const isAuthenticated = await checkAuth();
  
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <h1 className="text-3xl font-bold mb-8 text-center">Admin Login</h1>
        <AdminLoginForm />
      </div>
    );
  }
  
  return <AdminDashboard />;
}

