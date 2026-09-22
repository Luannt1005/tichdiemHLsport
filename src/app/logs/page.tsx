'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Code2,
  X,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { ActivityAction, ActivityLog, UserRole } from '@/types/database';
import { activityLogService } from '@/lib/services/activity-log-service';
import { useToast } from '@/components/ui/Toast';

const ACTION_MAP: Record<
  ActivityAction,
  { label: string; bg: string; text: string; border: string }
> = {
  LOGIN: {
    label: 'Đăng nhập',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  LOGOUT: {
    label: 'Đăng xuất',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  USER_REGISTER: {
    label: 'Tạo tài khoản',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
  USER_UPDATE_ROLE: {
    label: 'Đổi quyền hạn',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  USER_STATUS_CHANGE: {
    label: 'Khóa / Mở khóa',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  USER_RESET_PASSWORD: {
    label: 'Đặt lại mật khẩu',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  USER_DELETE: {
    label: 'Xóa tài khoản',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  CUSTOMER_CREATE: {
    label: 'Tạo khách hàng',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
  },
  CUSTOMER_UPDATE: {
    label: 'Sửa khách hàng',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  CUSTOMER_DELETE: {
    label: 'Xóa khách hàng',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  POINTS_EARN: {
    label: 'Tích điểm',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  POINTS_REDEEM: {
    label: 'Đổi điểm',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  POINTS_ADJUST: {
    label: 'Điều chỉnh điểm',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  SETTINGS_UPDATE: {
    label: 'Đổi cấu hình',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  EXPIRE_CHECK: {
    label: 'Quét hết hạn',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
};

const ENTITY_MAP: Record<string, string> = {
  AUTH: 'Tài khoản',
  CUSTOMER: 'Khách hàng',
  POINT_TRANSACTION: 'Giao dịch điểm',
  POINT_SETTING: 'Cài đặt điểm',
};

export default function LogsPage() {
  const { info } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Metadata Modal
  const [selectedLogForMeta, setSelectedLogForMeta] = useState<ActivityLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await activityLogService.getActivityLogs({
        action: selectedAction,
        role: selectedRole,
        search,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedAction, selectedRole, search, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return {
        date: d.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        time: d.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
    } catch (_) {
      return { date: isoStr, time: '' };
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Title Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#207D43] to-[#134F29] text-white flex items-center justify-center shadow-md">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">
              Nhật Ký Hoạt Động Hệ Thống
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Ghi nhận minh bạch lịch sử mọi hành động của từng tài khoản trên toàn hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
            <span>Tổng cộng:</span>
            <span className="text-[#1B6C39] font-black">{total} sự kiện</span>
          </div>
          <button
            onClick={() => {
              loadLogs();
              info('Đang làm mới', 'Đang cập nhật danh sách nhật ký mới nhất');
            }}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1B6C39]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo mô tả hành động, tài khoản, mã tham chiếu..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white transition-all"
          />
        </div>

        {/* Action Type Filter */}
        <div className="w-full md:w-56">
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="LOGIN">Đăng nhập</option>
            <option value="LOGOUT">Đăng xuất</option>
            <option value="USER_REGISTER">Đăng ký tài khoản</option>
            <option value="USER_UPDATE_ROLE">Đổi quyền hạn</option>
            <option value="USER_STATUS_CHANGE">Khóa / Mở tài khoản</option>
            <option value="USER_RESET_PASSWORD">Đặt lại mật khẩu</option>
            <option value="USER_DELETE">Xóa tài khoản</option>
            <option value="CUSTOMER_CREATE">Tạo khách hàng</option>
            <option value="CUSTOMER_UPDATE">Cập nhật khách hàng</option>
            <option value="CUSTOMER_DELETE">Xóa khách hàng</option>
            <option value="POINTS_EARN">Tích điểm</option>
            <option value="POINTS_REDEEM">Đổi điểm</option>
            <option value="POINTS_ADJUST">Điều chỉnh điểm</option>
            <option value="SETTINGS_UPDATE">Đổi cài đặt</option>
          </select>
        </div>

        {/* Role Filter */}
        <div className="w-full md:w-44">
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="STAFF">Thu ngân</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Tài khoản</th>
                <th className="py-3.5 px-4">Hành động</th>
                <th className="py-3.5 px-4">Đối tượng</th>
                <th className="py-3.5 px-4">Nội dung chi tiết</th>
                <th className="py-3.5 px-4 text-center">Dữ liệu chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-7 h-7 border-2 border-[#1B6C39] border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold text-xs text-slate-500">
                        Đang tải nhật ký hoạt động...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    Không tìm thấy nhật ký hoạt động nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionStyle =
                    ACTION_MAP[log.action] || {
                      label: log.action,
                      bg: 'bg-slate-50',
                      text: 'text-slate-700',
                      border: 'border-slate-200',
                    };
                  const dateInfo = formatDate(log.created_at);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{dateInfo.time}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {dateInfo.date}
                        </div>
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-xs ${
                              log.user_role === 'ADMIN' ? 'bg-[#1B6C39]' : 'bg-blue-600'
                            }`}
                          >
                            {log.user_role === 'ADMIN' ? 'A' : 'S'}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{log.username}</div>
                            <div
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                log.user_role === 'ADMIN' ? 'text-emerald-700' : 'text-blue-700'
                              }`}
                            >
                              {log.user_role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}
                        >
                          {actionStyle.label}
                        </span>
                      </td>

                      {/* Entity Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {ENTITY_MAP[log.entity_type] || log.entity_type}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed">
                          {log.description}
                        </p>
                      </td>

                      {/* Metadata / Details */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <button
                            onClick={() => setSelectedLogForMeta(log)}
                            className="p-1.5 text-slate-500 hover:text-[#1B6C39] hover:bg-emerald-50 rounded-lg transition-all"
                            title="Xem chi tiết dữ liệu JSON"
                          >
                            <Code2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị trang <span className="font-bold text-slate-800">{page}</span> /{' '}
            <span className="font-bold text-slate-800">{totalPages}</span> ({total} logs)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 text-slate-600 hover:bg-white border border-slate-200 rounded-xl disabled:opacity-40 transition-all"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 text-slate-600 hover:bg-white border border-slate-200 rounded-xl disabled:opacity-40 transition-all"
              title="Trang kế tiếp"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metadata JSON Modal */}
      {selectedLogForMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-[#1B6C39]" />
                <h3 className="font-black text-slate-900 text-base">
                  Chi Tiết Payload Metadata
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogForMeta(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Hành động:
                </span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedLogForMeta.description}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Dữ liệu JSON:
                </span>
                <pre className="mt-1.5 p-4 bg-slate-900 text-emerald-300 rounded-2xl text-xs font-mono overflow-x-auto border border-slate-800">
                  {JSON.stringify(selectedLogForMeta.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogForMeta(null)}
                className="px-5 py-2 bg-[#1B6C39] hover:bg-[#15592e] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
