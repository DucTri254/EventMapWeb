'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { getUser, hasRole } from '@/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const user = getUser();
    if (!user || !hasRole('ADMIN')) {
      router.push('/login');
      return;
    }
    fetchUsers();
  }, [filters, pagination.page]);

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
    });

    const response = await api.get<{ users: User[]; pagination: any }>(`/api/admin/users?${params}`);
    setLoading(false);

    if (response.data) {
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } else {
      toast.error(response.error || 'Failed to load users');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    const response = await api.delete(`/api/admin/users/${selectedUser.id}`);
    if (response.error) {
      toast.error(response.error);
    } else {
      toast.success('User deleted successfully');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchUsers();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Quản lý tài khoản</h1>
          <div className="flex space-x-4">
            <Link
              href="/admin"
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Quản lí Sự Kiện
            </Link>
            <Link
              href="/admin/users"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light"
            >
              Quản lí tài khoản
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="EVENT_CREATOR">Event Creator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No users found</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                              {user.name[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                            className="text-green-600 hover:text-green-800"
                          >
                            chỉnh sửa
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(page) => setPagination({ ...pagination, page })}
            />
          </>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa tài khoản "${selectedUser?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedUser(null);
        }}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="red"
      />
    </div>
  );
}
