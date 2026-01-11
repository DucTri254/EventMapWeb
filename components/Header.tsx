'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, logout, hasRole } from '@/lib/auth';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    if (currentUser) {
      fetchNotifications();
    }
  }, []);

  const fetchNotifications = async () => {
    const response = await api.get<{ notifications: Notification[]; unreadCount: number }>('/api/notifications?limit=10');
    if (response.data) {
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await api.put(`/api/notifications/${notification.id}/read`);
      fetchNotifications();
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setShowNotifications(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/home?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/home" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              📍
            </div>
            <span className="text-xl font-bold">Event Map</span>
          </Link>

          <form onSubmit={handleSearch} className="flex items-center">
            <input
              type="text"
              placeholder="Search here..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 rounded-l-lg text-gray-800 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-primary px-4 py-2 rounded-r-lg hover:bg-primary-light"
            >
              🔍
            </button>
          </form>
        </div>

        <div className="flex items-center space-x-4">
          {hasRole('EVENT_CREATOR') && (
            <Link
              href="/creator/events/create"
              className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Tạo Sự Kiện</span>
            </Link>
          )}

          {user && (
            <>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-gray-700 rounded-lg"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white text-gray-800 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b">
                      <h3 className="font-bold">Notifications</h3>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No notifications</div>
                    ) : (
                      <div>
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${
                              !notif.isRead ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="font-semibold">{notif.title}</div>
                            <div className="text-sm text-gray-600">{notif.message}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(notif.createdAt).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-lg"
                >
                  <span>👤</span>
                  <span>{user.name}</span>
                  <span>▼</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-lg z-50">
                    {hasRole('ADMIN') ? (
                      <>
                        <Link
                          href="/admin"
                          className={`block px-4 py-2 hover:bg-gray-100 ${isActive('/admin') ? 'bg-primary text-white' : ''}`}
                        >
                          Trang chủ
                        </Link>
                        <Link
                          href="/admin/users"
                          className="block px-4 py-2 hover:bg-gray-100"
                        >
                          Quản lí tài khoản
                        </Link>
                        <Link
                          href="/admin/events"
                          className="block px-4 py-2 hover:bg-gray-100"
                        >
                          Quản lí Sự Kiện
                        </Link>
                      </>
                    ) : hasRole('EVENT_CREATOR') ? (
                      <>
                        <Link
                          href="/creator"
                          className={`block px-4 py-2 hover:bg-gray-100 ${isActive('/creator') ? 'bg-primary text-white' : ''}`}
                        >
                          Trang chủ
                        </Link>
                        <Link
                          href="/creator/profile"
                          className="block px-4 py-2 hover:bg-gray-100"
                        >
                          Trang cá nhân
                        </Link>
                        <Link
                          href="/creator/events"
                          className="block px-4 py-2 hover:bg-gray-100"
                        >
                          Sự kiện của tôi
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/home"
                          className={`block px-4 py-2 hover:bg-gray-100 ${isActive('/home') ? 'bg-primary text-white' : ''}`}
                        >
                          Trang chủ
                        </Link>
                        <Link
                          href="/profile"
                          className="block px-4 py-2 hover:bg-gray-100"
                        >
                          Trang cá nhân
                        </Link>
                        <Link
                          href="/favorites"
                          className="block px-4 py-2 hover:bg-gray-100"
                        >
                          Sự kiện yêu thích
                        </Link>
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!user && (
            <Link
              href="/login"
              className="bg-primary px-4 py-2 rounded-lg hover:bg-primary-light"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
