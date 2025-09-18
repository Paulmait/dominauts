import React, { useEffect, useState } from 'react';
import { comprehensiveAnalytics } from '../../services/ComprehensiveAnalytics';
import { adminRefundService } from '../../services/AdminRefundService';
import { supabase } from '../../services/SupabaseService';

interface KPICard {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  format?: 'number' | 'currency' | 'percentage';
}

export const InvestorDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [dateRange]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Load comprehensive metrics
      const investorMetrics = await comprehensiveAnalytics.getInvestorMetrics();
      const refundMetrics = await adminRefundService.getRefundMetrics(getDaysFromRange(dateRange));

      // Load additional metrics from Supabase
      const { data: financialData } = await supabase
        .from('financial_summary')
        .select('*')
        .single();

      const { data: userGrowth } = await supabase
        .from('user_growth_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      setMetrics({
        ...investorMetrics,
        refunds: refundMetrics,
        financial: financialData,
        growth_chart: userGrowth
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysFromRange = (range: string): number => {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  };

  const formatMetric = (value: number, format?: string): string => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }
    if (format === 'percentage') {
      return `${value.toFixed(2)}%`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  };

  const exportData = async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - getDaysFromRange(dateRange));

    const data = await comprehensiveAnalytics.exportAnalyticsData(
      startDate.toISOString(),
      new Date().toISOString(),
      exportFormat
    );

    // Create download
    const blob = new Blob([exportFormat === 'csv' ? data : JSON.stringify(data, null, 2)], {
      type: exportFormat === 'csv' ? 'text/csv' : 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investor-metrics-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const kpiCards: KPICard[] = [
    {
      label: 'MRR',
      value: metrics?.mrr || 0,
      change: 12.5,
      trend: 'up',
      format: 'currency'
    },
    {
      label: 'ARR',
      value: metrics?.arr || 0,
      change: 15.2,
      trend: 'up',
      format: 'currency'
    },
    {
      label: 'DAU',
      value: metrics?.dau || 0,
      change: 8.3,
      trend: 'up',
      format: 'number'
    },
    {
      label: 'MAU',
      value: metrics?.mau || 0,
      change: 22.1,
      trend: 'up',
      format: 'number'
    },
    {
      label: 'Conversion Rate',
      value: metrics?.conversion_rate || 0,
      change: 2.5,
      trend: 'up',
      format: 'percentage'
    },
    {
      label: 'Churn Rate',
      value: metrics?.churn_rate || 0,
      change: -1.2,
      trend: 'down',
      format: 'percentage'
    },
    {
      label: 'LTV',
      value: metrics?.ltv || 0,
      change: 5.8,
      trend: 'up',
      format: 'currency'
    },
    {
      label: 'CAC',
      value: metrics?.cac || 0,
      change: -3.2,
      trend: 'down',
      format: 'currency'
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Investor Dashboard</h1>
            <p className="text-gray-600 mt-1">Comprehensive metrics and KPIs</p>
          </div>
          <div className="flex gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <div className="flex gap-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-gray-600">{kpi.label}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                kpi.trend === 'up' ? 'bg-green-100 text-green-600' :
                kpi.trend === 'down' ? 'bg-red-100 text-red-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'} {Math.abs(kpi.change)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatMetric(Number(kpi.value), kpi.format)}
            </div>
          </div>
        ))}
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">User Growth</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">New Users Today</span>
              <span className="font-semibold">{formatMetric(metrics?.new_users_today || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">New Users This Week</span>
              <span className="font-semibold">{formatMetric(metrics?.new_users_week || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">New Users This Month</span>
              <span className="font-semibold">{formatMetric(metrics?.new_users_month || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Growth Rate (Monthly)</span>
              <span className="font-semibold text-green-600">
                +{metrics?.growth_rate_month || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue Today</span>
              <span className="font-semibold">
                {formatMetric(metrics?.revenue_today || 0, 'currency')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue This Week</span>
              <span className="font-semibold">
                {formatMetric(metrics?.revenue_week || 0, 'currency')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue This Month</span>
              <span className="font-semibold">
                {formatMetric(metrics?.revenue_month || 0, 'currency')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue YTD</span>
              <span className="font-semibold">
                {formatMetric(metrics?.revenue_ytd || 0, 'currency')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Retention Funnel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Retention Funnel</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Day 1</span>
                <span>{metrics?.retention_d1 || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics?.retention_d1 || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Day 7</span>
                <span>{metrics?.retention_d7 || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics?.retention_d7 || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Day 30</span>
                <span>{metrics?.retention_d30 || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics?.retention_d30 || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Engagement</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 text-sm">Avg Session Duration</span>
              <span className="font-semibold">
                {Math.floor((metrics?.avg_session_duration || 0) / 60)}m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 text-sm">Sessions per User</span>
              <span className="font-semibold">{metrics?.avg_sessions_per_user?.toFixed(1) || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 text-sm">Bounce Rate</span>
              <span className="font-semibold">{metrics?.bounce_rate || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 text-sm">Stickiness (DAU/MAU)</span>
              <span className="font-semibold">{metrics?.stickiness?.toFixed(2) || 0}%</span>
            </div>
          </div>
        </div>

        {/* Game Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Game Performance</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 text-sm">Games Today</span>
              <span className="font-semibold">{formatMetric(metrics?.games_played_today || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 text-sm">Avg Game Duration</span>
              <span className="font-semibold">
                {Math.floor((metrics?.avg_game_duration || 0) / 60)}m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 text-sm">Completion Rate</span>
              <span className="font-semibold">{metrics?.completion_rate || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 text-sm">Multiplayer Rate</span>
              <span className="font-semibold">{metrics?.multiplayer_rate || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Device Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Platform Distribution</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Mobile</span>
              </div>
              <span className="font-semibold">{metrics?.mobile_users_pct || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Desktop</span>
              </div>
              <span className="font-semibold">{metrics?.desktop_users_pct || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="text-sm">iOS</span>
              </div>
              <span className="font-semibold">{metrics?.ios_users_pct || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm">Android</span>
              </div>
              <span className="font-semibold">{metrics?.android_users_pct || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                <span className="text-sm">PWA Installs</span>
              </div>
              <span className="font-semibold">{formatMetric(metrics?.pwa_installs || 0)}</span>
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top Countries</h2>
          <div className="space-y-3">
            {metrics?.top_countries?.slice(0, 5).map((country: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm">{country.country}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {formatMetric(country.users)} users
                  </span>
                  <span className="font-semibold">
                    {formatMetric(country.revenue, 'currency')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technical Metrics & Customer Satisfaction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Technical Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Technical Health</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Load Time</span>
              <span className={`font-semibold ${
                metrics?.avg_load_time < 3000 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(metrics?.avg_load_time / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Crash Rate</span>
              <span className={`font-semibold ${
                metrics?.crash_rate < 1 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics?.crash_rate?.toFixed(2) || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Error Rate</span>
              <span className={`font-semibold ${
                metrics?.error_rate < 1 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics?.error_rate?.toFixed(2) || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">API Latency</span>
              <span className="font-semibold">{metrics?.api_latency || 0}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Server Uptime</span>
              <span className="font-semibold text-green-600">
                {metrics?.server_uptime || 99.9}%
              </span>
            </div>
          </div>
        </div>

        {/* Customer Satisfaction */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Satisfaction</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">NPS Score</span>
              <span className={`font-semibold text-2xl ${
                metrics?.nps_score > 50 ? 'text-green-600' :
                metrics?.nps_score > 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics?.nps_score || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">CSAT Score</span>
              <span className="font-semibold">{metrics?.csat_score || 0}/5.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Support Tickets</span>
              <span className="font-semibold">{metrics?.support_tickets || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Resolution Time</span>
              <span className="font-semibold">
                {Math.floor((metrics?.avg_resolution_time || 0) / 60)}h
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Metrics */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Refund Analytics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Refunds</p>
            <p className="text-2xl font-bold">{metrics?.refunds?.total_refunds || 0}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Amount</p>
            <p className="text-2xl font-bold">
              {formatMetric(metrics?.refunds?.total_amount || 0, 'currency')}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Refund Rate</p>
            <p className="text-2xl font-bold">
              {metrics?.refunds?.refund_rate?.toFixed(2) || 0}%
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Avg Processing Time</p>
            <p className="text-2xl font-bold">
              {metrics?.refunds?.avg_processing_time || 0}m
            </p>
          </div>
        </div>
        {metrics?.refunds?.top_reasons?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Top Refund Reasons</h3>
            <div className="space-y-2">
              {metrics.refunds.top_reasons.map((reason: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm capitalize">
                    {reason.reason.replace(/_/g, ' ')}
                  </span>
                  <span className="font-semibold">{reason.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cohort Analysis */}
      {metrics?.cohorts?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Cohort Analysis</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Cohort</th>
                  <th className="text-right py-2">Users</th>
                  <th className="text-right py-2">D1 Retention</th>
                  <th className="text-right py-2">D7 Retention</th>
                  <th className="text-right py-2">D30 Retention</th>
                  <th className="text-right py-2">LTV</th>
                </tr>
              </thead>
              <tbody>
                {metrics.cohorts.slice(0, 5).map((cohort: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{cohort.cohort}</td>
                    <td className="text-right py-2">{formatMetric(cohort.users)}</td>
                    <td className="text-right py-2">{cohort.retention_d1}%</td>
                    <td className="text-right py-2">{cohort.retention_d7}%</td>
                    <td className="text-right py-2">{cohort.retention_d30}%</td>
                    <td className="text-right py-2">
                      {formatMetric(cohort.ltv, 'currency')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};