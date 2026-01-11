'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { getUser, hasRole } from '@/lib/auth';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  avatar?: string;
}

export default function InterestedUsersPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const user = getUser();
    if (!user || !hasRole('EVENT_CREATOR')) {
      router.push('/login');
      return;
    }
    fetchInterestedUsers();
  }, [pagination.page]);

  const fetchInterestedUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
    });

    const response = await api.get<{ users: User[]; pagination: any }>(`/api/events/${eventId}/interested?${params}`);
    setLoading(false);

    if (response.data) {
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } else {
      toast.error(response.error || 'Failed to load users');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Users Interested</h1>
          <button
            onClick={() => router.back()}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Back
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No users interested yet</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-4 p-4 border-b last:border-b-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white">
                        {user.name[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{user.name}</div>
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  );
}
