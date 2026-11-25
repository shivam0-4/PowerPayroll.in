import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ShieldCheck, UserPlus, Power, Clock, Shield, CheckCircle2 } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [loading, setLoading] = useState(true);

  // Modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleId, setNewRoleId] = useState<string>('');
  const [newPhone, setNewPhone] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, rRes, aRes] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getAuditLogs(),
      ]);
      setUsers(uRes.users);
      setRoles(rRes.roles);
      setAuditLogs(aRes.logs);
      if (rRes.roles.length > 0) {
        setNewRoleId(String(rRes.roles[0].id));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load user management', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        email: newEmail,
        full_name: newFullName,
        password: newPassword,
        role_id: Number(newRoleId),
        phone: newPhone,
      });
      showToast('User created successfully', 'success');
      setIsAddUserModalOpen(false);
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewPhone('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (!confirm(`Are you sure you want to toggle status for ${user.full_name}?`)) return;
    try {
      const res = await api.toggleUserStatus(user.id);
      showToast(res.message, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Management & Security Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based access control (Super Admin, HR, Accountant, Payroll Manager, Viewer) & activity logs
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-slate-200/80 p-1 rounded-xl flex text-xs font-bold">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'users' ? 'bg-white text-brand-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              System Users
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'audit' ? 'bg-white text-brand-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Trail
            </button>
          </div>

          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.full_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.phone || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={u.is_active ? 'Active' : 'Inactive'} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        title="Toggle Active/Inactive"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{log.user_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-800 font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.entity_type} #{log.entity_id || ''}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Provision Corporate User Account"
        subtitle="Assign role permissions according to organizational responsibility"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Corporate Email</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Initial Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Role Assignment</label>
              <select
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl font-bold"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mobile Phone</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(false)}
              className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-800 text-gold-400 font-bold rounded-xl shadow-md hover:bg-brand-900"
            >
              Provision User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
