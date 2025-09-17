/**
 * Admin Dashboard Chart Components
 */

import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  AreaChart, Area, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

/**
 * Revenue Chart Component
 */
export const RevenueChart: React.FC<{ data: any }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No revenue data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        />
        <YAxis tickFormatter={(value) => `$${value}`} />
        <Tooltip 
          formatter={(value: number) => `$${value.toFixed(2)}`}
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
        />
        <Area 
          type="monotone" 
          dataKey="revenue" 
          stroke="#8884d8" 
          fill="#8884d8" 
          fillOpacity={0.6}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/**
 * Activity Heatmap Component
 */
export const ActivityHeatmap: React.FC<{ data: any }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="chart-placeholder">No activity data available</div>;
  }

  // Transform data for heatmap visualization
  const maxValue = Math.max(...data.map((d: any) => d.value));
  
  return (
    <div className="heatmap-container">
      <div className="heatmap-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="heatmap-row">
            <div className="heatmap-label">{day}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const dataPoint = data.find((d: any) => d.day === day && d.hour === hour);
              const intensity = dataPoint ? dataPoint.value / maxValue : 0;
              
              return (
                <div
                  key={`${day}-${hour}`}
                  className="heatmap-cell"
                  style={{
                    backgroundColor: `rgba(136, 132, 216, ${intensity})`,
                    opacity: intensity > 0 ? 1 : 0.1
                  }}
                  title={`${day} ${hour}:00 - ${dataPoint?.value || 0} users`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        <div className="heatmap-gradient" />
        <span>More</span>
      </div>
    </div>
  );
};

/**
 * User Growth Chart
 */
export const UserGrowthChart: React.FC<{ data: any }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="newUsers" stroke="#82ca9d" name="New Users" />
        <Line type="monotone" dataKey="activeUsers" stroke="#8884d8" name="Active Users" />
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Game Mode Distribution
 */
export const GameModeChart: React.FC<{ data: any }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data?.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * Retention Funnel
 */
export const RetentionFunnel: React.FC<{ data: any }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(value) => `${value}%`} />
        <YAxis type="category" dataKey="day" />
        <Tooltip formatter={(value: number) => `${value}%`} />
        <Bar dataKey="retention" fill="#00C49F">
          {data?.map((entry: any, index: number) => (
            <Cell 
              key={`cell-${index}`} 
              fill={`rgba(0, 196, 159, ${1 - index * 0.15})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Real-time Metrics Display
 */
export const RealTimeMetrics: React.FC<{ metrics: any }> = ({ metrics }) => {
  return (
    <div className="realtime-metrics">
      <div className="metric-item pulse">
        <div className="metric-value">{metrics?.online || 0}</div>
        <div className="metric-label">Online Now</div>
        <div className="metric-indicator online" />
      </div>
      <div className="metric-item">
        <div className="metric-value">{metrics?.activeGames || 0}</div>
        <div className="metric-label">Active Games</div>
      </div>
      <div className="metric-item">
        <div className="metric-value">{metrics?.pendingPurchases || 0}</div>
        <div className="metric-label">Pending Purchases</div>
      </div>
      <div className="metric-item">
        <div className="metric-value">${metrics?.revenueToday || '0.00'}</div>
        <div className="metric-label">Revenue Today</div>
      </div>
    </div>
  );
};

/**
 * ARPU Trend Chart
 */
export const ARPUChart: React.FC<{ data: any }> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(value) => `$${value}`} />
        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
        <Line 
          type="monotone" 
          dataKey="arpu" 
          stroke="#FF8042" 
          strokeWidth={2}
          dot={{ fill: '#FF8042' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Conversion Funnel
 */
export const ConversionFunnel: React.FC<{ data: any }> = ({ data }) => {
  const funnelData = [
    { stage: 'Visitors', value: data?.visitors || 1000 },
    { stage: 'Registered', value: data?.registered || 600 },
    { stage: 'First Game', value: data?.firstGame || 400 },
    { stage: 'Repeated', value: data?.repeated || 200 },
    { stage: 'Paid', value: data?.paid || 50 }
  ];

  return (
    <div className="funnel-chart">
      {funnelData.map((stage, index) => {
        const width = 100 - index * 15;
        const percentage = index > 0 
          ? ((stage.value / funnelData[index - 1].value) * 100).toFixed(1)
          : '100';
        
        return (
          <div 
            key={stage.stage}
            className="funnel-stage"
            style={{ width: `${width}%` }}
          >
            <div className="funnel-bar">
              <div className="funnel-label">{stage.stage}</div>
              <div className="funnel-value">{stage.value}</div>
              {index > 0 && (
                <div className="funnel-conversion">{percentage}%</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};