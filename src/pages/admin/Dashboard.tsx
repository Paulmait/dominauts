import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '../../config/environment';

// Initialize Supabase client
const supabase = createClient(ENV.SUPABASE.URL, ENV.SUPABASE.ANON_KEY);

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalGames: number;
  activeGames: number;
  premiumUsers: number;
  suspiciousActivities: number;
  pendingRefunds: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  coins: number;
  premium_until: string | null;
  games_played: number;
  games_won: number;
  created_at: string;
  banned: boolean;
  suspicious_activity_score: number;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  metadata: any;
}

export const AdminDashboard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalGames: 0,
    activeGames: 0,
    premiumUsers: 0,
    suspiciousActivities: 0,
    pendingRefunds: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'games' | 'transactions' | 'security'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        alert('Access denied. Admin privileges required.');
        window.location.href = '/';
        return;
      }

      setIsAdmin(true);
      await loadDashboardData();
    } catch (error) {
      console.error('Admin access check failed:', error);
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      // Load stats
      const [
        usersResponse,
        gamesResponse,
        transactionsResponse,
        suspiciousResponse
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('games').select('*', { count: 'exact' }),
        supabase.from('transactions').select('*'),
        supabase.from('suspicious_activities').select('*', { count: 'exact' })
      ]);

      // Calculate stats
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const activeUsers = usersResponse.data?.filter((u: any) =>
        new Date(u.last_active) > dayAgo
      ).length || 0;

      const premiumUsers = usersResponse.data?.filter((u: any) =>
        u.premium_until && new Date(u.premium_until) > now
      ).length || 0;

      const totalRevenue = transactionsResponse.data?.reduce((sum: number, t: any) =>
        t.type === 'purchase' ? sum + t.amount : sum, 0
      ) || 0;

      const activeGames = gamesResponse.data?.filter((g: any) =>
        g.status === 'active' || g.status === 'waiting'
      ).length || 0;

      const pendingRefunds = transactionsResponse.data?.filter((t: any) =>
        t.type === 'refund_request' && t.status === 'pending'
      ).length || 0;

      setStats({
        totalUsers: usersResponse.count || 0,
        activeUsers,
        totalRevenue,
        totalGames: gamesResponse.count || 0,
        activeGames,
        premiumUsers,
        suspiciousActivities: suspiciousResponse.count || 0,
        pendingRefunds
      });

      setUsers(usersResponse.data || []);
      setTransactions(transactionsResponse.data || []);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const banUser = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user?')) return;

    try {
      await supabase
        .from('profiles')
        .update({ banned: true, banned_at: new Date().toISOString() })
        .eq('id', userId);

      // Refresh data
      await loadDashboardData();
      alert('User banned successfully');
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user');
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ banned: false, banned_at: null })
        .eq('id', userId);

      await loadDashboardData();
      alert('User unbanned successfully');
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('Failed to unban user');
    }
  };

  const processRefund = async (transactionId: string) => {
    if (!confirm('Process this refund?')) return;

    try {
      // This would integrate with Stripe API to process actual refund
      await supabase
        .from('transactions')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('id', transactionId);

      await loadDashboardData();
      alert('Refund processed successfully');
    } catch (error) {
      console.error('Failed to process refund:', error);
      alert('Failed to process refund');
    }
  };

  const resetUserPassword = async (userId: string) => {
    if (!confirm('Send password reset email to this user?')) return;

    try {
      // Get user email
      const { data: user } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (user?.email) {
        // Send reset email via Supabase Auth
        await supabase.auth.resetPasswordForEmail(user.email);
        alert('Password reset email sent');
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to reset password');
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading admin dashboard...</div>;
  }

  if (!isAdmin) {
    return <div className="admin-error">Access Denied</div>;
  }

  return (
    <div className="admin-dashboard">
      <style>{`
        .admin-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .admin-header {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .admin-title {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
          margin-bottom: 1rem;
        }

        .admin-subtitle {
          color: #666;
          margin-bottom: 2rem;
        }

        .admin-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .admin-tab {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 500;
        }

        .admin-tab.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .admin-tab:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 15px;
          padding: 1.5rem;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .stat-label {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
        }

        .stat-change {
          color: #4CAF50;
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }

        .stat-change.negative {
          color: #f44336;
        }

        .data-table {
          background: white;
          border-radius: 15px;
          padding: 1.5rem;
          overflow-x: auto;
        }

        .search-bar {
          margin-bottom: 1.5rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 1rem;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 0.75rem;
          border-bottom: 2px solid #e0e0e0;
          color: #666;
          font-weight: 600;
        }

        td {
          padding: 0.75rem;
          border-bottom: 1px solid #f0f0f0;
        }

        tr:hover {
          background: #f8f9ff;
        }

        .action-btn {
          padding: 0.4rem 0.8rem;
          margin: 0 0.25rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.3s;
        }

        .action-btn.ban {
          background: #f44336;
          color: white;
        }

        .action-btn.unban {
          background: #4CAF50;
          color: white;
        }

        .action-btn.refund {
          background: #FF9800;
          color: white;
        }

        .action-btn.reset {
          background: #2196F3;
          color: white;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .status-badge.active {
          background: #e8f5e9;
          color: #4CAF50;
        }

        .status-badge.premium {
          background: #fff3e0;
          color: #FF9800;
        }

        .status-badge.banned {
          background: #ffebee;
          color: #f44336;
        }

        .status-badge.suspicious {
          background: #fce4ec;
          color: #e91e63;
        }

        .refresh-btn {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          padding: 1rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          font-weight: 600;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
          transition: all 0.3s;
        }

        .refresh-btn:hover {
          transform: scale(1.05);
        }

        .refresh-btn.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .admin-dashboard {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .admin-tabs {
            flex-wrap: wrap;
          }

          .data-table {
            padding: 1rem;
          }

          table {
            font-size: 0.9rem;
          }
        }
      `}</style>

      <div className="admin-header">
        <h1 className="admin-title">🎮 Dominauts Admin Dashboard</h1>
        <p className="admin-subtitle">
          Manage users, monitor games, and track revenue
        </p>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => setActiveTab('games')}
          >
            🎲 Games
          </button>
          <button
            className={`admin-tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            💰 Transactions
          </button>
          <button
            className={`admin-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🔒 Security
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
            <div className="stat-change">+12% from last month</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Active Users (24h)</div>
            <div className="stat-value">{stats.activeUsers.toLocaleString()}</div>
            <div className="stat-change">
              {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% engagement
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">${stats.totalRevenue.toFixed(2)}</div>
            <div className="stat-change">+28% from last month</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Games</div>
            <div className="stat-value">{stats.totalGames.toLocaleString()}</div>
            <div className="stat-change">
              {stats.activeGames} active now
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Premium Users</div>
            <div className="stat-value">{stats.premiumUsers}</div>
            <div className="stat-change">
              {Math.round((stats.premiumUsers / stats.totalUsers) * 100)}% conversion
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Suspicious Activities</div>
            <div className="stat-value">{stats.suspiciousActivities}</div>
            <div className="stat-change negative">
              {stats.pendingRefunds} pending refunds
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="data-table">
          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Search users by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Coins</th>
                <th>Games</th>
                <th>Win Rate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(u =>
                  u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .slice(0, 20)
                .map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.coins}</td>
                    <td>{user.games_played}</td>
                    <td>
                      {user.games_played > 0
                        ? `${Math.round((user.games_won / user.games_played) * 100)}%`
                        : '0%'}
                    </td>
                    <td>
                      {user.banned && (
                        <span className="status-badge banned">Banned</span>
                      )}
                      {!user.banned && user.premium_until && new Date(user.premium_until) > new Date() && (
                        <span className="status-badge premium">Premium</span>
                      )}
                      {!user.banned && (!user.premium_until || new Date(user.premium_until) <= new Date()) && (
                        <span className="status-badge active">Active</span>
                      )}
                      {user.suspicious_activity_score > 50 && (
                        <span className="status-badge suspicious">⚠️</span>
                      )}
                    </td>
                    <td>
                      {user.banned ? (
                        <button
                          className="action-btn unban"
                          onClick={() => unbanUser(user.id)}
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          className="action-btn ban"
                          onClick={() => banUser(user.id)}
                        >
                          Ban
                        </button>
                      )}
                      <button
                        className="action-btn reset"
                        onClick={() => resetUserPassword(user.id)}
                      >
                        Reset Pass
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 20).map(transaction => (
                <tr key={transaction.id}>
                  <td>{transaction.id.substring(0, 8)}...</td>
                  <td>{transaction.user_id.substring(0, 8)}...</td>
                  <td>{transaction.type}</td>
                  <td>${transaction.amount.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${transaction.status === 'completed' ? 'active' : ''}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
                  <td>
                    {transaction.type === 'refund_request' && transaction.status === 'pending' && (
                      <button
                        className="action-btn refund"
                        onClick={() => processRefund(transaction.id)}
                      >
                        Process Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        className={`refresh-btn ${refreshing ? 'loading' : ''}`}
        onClick={loadDashboardData}
        disabled={refreshing}
      >
        {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Data'}
      </button>
    </div>
  );
};