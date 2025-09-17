import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundSystem } from '../services/SoundSystem';

interface User {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'suspended' | 'banned';
  createdAt: Date;
  lastLogin: Date;
  gamesPlayed: number;
  totalSpent: number;
  violations: number;
  reportCount: number;
}

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [loading, setLoading] = useState(false);
  const [actionModal, setActionModal] = useState<{
    show: boolean;
    type: 'suspend' | 'ban' | 'delete' | 'reset' | null;
    user: User | null;
  }>({ show: false, type: null, user: null });
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('24'); // hours

  // Theme detection
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isDark = theme === 'dark';

  // Check if current user is admin
  const isAdmin = currentUser?.isAdmin || currentUser?.role === 'admin';

  // Load users (simulated)
  useEffect(() => {
    if (isOpen && isAdmin) {
      loadUsers();
    }
  }, [isOpen, isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    // Simulated user data
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'Player1',
        email: 'player1@example.com',
        status: 'active',
        createdAt: new Date('2024-01-15'),
        lastLogin: new Date('2025-01-17'),
        gamesPlayed: 152,
        totalSpent: 49.99,
        violations: 0,
        reportCount: 0
      },
      {
        id: '2',
        username: 'ToxicGamer',
        email: 'toxic@example.com',
        status: 'suspended',
        createdAt: new Date('2024-03-20'),
        lastLogin: new Date('2025-01-10'),
        gamesPlayed: 89,
        totalSpent: 0,
        violations: 3,
        reportCount: 15
      },
      {
        id: '3',
        username: 'Cheater123',
        email: 'cheater@example.com',
        status: 'banned',
        createdAt: new Date('2024-06-01'),
        lastLogin: new Date('2024-12-25'),
        gamesPlayed: 203,
        totalSpent: 199.99,
        violations: 5,
        reportCount: 42
      },
      {
        id: '4',
        username: 'NormalPlayer',
        email: 'normal@example.com',
        status: 'active',
        createdAt: new Date('2024-08-10'),
        lastLogin: new Date('2025-01-17'),
        gamesPlayed: 67,
        totalSpent: 9.99,
        violations: 0,
        reportCount: 1
      }
    ];

    setUsers(mockUsers);
    setLoading(false);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Handle user actions
  const handleUserAction = async (action: 'suspend' | 'ban' | 'delete' | 'reset', user: User) => {
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      switch (action) {
        case 'suspend':
          setUsers(prev => prev.map(u =>
            u.id === user.id ? { ...u, status: 'suspended' } : u
          ));
          soundSystem.play('notification');
          alert(`User ${user.username} suspended for ${duration} hours. Reason: ${reason}`);
          break;

        case 'ban':
          setUsers(prev => prev.map(u =>
            u.id === user.id ? { ...u, status: 'banned' } : u
          ));
          soundSystem.play('error');
          alert(`User ${user.username} permanently banned. Reason: ${reason}`);
          break;

        case 'delete':
          setUsers(prev => prev.filter(u => u.id !== user.id));
          soundSystem.play('success');
          alert(`User ${user.username} account deleted.`);
          break;

        case 'reset':
          setUsers(prev => prev.map(u =>
            u.id === user.id ? { ...u, status: 'active', violations: 0, reportCount: 0 } : u
          ));
          soundSystem.play('success');
          alert(`User ${user.username} account reset.`);
          break;
      }

      setActionModal({ show: false, type: null, user: null });
      setReason('');
    } catch (error) {
      console.error('Action failed:', error);
      soundSystem.play('error');
    } finally {
      setLoading(false);
    }
  };

  // Pause all games
  const pauseAllGames = () => {
    // This would connect to the game server
    alert('All active games have been paused.');
    soundSystem.play('notification');
  };

  // System statistics
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    suspendedUsers: users.filter(u => u.status === 'suspended').length,
    bannedUsers: users.filter(u => u.status === 'banned').length,
    totalRevenue: users.reduce((sum, u) => sum + u.totalSpent, 0),
    totalViolations: users.reduce((sum, u) => sum + u.violations, 0)
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="admin-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(10px)'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="admin-panel"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #1a1a2e, #16213e)'
                : 'linear-gradient(135deg, #ffffff, #f0f0f0)',
              borderRadius: '20px',
              padding: '2rem',
              width: '90%',
              maxWidth: '1200px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '2px solid #ffd700',
              boxShadow: '0 20px 60px rgba(255, 215, 0, 0.3)',
              color: isDark ? '#fff' : '#333'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              borderBottom: '2px solid rgba(255, 215, 0, 0.3)',
              paddingBottom: '1rem'
            }}>
              <h2 style={{
                color: '#ffd700',
                fontSize: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                👑 Admin Dashboard
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  color: '#ef4444',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            {/* Statistics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10b981',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                  {stats.activeUsers}
                </div>
                <div style={{ fontSize: '0.9rem', color: isDark ? '#aaa' : '#666' }}>
                  Active Users
                </div>
              </div>

              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid #fbbf24',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24' }}>
                  {stats.suspendedUsers}
                </div>
                <div style={{ fontSize: '0.9rem', color: isDark ? '#aaa' : '#666' }}>
                  Suspended
                </div>
              </div>

              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>
                  {stats.bannedUsers}
                </div>
                <div style={{ fontSize: '0.9rem', color: isDark ? '#aaa' : '#666' }}>
                  Banned
                </div>
              </div>

              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid #3b82f6',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  ${stats.totalRevenue.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.9rem', color: isDark ? '#aaa' : '#666' }}>
                  Total Revenue
                </div>
              </div>

              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid #a855f7',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7' }}>
                  {stats.totalViolations}
                </div>
                <div style={{ fontSize: '0.9rem', color: isDark ? '#aaa' : '#666' }}>
                  Violations
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <button
                onClick={pauseAllGames}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ⏸️ Pause All Games
              </button>

              <button
                onClick={() => alert('Maintenance mode activated')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🔧 Maintenance Mode
              </button>

              <button
                onClick={() => alert('Broadcasting message to all users')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📢 Broadcast Message
              </button>
            </div>

            {/* Search and Filter */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '8px',
                  color: isDark ? '#fff' : '#333'
                }}
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                style={{
                  padding: '0.75rem',
                  background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '8px',
                  color: isDark ? '#fff' : '#333'
                }}
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            {/* Users Table */}
            <div style={{
              background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    background: isDark ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.2)'
                  }}>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>User</th>
                    <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Games</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Revenue</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Violations</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Reports</th>
                    <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>
                        Loading...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedUser(user)}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{user.username}</div>
                            <div style={{ fontSize: '0.8rem', color: isDark ? '#aaa' : '#666' }}>
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            background:
                              user.status === 'active' ? 'rgba(16, 185, 129, 0.2)' :
                              user.status === 'suspended' ? 'rgba(251, 191, 36, 0.2)' :
                              'rgba(239, 68, 68, 0.2)',
                            color:
                              user.status === 'active' ? '#10b981' :
                              user.status === 'suspended' ? '#fbbf24' :
                              '#ef4444'
                          }}>
                            {user.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {user.gamesPlayed}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          ${user.totalSpent.toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            color: user.violations > 0 ? '#ef4444' : '#10b981'
                          }}>
                            {user.violations}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            color: user.reportCount > 5 ? '#ef4444' :
                                   user.reportCount > 0 ? '#fbbf24' : '#10b981'
                          }}>
                            {user.reportCount}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {user.status === 'active' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionModal({ show: true, type: 'suspend', user });
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'rgba(251, 191, 36, 0.2)',
                                  border: '1px solid #fbbf24',
                                  borderRadius: '4px',
                                  color: '#fbbf24',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Suspend
                              </button>
                            )}

                            {user.status !== 'banned' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionModal({ show: true, type: 'ban', user });
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  border: '1px solid #ef4444',
                                  borderRadius: '4px',
                                  color: '#ef4444',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Ban
                              </button>
                            )}

                            {user.status !== 'active' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionModal({ show: true, type: 'reset', user });
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  border: '1px solid #10b981',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Reset
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionModal({ show: true, type: 'delete', user });
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(156, 163, 175, 0.2)',
                                border: '1px solid #9ca3af',
                                borderRadius: '4px',
                                color: '#9ca3af',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Modal */}
            {actionModal.show && actionModal.user && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10001
                }}
                onClick={() => setActionModal({ show: false, type: null, user: null })}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: isDark ? '#1a1a2e' : '#fff',
                    borderRadius: '12px',
                    padding: '2rem',
                    maxWidth: '400px',
                    width: '90%',
                    border: '2px solid #ffd700'
                  }}
                >
                  <h3 style={{ color: '#ffd700', marginBottom: '1rem' }}>
                    {actionModal.type === 'suspend' && '⏸️ Suspend User'}
                    {actionModal.type === 'ban' && '🚫 Ban User'}
                    {actionModal.type === 'delete' && '🗑️ Delete Account'}
                    {actionModal.type === 'reset' && '♻️ Reset User'}
                  </h3>

                  <p style={{ marginBottom: '1rem' }}>
                    Are you sure you want to {actionModal.type} user{' '}
                    <strong>{actionModal.user.username}</strong>?
                  </p>

                  {(actionModal.type === 'suspend' || actionModal.type === 'ban') && (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                          Reason (required)
                        </label>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Enter reason for action..."
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            borderRadius: '8px',
                            color: isDark ? '#fff' : '#333',
                            minHeight: '80px'
                          }}
                        />
                      </div>

                      {actionModal.type === 'suspend' && (
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                            Duration (hours)
                          </label>
                          <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            min="1"
                            max="720"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                              border: '1px solid rgba(255, 215, 0, 0.3)',
                              borderRadius: '8px',
                              color: isDark ? '#fff' : '#333'
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setActionModal({ show: false, type: null, user: null })}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(156, 163, 175, 0.2)',
                        border: '1px solid #9ca3af',
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#333',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => {
                        if ((actionModal.type === 'suspend' || actionModal.type === 'ban') && !reason) {
                          alert('Please provide a reason');
                          return;
                        }
                        handleUserAction(actionModal.type!, actionModal.user!);
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background:
                          actionModal.type === 'delete' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                          actionModal.type === 'ban' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                          actionModal.type === 'suspend' ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                          'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        borderRadius: '8px',
                        color: actionModal.type === 'suspend' ? '#000' : '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Confirm {actionModal.type}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};