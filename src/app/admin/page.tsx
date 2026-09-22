'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  UserPlus,
  KeyRound,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Mail,
  X,
  ArrowRight,
  Shield,
  UserCheck,
} from 'lucide-react';
import { AppUser, UserRole } from '@/types/database';
import { authStore } from '@/lib/auth/auth-store';
import { activityLogService } from '@/lib/services/activity-log-service';
import { useToast } from '@/components/ui/Toast';

export default function AdminManagementPage() {
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);

  // Form states for Create User
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('STAFF');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form state for Reset Password
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');

  // 1. Check current authenticated user and RBAC
  useEffect(() => {
    const user = authStore.getCurrentUser();
    setCurrentUser(user);
    const unsub = authStore.subscribe((u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // 2. Fetch users list
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await authStore.getUsers();
      setUsers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      loadUsers();
    }
  }, [currentUser, loadUsers]);

  // RBAC ACCESS DENIED SCREEN
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-rose-100 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-black tracking-widest text-rose-600 uppercase">
              LỖI 403 - TRUY CẬP BỊ TỪ CHỐI
            </span>
            <h2 className="text-xl font-black text-slate-900">
              Khu Vực Quản Trị Hệ Thống
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Trang này chỉ dành riêng cho tài khoản có vai trò <strong>QUẢN TRỊ VIÊN (ADMIN)</strong>.
            Tài khoản hiện tại của bạn không có đủ thẩm quyền để xem và quản lý danh sách người dùng.
          </p>
          <div className="pt-2">
            <Link
              href="/customers"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#1B6C39] hover:bg-[#15592e] text-white font-bold rounded-xl shadow transition-all text-sm"
            >
              <span>Quay về Quản lý Khách hàng</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle Role Change
  const handleRoleChange = async (user: AppUser, nextRole: UserRole) => {
    if (user.role === nextRole) return;

    if (
      !window.confirm(
        `Bạn có chắc muốn đổi quyền của tài khoản ${user.name} (@${user.username}) thành ${
          nextRole === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN THU NGÂN'
        }?`
      )
    ) {
      return;
    }

    const res = await authStore.updateUserRole(user.id, nextRole);
    if (res.success) {
      await activityLogService.logActivity(
        'USER_UPDATE_ROLE',
        'AUTH',
        user.id,
        `Quản trị viên đã đổi vai trò của ${user.name} (@${user.username}) từ ${user.role} sang ${nextRole}`,
        { targetUsername: user.username, oldRole: user.role, newRole: nextRole }
      );
      success('Phân quyền thành công', `Đã cập nhật vai trò ${nextRole} cho ${user.name}`);
      loadUsers();
    } else {
      toastError('Không thể phân quyền', res.error || 'Có lỗi xảy ra');
    }
  };

  // Handle Status Toggle (Lock / Unlock)
  const handleStatusToggle = async (user: AppUser) => {
    const nextStatus = !user.is_active;
    const actionText = nextStatus ? 'Mở khóa' : 'Khóa';

    if (
      !window.confirm(
        `Bạn có chắc muốn ${actionText.toLowerCase()} tài khoản ${user.name} (@${user.username})?`
      )
    ) {
      return;
    }

    const res = await authStore.toggleUserStatus(user.id, nextStatus);
    if (res.success) {
      await activityLogService.logActivity(
        'USER_STATUS_CHANGE',
        'AUTH',
        user.id,
        `Quản trị viên đã ${actionText.toLowerCase()} tài khoản ${user.name} (@${user.username})`,
        { targetUsername: user.username, isActive: nextStatus }
      );
      success(`${actionText} thành công`, `Tài khoản ${user.name} hiện ${nextStatus ? 'đang hoạt động' : 'đã bị khóa'}`);
      loadUsers();
    } else {
      toastError('Thao tác thất bại', res.error || 'Có lỗi xảy ra');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: AppUser) => {
    if (
      !window.confirm(
        `CẢNH BÁO: Bạn có chắc chắn muốn XÓA vĩnh viễn tài khoản ${user.name} (@${user.username}) khỏi hệ thống? Thao tác này không thể hoàn tác!`
      )
    ) {
      return;
    }

    const res = await authStore.deleteUser(user.id);
    if (res.success) {
      await activityLogService.logActivity(
        'USER_DELETE',
        'AUTH',
        user.id,
        `Quản trị viên đã xóa tài khoản ${user.name} (@${user.username}) khỏi hệ thống`,
        { targetUsername: user.username, role: user.role }
      );
      success('Đã xóa tài khoản', `Tài khoản ${user.name} đã được xóa thành công`);
      loadUsers();
    } else {
      toastError('Không thể xóa tài khoản', res.error || 'Có lỗi xảy ra');
    }
  };

  // Handle Create User Modal Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      setModalError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    setModalLoading(true);
    try {
      const res = await authStore.register({
        name: newName,
        username: newUsername,
        email: newEmail || undefined,
        password: newPassword,
        role: newRole,
      });

      if (res.success && res.user) {
        await activityLogService.logActivity(
          'USER_REGISTER',
          'AUTH',
          res.user.id,
          `Quản trị viên tạo tài khoản mới: ${res.user.name} (@${res.user.username}) với vai trò ${res.user.role}`,
          { targetUsername: res.user.username, role: res.user.role }
        );

        success('Tạo tài khoản thành công', `Đã thêm tài khoản ${res.user.name} vào hệ thống`);
        setShowCreateModal(false);
        setNewName('');
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('STAFF');
        loadUsers();
      } else {
        setModalError(res.error || 'Không thể tạo tài khoản');
      }
    } catch (err: any) {
      setModalError(err?.message || 'Có lỗi xảy ra');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!targetUser) return;

    if (!resetPassword.trim() || !resetConfirm.trim()) {
      setModalError('Vui lòng nhập mật khẩu mới và xác nhận');
      return;
    }

    if (resetPassword !== resetConfirm) {
      setModalError('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (resetPassword.length < 6) {
      setModalError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    setModalLoading(true);
    try {
      const res = await authStore.resetUserPassword(targetUser.id, resetPassword);
      if (res.success) {
        await activityLogService.logActivity(
          'USER_RESET_PASSWORD',
          'AUTH',
          targetUser.id,
          `Quản trị viên đã đặt lại mật khẩu cho tài khoản ${targetUser.name} (@${targetUser.username})`,
          { targetUsername: targetUser.username }
        );

        success('Đặt lại mật khẩu thành công', `Mật khẩu của tài khoản ${targetUser.name} đã được cập nhật`);
        setShowResetModal(false);
        setTargetUser(null);
        setResetPassword('');
        setResetConfirm('');
      } else {
        setModalError(res.error || 'Đặt lại mật khẩu thất bại');
      }
    } catch (err: any) {
      setModalError(err?.message || 'Lỗi hệ thống');
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchQuery =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q));

    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.is_active) ||
      (statusFilter === 'INACTIVE' && !u.is_active);

    return matchQuery && matchRole && matchStatus;
  });

  const totalAdmins = users.filter((u) => u.role === 'ADMIN').length;
  const totalStaff = users.filter((u) => u.role === 'STAFF').length;
  const totalActive = users.filter((u) => u.is_active).length;

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'Chưa đăng nhập';
    try {
      return new Date(isoStr).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#207D43] to-[#134F29] text-white flex items-center justify-center shadow-md shadow-emerald-950/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              Quản Trị Hệ Thống & Phân Quyền
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Quản lý danh sách tài khoản, phân quyền quản trị/thu ngân và bảo mật hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              loadUsers();
              info('Đang làm mới', 'Đang tải lại danh sách tài khoản');
            }}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1B6C39]' : ''}`} />
          </button>

          <button
            onClick={() => {
              setModalError('');
              setShowCreateModal(true);
            }}
            className="px-4 py-2.5 bg-[#1B6C39] hover:bg-[#15592e] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-xs sm:text-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tổng tài khoản
            </span>
            <span className="text-xl font-black text-slate-900">{users.length}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Quản trị viên
            </span>
            <span className="text-xl font-black text-emerald-800">{totalAdmins}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              Thu ngân
            </span>
            <span className="text-xl font-black text-blue-800">{totalStaff}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider block">
              Đang hoạt động
            </span>
            <span className="text-xl font-black text-green-800">
              {totalActive} / {users.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên, tên đăng nhập (@username), email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white transition-all"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="STAFF">Thu ngân</option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Đã bị khóa</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Tài khoản</th>
                <th className="py-3.5 px-4">Vai trò / Phân quyền</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Lần đăng nhập cuối</th>
                <th className="py-3.5 px-4">Ngày tạo</th>
                <th className="py-3.5 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-7 h-7 border-2 border-[#1B6C39] border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold text-xs text-slate-500">
                        Đang tải danh sách tài khoản...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy tài khoản nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const initialLetter = u.name.charAt(0).toUpperCase();

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-xs ${
                              u.role === 'ADMIN'
                                ? 'bg-gradient-to-br from-[#207D43] to-[#134F29]'
                                : 'bg-gradient-to-br from-blue-600 to-indigo-700'
                            }`}
                          >
                            {initialLetter}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{u.username} {u.email && `• ${u.email}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Switcher */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-black tracking-wide uppercase border focus:outline-none transition-all cursor-pointer ${
                            u.role === 'ADMIN'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                          }`}
                        >
                          <option value="STAFF">Thu Ngân</option>
                          <option value="ADMIN">Quản Trị</option>
                        </select>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleStatusToggle(u)}
                          disabled={isSelf}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                            u.is_active
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          } ${isSelf ? 'opacity-60 cursor-not-allowed' : ''}`}
                          title={isSelf ? 'Bạn không thể tự khóa tài khoản của mình' : 'Bấm để đổi trạng thái'}
                        >
                          {u.is_active ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                              <span>Hoạt động</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>Bị khóa</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-xs">
                        {formatDate(u.last_login_at)}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-xs">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setTargetUser(u);
                              setModalError('');
                              setResetPassword('');
                              setResetConfirm('');
                              setShowResetModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Đặt lại mật khẩu"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg transition-all ${
                              isSelf
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={isSelf ? 'Không thể tự xóa chính mình' : 'Xóa tài khoản'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. MODAL CREATE USER */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-[#1B6C39]" />
                <h3 className="font-black text-slate-900 text-base">
                  Thêm Tài Khoản Mới
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-3.5">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{modalError}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Văn Long"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Tên đăng nhập *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                  placeholder="viết liền không dấu (vd: longhoang)"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email liên kết (tùy chọn)
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="long@hlsport.vn"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mật khẩu khởi tạo *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Phân quyền vai trò *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('STAFF')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      newRole === 'STAFF'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold">Thu Ngân</span>
                    </div>
                    {newRole === 'STAFF' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('ADMIN')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      newRole === 'ADMIN'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold">Quản Trị</span>
                    </div>
                    {newRole === 'ADMIN' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-3 bg-[#1B6C39] hover:bg-[#15592e] text-white font-bold rounded-xl shadow transition-all text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {modalLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Xác nhận tạo tài khoản</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL RESET PASSWORD */}
      {showResetModal && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Đặt Lại Mật Khẩu
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Cho tài khoản {targetUser.name} (@{targetUser.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="p-6 space-y-3.5">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{modalError}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mật khẩu mới *
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Xác nhận lại mật khẩu mới *
                </label>
                <input
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {modalLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Cập nhật mật khẩu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
