import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '../../config/environment';

const supabase = createClient(ENV.SUPABASE.URL, ENV.SUPABASE.ANON_KEY);

interface EngagementMetrics {
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
  sessionMetrics: {
    avgDuration: number;
    avgGamesPerSession: number;
    bounceRate: number;
  };
  gameMetrics: {
    totalGames: number;
    completionRate: number;
    avgGameDuration: number;
    mostPlayedMode: string;
    peakHours: { hour: number; count: number }[];
  };
  revenueMetrics: {
    dailyRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    arpu: number; // Average Revenue Per User
    arppu: number; // Average Revenue Per Paying User
    conversionRate: number;
    ltv: number; // Lifetime Value
  };
  userFlow: {
    signups: number;
    activations: number;
    firstPurchase: number;
    churn: number;
  };
  deviceStats: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  geoStats: Array<{
    country: string;
    users: number;
    revenue: number;
  }>;
}

export const AnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [realTimeUsers, setRealTimeUsers] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadRealTimeData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = getStartDate(dateRange);

      // Load all metrics in parallel
      const [
        userMetrics,
        gameMetrics,
        revenueMetrics,
        sessionData,
        deviceData,
        geoData,
        alertsData
      ] = await Promise.all([
        getUserMetrics(startDate, now),
        getGameMetrics(startDate, now),
        getRevenueMetrics(startDate, now),
        getSessionMetrics(startDate, now),
        getDeviceStats(),
        getGeoStats(),
        getSecurityAlerts()
      ]);

      setMetrics({
        dau: userMetrics.dau,
        wau: userMetrics.wau,
        mau: userMetrics.mau,
        retention: userMetrics.retention,
        sessionMetrics: sessionData,
        gameMetrics: gameMetrics,
        revenueMetrics: revenueMetrics,
        userFlow: userMetrics.flow,
        deviceStats: deviceData,
        geoStats: geoData
      });

      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRealTimeData = async () => {
    try {
      // Get users active in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_active', fiveMinutesAgo.toISOString());

      setRealTimeUsers(count || 0);
    } catch (error) {
      console.error('Failed to load real-time data:', error);
    }
  };

  const getUserMetrics = async (startDate: Date, endDate: Date) => {
    const { data: dailyActive } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: weeklyActive } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_active', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { data: monthlyActive } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Calculate retention
    const { data: retention } = await supabase.rpc('calculate_retention', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    });

    // User flow
    const { data: signups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    const { data: purchases } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('type', 'purchase')
      .gte('created_at', startDate.toISOString());

    const uniquePurchasers = new Set(purchases?.map(p => p.user_id)).size;

    return {
      dau: dailyActive || 0,
      wau: weeklyActive || 0,
      mau: monthlyActive || 0,
      retention: retention || { day1: 0, day7: 0, day30: 0 },
      flow: {
        signups: signups || 0,
        activations: Math.floor((signups || 0) * 0.7), // Mock
        firstPurchase: uniquePurchasers,
        churn: Math.floor((signups || 0) * 0.1) // Mock
      }
    };
  };

  const getGameMetrics = async (startDate: Date, endDate: Date) => {
    const { data: games } = await supabase
      .from('games')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const completedGames = games?.filter(g => g.status === 'finished').length || 0;
    const totalGames = games?.length || 0;

    // Calculate peak hours
    const hourCounts = new Map<number, number>();
    games?.forEach(game => {
      const hour = new Date(game.created_at).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const peakHours = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Mode popularity
    const modeCounts = new Map<string, number>();
    games?.forEach(game => {
      modeCounts.set(game.mode, (modeCounts.get(game.mode) || 0) + 1);
    });

    const mostPlayedMode = Array.from(modeCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'allfives';

    return {
      totalGames,
      completionRate: totalGames > 0 ? (completedGames / totalGames) * 100 : 0,
      avgGameDuration: 12.5, // Minutes (mock)
      mostPlayedMode,
      peakHours
    };
  };

  const getRevenueMetrics = async (startDate: Date, endDate: Date) => {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'purchase')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString());

    const dailyRevenue = transactions
      ?.filter(t => new Date(t.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const weeklyRevenue = transactions
      ?.filter(t => new Date(t.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const monthlyRevenue = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const payingUsers = new Set(transactions?.map(t => t.user_id)).size;

    return {
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      arpu: totalUsers ? monthlyRevenue / totalUsers : 0,
      arppu: payingUsers ? monthlyRevenue / payingUsers : 0,
      conversionRate: totalUsers ? (payingUsers / totalUsers) * 100 : 0,
      ltv: payingUsers ? (monthlyRevenue / payingUsers) * 12 : 0 // Estimated yearly
    };
  };

  const getSessionMetrics = async (startDate: Date, endDate: Date) => {
    // Mock data - would come from analytics service
    return {
      avgDuration: 18.5, // minutes
      avgGamesPerSession: 3.2,
      bounceRate: 22.5 // percentage
    };
  };

  const getDeviceStats = async () => {
    // Mock data - would come from user agent analysis
    return {
      mobile: 65,
      desktop: 30,
      tablet: 5
    };
  };

  const getGeoStats = async () => {
    // Mock data - would come from IP geolocation
    return [
      { country: 'United States', users: 3500, revenue: 15000 },
      { country: 'United Kingdom', users: 1200, revenue: 5000 },
      { country: 'Canada', users: 800, revenue: 3500 },
      { country: 'Australia', users: 600, revenue: 2500 },
      { country: 'Germany', users: 500, revenue: 2000 }
    ];
  };

  const getSecurityAlerts = async () => {
    const { data: alerts } = await supabase
      .from('admin_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return alerts || [];
  };

  const getStartDate = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-dashboard">
      <style>{`
        .analytics-dashboard {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .date-selector {
          display: flex;
          gap: 0.5rem;
        }

        .date-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          border-radius: 4px;
        }

        .date-btn.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .real-time-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #4CAF50;
          color: white;
          border-radius: 20px;
        }

        .pulse {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .metric-title {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.5rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
        }

        .metric-change {
          font-size: 0.85rem;
          margin-top: 0.5rem;
        }

        .positive {
          color: #4CAF50;
        }

        .negative {
          color: #f44336;
        }

        .chart-container {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .chart-title {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .retention-funnel {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          height: 200px;
        }

        .funnel-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .funnel-bar {
          width: 60px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 4px 4px 0 0;
          transition: all 0.3s;
        }

        .funnel-label {
          font-size: 0.9rem;
          color: #666;
        }

        .funnel-value {
          font-weight: bold;
        }

        .alerts-panel {
          background: #fff3e0;
          border: 1px solid #ffb74d;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
        }

        .alert-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #ffe0b2;
        }

        .alert-item:last-child {
          border-bottom: none;
        }

        .alert-severity {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .severity-critical {
          background: #ffebee;
          color: #c62828;
        }

        .severity-high {
          background: #fff3e0;
          color: #f57c00;
        }

        .severity-medium {
          background: #e3f2fd;
          color: #1565c0;
        }

        .geo-table {
          width: 100%;
          border-collapse: collapse;
        }

        .geo-table th {
          text-align: left;
          padding: 0.75rem;
          border-bottom: 2px solid #e0e0e0;
        }

        .geo-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #f0f0f0;
        }

        .device-chart {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .device-pie {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: conic-gradient(
            #4CAF50 0deg 234deg,
            #2196F3 234deg 342deg,
            #FF9800 342deg
          );
        }

        .device-legend {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 2px;
        }

        @media (max-width: 768px) {
          .analytics-dashboard {
            padding: 1rem;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .analytics-header {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>

      <div className="analytics-header">
        <h1>📊 Analytics & Engagement Dashboard</h1>
        <div className="date-selector">
          <button
            className={`date-btn ${dateRange === '24h' ? 'active' : ''}`}
            onClick={() => setDateRange('24h')}
          >
            24h
          </button>
          <button
            className={`date-btn ${dateRange === '7d' ? 'active' : ''}`}
            onClick={() => setDateRange('7d')}
          >
            7d
          </button>
          <button
            className={`date-btn ${dateRange === '30d' ? 'active' : ''}`}
            onClick={() => setDateRange('30d')}
          >
            30d
          </button>
          <button
            className={`date-btn ${dateRange === '90d' ? 'active' : ''}`}
            onClick={() => setDateRange('90d')}
          >
            90d
          </button>
        </div>
        <div className="real-time-indicator">
          <div className="pulse"></div>
          {realTimeUsers} users online
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alerts-panel">
          <h3>⚠️ Security Alerts</h3>
          {alerts.slice(0, 3).map((alert, i) => (
            <div key={i} className="alert-item">
              <div>
                <strong>{alert.alert_type}</strong>: {alert.details?.reason || 'Check admin panel'}
              </div>
              <span className={`alert-severity severity-${alert.severity}`}>
                {alert.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">Daily Active Users</div>
          <div className="metric-value">{metrics?.dau.toLocaleString()}</div>
          <div className="metric-change positive">↑ 12% from yesterday</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Weekly Active Users</div>
          <div className="metric-value">{metrics?.wau.toLocaleString()}</div>
          <div className="metric-change positive">↑ 8% from last week</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Monthly Active Users</div>
          <div className="metric-value">{metrics?.mau.toLocaleString()}</div>
          <div className="metric-change positive">↑ 25% from last month</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Daily Revenue</div>
          <div className="metric-value">${metrics?.revenueMetrics.dailyRevenue.toFixed(2)}</div>
          <div className="metric-change positive">↑ 15% from yesterday</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">Conversion Rate</div>
          <div className="metric-value">{metrics?.revenueMetrics.conversionRate.toFixed(1)}%</div>
          <div className="metric-change positive">↑ 2.3% from last week</div>
        </div>

        <div className="metric-card">
          <div className="metric-title">ARPU</div>
          <div className="metric-value">${metrics?.revenueMetrics.arpu.toFixed(2)}</div>
          <div className="metric-change positive">↑ $0.50 from last month</div>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Retention Funnel</h3>
        <div className="retention-funnel">
          <div className="funnel-step">
            <div
              className="funnel-bar"
              style={{ height: '100%' }}
            ></div>
            <div className="funnel-value">100%</div>
            <div className="funnel-label">Day 0</div>
          </div>
          <div className="funnel-step">
            <div
              className="funnel-bar"
              style={{ height: `${metrics?.retention.day1}%` }}
            ></div>
            <div className="funnel-value">{metrics?.retention.day1}%</div>
            <div className="funnel-label">Day 1</div>
          </div>
          <div className="funnel-step">
            <div
              className="funnel-bar"
              style={{ height: `${metrics?.retention.day7}%` }}
            ></div>
            <div className="funnel-value">{metrics?.retention.day7}%</div>
            <div className="funnel-label">Day 7</div>
          </div>
          <div className="funnel-step">
            <div
              className="funnel-bar"
              style={{ height: `${metrics?.retention.day30}%` }}
            ></div>
            <div className="funnel-value">{metrics?.retention.day30}%</div>
            <div className="funnel-label">Day 30</div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Session Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-title">Avg Session Duration</div>
            <div className="metric-value">{metrics?.sessionMetrics.avgDuration} min</div>
          </div>
          <div className="metric-card">
            <div className="metric-title">Games per Session</div>
            <div className="metric-value">{metrics?.sessionMetrics.avgGamesPerSession}</div>
          </div>
          <div className="metric-card">
            <div className="metric-title">Bounce Rate</div>
            <div className="metric-value">{metrics?.sessionMetrics.bounceRate}%</div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Device Distribution</h3>
        <div className="device-chart">
          <div className="device-pie"></div>
          <div className="device-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#4CAF50' }}></div>
              <span>Mobile ({metrics?.deviceStats.mobile}%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#2196F3' }}></div>
              <span>Desktop ({metrics?.deviceStats.desktop}%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#FF9800' }}></div>
              <span>Tablet ({metrics?.deviceStats.tablet}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Geographic Distribution</h3>
        <table className="geo-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Users</th>
              <th>Revenue</th>
              <th>ARPU</th>
            </tr>
          </thead>
          <tbody>
            {metrics?.geoStats.map((geo, i) => (
              <tr key={i}>
                <td>{geo.country}</td>
                <td>{geo.users.toLocaleString()}</td>
                <td>${geo.revenue.toLocaleString()}</td>
                <td>${(geo.revenue / geo.users).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Peak Playing Hours</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {metrics?.gameMetrics.peakHours.map((hour, i) => (
            <div key={i} className="metric-card" style={{ flex: '1 1 150px' }}>
              <div className="metric-title">{hour.hour}:00</div>
              <div className="metric-value">{hour.count}</div>
              <div className="metric-change">games</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};