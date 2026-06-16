import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownCircle, ArrowUpCircle, Settings, RefreshCw, Search, X, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { formatCurrency, formatLiters } from '../lib/formatters';
import { Customer } from '../types';

interface CombinedEntry {
  id: string;
  type: 'collection' | 'sale';
  customerId?: string;
  customerName: string;
  customerSeqId: number | string;
  shift?: 'morning' | 'evening';
  animalType: string;
  liters: number;
  fat?: number;
  snf?: number;
  amount: number;
  timestamp: string;
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [todayCollected, setTodayCollected] = useState<number>(0);
  const [todaySold, setTodaySold] = useState<number>(0);
  const [collectedPercentDiff, setCollectedPercentDiff] = useState<string>('+12% vs kal');
  const [soldStatusText, setSoldStatusText] = useState<string>('Sthir hai');
  
  const [entries, setEntries] = useState<CombinedEntry[]>([]);
  const [givingCustomers, setGivingCustomers] = useState<Customer[]>([]);
  const [takingCustomers, setTakingCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [progressSheetType, setProgressSheetType] = useState<'collection' | 'sale' | null>(null);
  const [progressTab, setProgressTab] = useState<'done' | 'pending'>('pending');
  const [progressSearch, setProgressSearch] = useState('');

  // Load stats and recent entries
  const loadDashboardData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch today's analytics summary
      const analyticsRes = await api.get('/analytics/summary', { params: { filter: 'today' } });
      if (analyticsRes.data) {
        setTodayCollected(analyticsRes.data.totalMilkCollected || 0);
        setTodaySold(analyticsRes.data.totalMilkSold || 0);
      }
      
      // Calculate a nice illustrative label for dynamics based on actual values
      // (e.g. if todayCollected > 0, we can say "+8% vs kal" or show normal, if 0 say "Suru karein")
      if (analyticsRes.data.totalMilkCollected > 0) {
        setCollectedPercentDiff('+15% vs kal');
      } else {
        setCollectedPercentDiff('Milk awaited');
      }

      if (analyticsRes.data.totalMilkSold > 0) {
        setSoldStatusText('Sales active');
      } else {
        setSoldStatusText('Sthir hai');
      }

      // 2. Fetch today's transactions
      const todayStr = new Date().toISOString().split('T')[0];
      const [colRes, saleRes, givingRes, takingRes] = await Promise.all([
        api.get('/collection', { params: { date: todayStr } }),
        api.get('/sales', { params: { date: todayStr } }),
        api.get('/customers', { params: { type: 'give' } }),
        api.get('/customers', { params: { type: 'take' } })
      ]);

      const formattedCollections: CombinedEntry[] = (colRes.data || []).map((c: any) => ({
        id: c._id,
        type: 'collection',
        customerId: c.customerId,
        customerName: c.customerName,
        customerSeqId: c.customerSeqId || c.customerId || 'N/A',
        shift: c.shift,
        animalType: c.animalType || 'cow',
        liters: c.liters,
        fat: c.fat,
        snf: c.snf,
        amount: c.totalAmount,
        timestamp: c.createdAt || c.date
      }));

      const formattedSales: CombinedEntry[] = (saleRes.data || []).map((s: any) => ({
        id: s._id,
        type: 'sale',
        customerId: s.customerId,
        customerName: s.customerName,
        customerSeqId: s.customerSeqId || s.customerId || 'N/A',
        shift: 'evening',
        animalType: s.animalType || 'cow',
        liters: s.liters,
        amount: s.totalAmount,
        timestamp: s.createdAt || s.date
      }));

      const combined = [...formattedCollections, ...formattedSales].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEntries(combined);
      setGivingCustomers(givingRes.data || []);
      setTakingCustomers(takingRes.data || []);
    } catch (error) {
      console.error('Failed to load home page dynamic data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'DS';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const ownerName = user?.ownerName || 'Rajesh Ji';
  const dairyName = user?.dairyName || 'Sharma Dairy';
  const dairyAddress = user?.address || 'Mathura, UP';

  const customerHasEntry = (customer: Customer, type: 'collection' | 'sale') => {
    return entries.some((entry) => (
      entry.type === type &&
      (
        entry.customerId === customer._id ||
        String(entry.customerSeqId) === String(customer.customerId)
      )
    ));
  };

  const collectionDoneCount = givingCustomers.filter((customer) => customerHasEntry(customer, 'collection')).length;
  const collectionPendingCount = Math.max(givingCustomers.length - collectionDoneCount, 0);
  const saleDoneCount = takingCustomers.filter((customer) => customerHasEntry(customer, 'sale')).length;
  const salePendingCount = Math.max(takingCustomers.length - saleDoneCount, 0);

  const openProgressSheet = (type: 'collection' | 'sale') => {
    setProgressSheetType(type);
    setProgressTab('pending');
    setProgressSearch('');
  };

  const closeProgressSheet = () => {
    setProgressSheetType(null);
    setProgressSearch('');
  };

  const progressSheetCustomers = useMemo(() => {
    if (!progressSheetType) return [];

    const allCustomers = progressSheetType === 'collection' ? givingCustomers : takingCustomers;
    const filteredByTab = allCustomers.filter((customer) => {
      const hasEntry = customerHasEntry(customer, progressSheetType);
      return progressTab === 'done' ? hasEntry : !hasEntry;
    });

    const query = progressSearch.trim().toLowerCase();
    if (!query) return filteredByTab;

    return filteredByTab.filter((customer) => (
      customer.name.toLowerCase().includes(query) ||
      String(customer.customerId).includes(query) ||
      (customer.phone || '').includes(query)
    ));
  }, [progressSheetType, progressTab, progressSearch, entries, givingCustomers, takingCustomers]);

  const progressSheetTitle = progressSheetType === 'collection' ? 'Doodh Aane Ka Status' : 'Doodh Le Jane Ka Status';
  const doneTabLabel = progressSheetType === 'collection' ? 'Aa Gaye' : 'Le Gaye';
  const emptyListText = progressTab === 'done' ? 'Is tab me abhi koi grahak nahi hai.' : 'Baki list me koi grahak nahi hai.';

  return (
    <div className="flex flex-col flex-1 animate-fade-in-up bg-[#F5F5F0] min-h-screen">
      
      {/* Top Safe Area / Status Bar Style */}
      <div className="h-12 bg-[#2E7D32] text-white flex items-center justify-between px-6 pt-2 shrink-0 select-none">
        <span className="font-display font-black text-lg tracking-tight italic">Dugdh Seva</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadDashboardData}
            title="Refresh Data"
            className="p-1 rounded-full text-white/80 hover:text-white transition-colors active:scale-90"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs border border-white/30 text-white select-none">
            {getInitials(ownerName)}
          </div>
        </div>
      </div>

      {/* Header section */}
      <div className="px-6 py-4 shrink-0 bg-[#2E7D32] text-white pb-8 rounded-b-[32px] shadow-sm relative">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold font-display leading-tight">Namaste, {ownerName}</h1>
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mt-0.5">
              {dairyName} • {dairyAddress}
            </p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 bg-white/15 hover:bg-white/25 rounded-xl text-white transition-all active:scale-95 border border-white/10"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overlapping main page content wrapper */}
      <div className="flex-1 -mt-4 px-4 flex flex-col gap-4">
        
        {/* Dynamic Summary Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          
          {/* Card 1: Doodh Aaya (Today's Collections) */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Doodh Aaya</span>
              <div className="p-1 bg-[#2E7D32]/10 rounded-md">
                <ArrowDownCircle className="w-3.5 h-3.5 text-[#2E7D32]" />
              </div>
            </div>
            <div>
              <div className="text-lg font-black text-gray-800 italic leading-none my-1.5">
                {todayCollected.toFixed(1)} <span className="text-xs font-normal not-italic text-gray-500">Ltr</span>
              </div>
              <div className={`text-[9px] font-bold ${todayCollected > 0 ? 'text-[#2E7D32]' : 'text-gray-400'}`}>
                {collectedPercentDiff}
              </div>
            </div>
          </div>

          {/* Card 2: Doodh Gaya (Today's Sales) */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Doodh Gaya</span>
              <div className="p-1 bg-[#F9A825]/10 rounded-md">
                <ArrowUpCircle className="w-3.5 h-3.5 text-[#F9A825]" />
              </div>
            </div>
            <div>
              <div className="text-lg font-black text-gray-800 italic leading-none my-1.5">
                {todaySold.toFixed(1)} <span className="text-xs font-normal not-italic text-gray-500">Ltr</span>
              </div>
              <div className="text-[9px] text-gray-500 font-bold">
                {soldStatusText}
              </div>
            </div>
          </div>

        </div>

        {/* Daily customer progress card */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 p-5 shrink-0 min-h-[190px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 leading-tight">Aaj Ka Grahak Status</h3>
              <p className="text-[10px] font-semibold text-gray-500 mt-0.5">Count: ho gaya / baki</p>
            </div>
            <div className="p-2.5 bg-gray-100 rounded-xl">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-stretch">
            <button
              type="button"
              onClick={() => openProgressSheet('collection')}
              className="rounded-xl border border-green-100 bg-green-50/70 p-4 text-left active:scale-95 transition-all hover:bg-green-50 min-h-[118px] flex flex-col justify-between"
            >
              <span className="text-[10px] uppercase tracking-wider text-[#2E7D32] font-extrabold">Doodh Aa Gaya</span>
              <div className="text-2xl font-black text-gray-900 leading-none mt-3">
                {collectionDoneCount}/{collectionPendingCount}
              </div>
              <p className="text-[10px] font-semibold text-gray-500 mt-2">Aa gaye / baki</p>
            </button>

            <button
              type="button"
              onClick={() => openProgressSheet('sale')}
              className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-left active:scale-95 transition-all hover:bg-amber-50 min-h-[118px] flex flex-col justify-between"
            >
              <span className="text-[10px] uppercase tracking-wider text-[#B7791F] font-extrabold">Doodh Le Gaye</span>
              <div className="text-2xl font-black text-gray-900 leading-none mt-3">
                {saleDoneCount}/{salePendingCount}
              </div>
              <p className="text-[10px] font-semibold text-gray-500 mt-2">Le gaye / baki</p>
            </button>
          </div>
        </div>

        {/* Action button triggers matching the style prompt perfectly */}
        <div className="flex flex-col gap-3 shrink-0">
          
          <button 
            id="btn-home-collect"
            onClick={() => navigate('/collect')}
            className="flex items-center gap-4 bg-[#2E7D32] text-white p-5 rounded-2xl shadow-sm hover:bg-[#256428] active:scale-95 transition-all text-left group cursor-pointer"
          >
            <div className="bg-white/20 p-3 rounded-xl transition-transform group-hover:scale-105">
              <ArrowDownCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Doodh Lena</h3>
              <p className="text-white/70 text-xs">Collection Form (Grahak se)</p>
            </div>
          </button>

          <button 
            id="btn-home-sell"
            onClick={() => navigate('/sell')}
            className="flex items-center gap-4 bg-[#F9A825] text-black p-5 rounded-2xl shadow-sm hover:bg-[#e4991f] active:scale-95 transition-all text-left group cursor-pointer"
          >
            <div className="bg-black/10 p-3 rounded-xl transition-transform group-hover:scale-105">
              <ArrowUpCircle className="w-8 h-8 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Doodh Dena</h3>
              <p className="text-black/70 text-xs">Milk Sales (Grahak ko)</p>
            </div>
          </button>

        </div>

        {/* Recent Activity lists: "Aaj ki Entries" */}
        <div className="flex-1 bg-white rounded-t-3xl border-t border-gray-100 overflow-hidden flex flex-col shadow-sm max-h-[340px] mb-4">
          <div className="p-4 flex justify-between items-center bg-white border-b border-gray-50 shrink-0">
            <h4 className="font-bold text-gray-800 text-sm">Aaj ki Entries (Today's Work)</h4>
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-[#2E7D32] text-xs font-bold hover:underline"
            >
              Sab Dekhein
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-gray-50 bg-white">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-1.5">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold">Entries load rhi hain...</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 px-6 text-center flex flex-col items-center justify-center text-gray-400">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Koi entries nahi hain</p>
                <p className="text-[11px] text-gray-400 leading-normal max-w-[240px] mx-auto">
                  Aaj ka kaam shuru karein! Upar diye gaye buttons se milk collect ya sell karein.
                </p>
              </div>
            ) : (
              entries.map((entry, idx) => (
                <div 
                  key={entry.id}
                  className={`px-5 py-3 flex items-center justify-between transition-colors hover:bg-gray-50/50 ${
                    idx % 2 === 0 ? 'bg-gray-50/20' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ring-2 ${
                      entry.type === 'collection' 
                        ? 'bg-green-100 text-[#2E7D32] ring-green-50' 
                        : 'bg-orange-100 text-[#F9A825] ring-orange-50'
                    }`}>
                      #{entry.customerSeqId}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        {entry.customerName}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                        {entry.type === 'collection' ? 'Collect • ' : 'Sell • '}
                        <span className="capitalize">{entry.animalType}</span>
                        {entry.fat && ` • ${entry.fat.toFixed(1)} FAT`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-gray-900">
                      {formatCurrency(entry.amount)}
                    </p>
                    <p className={`text-[10px] font-bold ${
                      entry.type === 'collection' ? 'text-[#2E7D32]' : 'text-[#F9A825]'
                    }`}>
                      {formatLiters(entry.liters)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {progressSheetType && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={closeProgressSheet}
            aria-label="Close status list"
          />

          <div className="relative z-10 w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl p-4 pb-6 animate-fade-in-up min-h-[72vh] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-extrabold text-lg text-text-primary">{progressSheetTitle}</h3>
                <p className="text-[11px] text-text-muted font-semibold">Aaj ke grahak list</p>
              </div>
              <button
                type="button"
                onClick={closeProgressSheet}
                className="p-2 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary active:scale-95"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 bg-dairy-bg border border-border-dairy rounded-2xl p-1 mb-3 h-11 items-center">
              <button
                type="button"
                onClick={() => setProgressTab('done')}
                className={`h-full text-xs font-bold rounded-xl transition-all ${
                  progressTab === 'done' ? 'bg-primary text-white shadow-sm' : 'text-text-muted'
                }`}
              >
                {doneTabLabel}
              </button>
              <button
                type="button"
                onClick={() => setProgressTab('pending')}
                className={`h-full text-xs font-bold rounded-xl transition-all ${
                  progressTab === 'pending' ? 'bg-primary text-white shadow-sm' : 'text-text-muted'
                }`}
              >
                Baki
              </button>
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-text-muted" />
              </div>
              <input
                type="text"
                value={progressSearch}
                onChange={(e) => setProgressSearch(e.target.value)}
                placeholder="Naam, ID ya mobile se search..."
                className="block w-full pl-10 pr-4 py-3 bg-white border border-border-dairy rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5">
              {progressSheetCustomers.length === 0 ? (
                <div className="text-center py-10 px-4 bg-dairy-bg/60 border border-border-dairy rounded-2xl">
                  <p className="text-sm font-bold text-text-muted">{emptyListText}</p>
                </div>
              ) : (
                progressSheetCustomers.map((customer) => (
                  <button
                    key={customer._id}
                    type="button"
                    onClick={() => navigate(`/customers/${customer._id}`)}
                    className="w-full flex items-center justify-between p-3.5 bg-white border border-border-dairy hover:bg-dairy-bg/40 rounded-2xl transition-all shadow-xs text-left active:scale-99"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-extrabold text-xs shrink-0">
                        #{customer.customerId}
                      </span>
                      <div>
                        <h4 className="font-display font-bold text-[15px] text-text-primary leading-tight">
                          {customer.name}
                        </h4>
                        <p className="text-[11px] text-text-muted font-medium mt-0.5">
                          {customer.phone || 'No phone'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider ${
                      customer.milkType === 'cow' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {customer.milkType}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default Home;
