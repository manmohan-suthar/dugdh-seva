import React, { useState, useEffect } from 'react';
import { 
  TrendingDown, TrendingUp, Users, AlertCircle, Wallet, 
  IndianRupee, ArrowDownCircle, ArrowUpCircle, Calendar,
  BarChart2, RefreshCw
} from 'lucide-react';
import api from '../api/client';
import { AnalyticsSummary } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import { formatCurrency, formatLiters, formatDate } from '../lib/formatters';

export const Dashboard: React.FC = () => {
  const [filter, setFilter] = useState<'today' | '7days' | '30days'>('today');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [filter]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/analytics/summary', { params: { filter } });
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setToastMessage('Dashboard metrics load nahi ho sake!');
    } finally {
      setIsLoading(false);
    }
  };

  const getPeriodLabel = () => {
    if (filter === 'today') return 'Aaj Ka Kaam (Today)';
    if (filter === '7days') return 'Pichle 7 Dino Ka Kaam';
    return 'Pichle 30 Dino Ka Kaam';
  };

  // Helper to get formatted dates
  const formatBreakdownDate = (dateString: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    try {
      const parts = dateString.split('-');
      if (parts.length >= 3) {
        const day = parseInt(parts[2]);
        const monthIndex = parseInt(parts[1]) - 1;
        return `${day} ${months[monthIndex]}`;
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <LoadingSpinner message="Dastkhat/Dashboard taiyar ho raha hai..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-24 animate-fade-in-up">
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          type="error" 
          onClose={() => setToastMessage(null)} 
        />
      )}

      {/* Top Title and Filters dropdown */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          <h2 className="font-display font-extrabold text-xl text-text-primary">
            Dashboard
          </h2>
        </div>
        
        {/* Dropdown element */}
        <div className="relative">
          <select
            id="filter-dropdown"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="block py-1.5 pl-3 pr-8 bg-white border border-border-dairy rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary h-[34px] appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M7 9l3 3 3-3' stroke='%232E7D32' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 8px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px'
            }}
          >
            <option value="today">Today</option>
            <option value="7days">7 Days</option>
            <option value="30days">30 Days</option>
          </select>
        </div>
      </div>

      {data && (
        <div className="space-y-4">
          {/* Main summary badge card (Green/Primary tint) */}
          <div className="p-4 bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10">
              <Calendar className="w-32 h-32" />
            </div>
            
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
                  Selected Period
                </span>
                <h3 className="font-display font-bold text-lg leading-tight mt-0.5">
                  {getPeriodLabel()}
                </h3>
              </div>
              <button 
                onClick={loadAnalytics}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors tap-feedback"
                aria-label="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 z-10 relative border-t border-white/10 pt-3">
              <div>
                <span className="text-[10px] text-white/80 font-semibold uppercase">Total Milk Collected</span>
                <p className="font-display font-black text-lg">{formatLiters(data.totalMilkCollected)}</p>
              </div>
              <div>
                <span className="text-[10px] text-white/80 font-semibold uppercase">Total Milk Sold</span>
                <p className="font-display font-black text-lg">{formatLiters(data.totalMilkSold)}</p>
              </div>
            </div>
          </div>

          {/* Metric Grid (Row 1 & 2 - Core Sales / Collection metrics) */}
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
            Mukhya Metrics (Core Stats)
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Metric 1: Doodh Aaya */}
            <div className="p-3 bg-white border border-border-dairy rounded-xl shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-muted uppercase leading-tight">Doodh Aaya</span>
                <span className="p-1.5 bg-green-100 rounded-lg text-primary">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <p className="font-display font-extrabold text-base text-text-primary mt-2">
                {formatLiters(data.totalMilkCollected)}
              </p>
              <span className="text-[10px] font-semibold text-text-muted">Total Collections</span>
            </div>

            {/* Metric 2: Doodh Gaya */}
            <div className="p-3 bg-white border border-border-dairy rounded-xl shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-muted uppercase leading-tight">Doodh Gaya</span>
                <span className="p-1.5 bg-amber-100 rounded-lg text-accent">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <p className="font-display font-extrabold text-base text-text-primary mt-2">
                {formatLiters(data.totalMilkSold)}
              </p>
              <span className="text-[10px] font-semibold text-text-muted">Total Sales</span>
            </div>

            {/* Metric 3: Collected Amount (Kharida) */}
            <div className="p-3 bg-white border border-border-dairy rounded-xl shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-muted uppercase leading-tight">Liya (Rupees)</span>
                <span className="p-1.5 bg-green-100 rounded-lg text-primary">
                  <IndianRupee className="w-4 h-4" />
                </span>
              </div>
              <p className="font-display font-black text-base text-success-dairy mt-2">
                {formatCurrency(data.totalCollectionAmount)}
              </p>
              <span className="text-[10px] font-semibold text-text-muted">Purchases (Buy)</span>
            </div>

            {/* Metric 4: Sold Amount (Becha) */}
            <div className="p-3 bg-white border border-border-dairy rounded-xl shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-text-muted uppercase leading-tight">Diya (Rupees)</span>
                <span className="p-1.5 bg-amber-100 rounded-lg text-accent">
                  <IndianRupee className="w-4 h-4" />
                </span>
              </div>
              <p className="font-display font-black text-base text-accent mt-2">
                {formatCurrency(data.totalSaleAmount)}
              </p>
              <span className="text-[10px] font-semibold text-text-muted">Sales Income</span>
            </div>
          </div>

          {/* Secondary Metric Grid (Row 3 & 4 - Accounts / Customers / Outstanding metrics) */}
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mt-4 mb-2">
            Khata & Grahak Details
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Metric 5: Giving Customers */}
            <div className="p-3.5 bg-white border border-border-dairy rounded-xl shadow-xs flex items-center gap-3">
              <div className="p-2 bg-green-50 text-primary rounded-lg shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-text-muted font-bold uppercase leading-tight">Dene Wale</span>
                <span className="font-display font-extrabold text-base text-text-primary">{data.totalCustomersGiving}</span>
              </div>
            </div>

            {/* Metric 6: Taking Customers */}
            <div className="p-3.5 bg-white border border-border-dairy rounded-xl shadow-xs flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-accent rounded-lg shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-text-muted font-bold uppercase leading-tight">Lene Wale</span>
                <span className="font-display font-extrabold text-base text-text-primary">{data.totalCustomersTaking}</span>
              </div>
            </div>

            {/* Metric 7: Balance Due (Baaki) */}
            <div className="p-3.5 bg-white border border-border-dairy rounded-xl shadow-xs flex items-center gap-3">
              <div className="p-2 bg-red-50 text-danger-dairy rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-text-muted font-bold uppercase leading-tight">Baaki Dues</span>
                <span className="font-display font-black text-[15px] text-danger-dairy">{formatCurrency(data.pendingDues)}</span>
              </div>
            </div>

            {/* Metric 8: Advance Payments Given */}
            <div className="p-3.5 bg-white border border-border-dairy rounded-xl shadow-xs flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-text-muted font-bold uppercase leading-tight">Advance Left</span>
                <span className="font-display font-extrabold text-[15px] text-indigo-600">
                  {formatCurrency(data.advancesRemaining ?? data.advancesGiven)}
                </span>
                <span className="block text-[10px] text-text-muted mt-0.5">
                  Given {formatCurrency(data.advancesGiven)} | Used {formatCurrency(data.advancesUsed ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Breakdown List Table (for 7 / 30 day analytics charts) */}
          {filter !== 'today' && data.dailyBreakdown.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
                Rojana Report (Daily Breakdown)
              </h4>
              <div className="bg-white border border-border-dairy rounded-2xl overflow-hidden shadow-xs">
                {/* Table Header */}
                <div className="grid grid-cols-4 px-4 py-2.5 bg-dairy-bg text-[10px] font-black text-text-muted uppercase tracking-wider border-b border-border-dairy text-center">
                  <div className="text-left">Date</div>
                  <div>In (L)</div>
                  <div>Out (L)</div>
                  <div className="text-right">Net ₹</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border-dairy/50 max-h-[300px] overflow-y-auto no-scrollbar">
                  {data.dailyBreakdown.map((row, idx) => (
                    <div 
                      key={row.date} 
                      className={`grid grid-cols-4 px-4 py-3 text-xs text-center font-semibold items-center ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-dairy-bg/25'
                      }`}
                    >
                      <div className="text-left font-display text-text-primary">
                        {formatBreakdownDate(row.date)}
                      </div>
                      <div className="text-success-dairy">{row.collected.toFixed(1)}L</div>
                      <div className="text-accent">{row.sold.toFixed(1)}L</div>
                      <div className="text-right font-display font-bold text-text-primary">
                        {formatCurrency(row.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
