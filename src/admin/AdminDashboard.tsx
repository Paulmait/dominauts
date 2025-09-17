/**
 * Admin Dashboard - Complete Analytics & Management System
 */

import React, { useState, useEffect } from 'react';
import { adminService } from '../services/AdminService';
import { analyticsService } from '../services/AnalyticsService';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() });
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await adminService.getDashboardData(dateRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="admin-overview">
      <div className="metrics-grid">
        {/* Key Metrics */}
        <MetricCard
          title="Total Revenue"
          value={`$${analytics?.revenue?.total?.toFixed(2) || '0.00'}`}
          change={analytics?.revenue?.changePercent}
          icon="💰"
        />
        <MetricCard
          title="Active Users (DAU)"
          value={analytics?.users?.dau || 0}
          change={analytics?.users?.dauChange}
          icon="👥"
        />
        <MetricCard
          title="New Users Today"
          value={analytics?.users?.newToday || 0}
          change={analytics?.users?.newChange}
          icon="🆕"
        />
        <MetricCard
          title="Games Played"
          value={analytics?.games?.total || 0}
          change={analytics?.games?.changePercent}
          icon="🎮"
        />
        <MetricCard
          title="Avg Session Duration"
          value={`${analytics?.engagement?.avgSessionMinutes || 0}m`}
          change={analytics?.engagement?.sessionChange}
          icon="⏱️"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${analytics?.monetization?.conversionRate || 0}%`}
          change={analytics?.monetization?.conversionChange}
          icon="💳"
        />
        <MetricCard
          title="ARPU"
          value={`$${analytics?.monetization?.arpu?.toFixed(2) || '0.00'}`}
          change={analytics?.monetization?.arpuChange}
          icon="📊"
        />
        <MetricCard
          title="Retention (D1)"
          value={`${analytics?.retention?.day1 || 0}%`}
          change={analytics?.retention?.retentionChange}
          icon="🔄"
        />
      </div>

      {/* Revenue Chart */}
      <div className="chart-container">
        <h3>Revenue Trend</h3>
        <RevenueChart data={analytics?.revenueChart} />
      </div>

      {/* User Activity Heatmap */}
      <div className="chart-container">
        <h3>User Activity Heatmap</h3>
        <ActivityHeatmap data={analytics?.activityHeatmap} />
      </div>

      {/* Real-time Stats */}
      <div className="realtime-stats">
        <h3>Real-time Activity</h3>
        <div className="realtime-grid">
          <div className="stat">
            <span className="label">Online Now</span>
            <span className="value">{analytics?.realtime?.online || 0}</span>
          </div>
          <div className="stat">
            <span className="label">Games in Progress</span>
            <span className="value">{analytics?.realtime?.activeGames || 0}</span>
          </div>
          <div className="stat">
            <span className="label">Pending Purchases</span>
            <span className="value">{analytics?.realtime?.pendingPurchases || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <UserManagement
      users={analytics?.users?.list}
      onRefund={handleRefund}
      onBan={handleBan}
      onMessage={handleSendEmail}
    />
  );

  const renderTransactions = () => (
    <TransactionList
      transactions={analytics?.transactions}
      onRefund={handleRefund}
    />
  );

  const renderAnalytics = () => (
    <DetailedAnalytics
      data={analytics}
      dateRange={dateRange}
    />
  );

  const renderSettings = () => (
    <AdminSettings />
  );

  const handleRefund = async (transactionId: string, reason: string) => {
    if (!confirm('Are you sure you want to process this refund?')) return;

    try {
      await adminService.processRefund(transactionId, reason);
      alert('Refund processed successfully');
      loadDashboardData();
    } catch (error) {
      alert('Failed to process refund: ' + error.message);
    }
  };

  const handleBan = async (userId: string, reason: string, duration?: number) => {
    try {
      await adminService.banUser(userId, reason, duration);
      alert('User banned successfully');
      loadDashboardData();
    } catch (error) {
      alert('Failed to ban user: ' + error.message);
    }
  };

  const handleSendEmail = async (userId: string, subject: string, message: string) => {
    try {
      await adminService.sendEmail(userId, subject, message);
      alert('Email sent successfully');
    } catch (error) {
      alert('Failed to send email: ' + error.message);
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Dominauts Admin Dashboard</h1>
        <div className="header-controls">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button onClick={loadDashboardData}>🔄 Refresh</button>
          <button onClick={() => adminService.exportData(dateRange)}>📥 Export</button>
        </div>
      </header>

      <nav className="admin-nav">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={activeTab === 'transactions' ? 'active' : ''}
          onClick={() => setActiveTab('transactions')}
        >
          💳 Transactions
        </button>
        <button
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>

      <main className="admin-content">
        {loading ? (
          <div className="loading">Loading dashboard data...</div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'settings' && renderSettings()}
          </>
        )}
      </main>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: string;
}> = ({ title, value, change, icon }) => (
  <div className="metric-card">
    <div className="metric-icon">{icon}</div>
    <div className="metric-content">
      <h4>{title}</h4>
      <div className="metric-value">{value}</div>
      {change !== undefined && (
        <div className={`metric-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </div>
      )}
    </div>
  </div>
);

// User Management Component
const UserManagement: React.FC<{
  users: any[];
  onRefund: (transactionId: string, reason: string) => void;
  onBan: (userId: string, reason: string, duration?: number) => void;
  onMessage: (userId: string, subject: string, message: string) => void;
}> = ({ users, onRefund, onBan, onMessage }) => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users?.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="user-management">
      <div className="user-controls">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Status</th>
              <th>Games</th>
              <th>Revenue</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers?.map(user => (
              <tr key={user.id}>
                <td>{user.id.slice(0, 8)}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`status ${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td>{user.gamesPlayed}</td>
                <td>${user.totalSpent?.toFixed(2)}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => setSelectedUser(user)}>View</button>
                  <button onClick={() => onBan(user.id, 'Admin action')}>Ban</button>
                  <button onClick={() => onMessage(user.id, '', '')}>Email</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefund={onRefund}
          onBan={onBan}
          onMessage={onMessage}
        />
      )}
    </div>
  );
};

// Transaction List Component
const TransactionList: React.FC<{
  transactions: any[];
  onRefund: (transactionId: string, reason: string) => void;
}> = ({ transactions, onRefund }) => {
  const [filter, setFilter] = useState('all');

  const filteredTransactions = transactions?.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  return (
    <div className="transactions-list">
      <div className="transaction-controls">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Transactions</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
      </div>

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
          {filteredTransactions?.map(transaction => (
            <tr key={transaction.id}>
              <td>{transaction.id.slice(0, 8)}</td>
              <td>{transaction.username}</td>
              <td>{transaction.type}</td>
              <td>${transaction.amount.toFixed(2)}</td>
              <td>
                <span className={`status ${transaction.status}`}>
                  {transaction.status}
                </span>
              </td>
              <td>{new Date(transaction.createdAt).toLocaleDateString()}</td>
              <td>
                {transaction.status === 'completed' && (
                  <button onClick={() => {
                    const reason = prompt('Refund reason:');
                    if (reason) onRefund(transaction.id, reason);
                  }}>
                    Refund
                  </button>
                )}
                <button>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Placeholder components (would be fully implemented)
const RevenueChart: React.FC<{ data: any }> = ({ data }) => (
  <div className="chart">Revenue chart visualization here</div>
);

const ActivityHeatmap: React.FC<{ data: any }> = ({ data }) => (
  <div className="heatmap">Activity heatmap visualization here</div>
);

const DateRangePicker: React.FC<{ value: any; onChange: any }> = ({ value, onChange }) => (
  <div className="date-picker">Date range picker here</div>
);

const DetailedAnalytics: React.FC<{ data: any; dateRange: any }> = ({ data, dateRange }) => (
  <div className="detailed-analytics">Detailed analytics here</div>
);

const AdminSettings: React.FC = () => (
  <div className="admin-settings">Admin settings here</div>
);

const UserDetailModal: React.FC<any> = ({ user, onClose, onRefund, onBan, onMessage }) => (
  <div className="modal">User detail modal here</div>
);