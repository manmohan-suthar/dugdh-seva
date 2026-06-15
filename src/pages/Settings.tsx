import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, LogOut, ShieldAlert, TableProperties, 
  MapPin, Phone, Building, User, Save, RefreshCw, X, ShoppingCart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast, { ToastMessage } from '../components/Toast';
import { formatCurrency } from '../lib/formatters';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [loading, setLoading] = useState(false);

  // Selling Prices State
  const [sellingPrices, setSellingPrices] = useState<any[]>([]);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [cowPrice, setCowPrice] = useState('');
  const [buffaloPrice, setBuffaloPrice] = useState('');
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  // Rate Charts State
  const [activeChartAnimal, setActiveChartAnimal] = useState<'cow' | 'buffalo' | null>(null);
  const [chartEntries, setChartEntries] = useState<any[]>([]);
  const [newFat, setNewFat] = useState('');
  const [newSnf, setNewSnf] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [isSavingChart, setIsSavingChart] = useState(false);

  useEffect(() => {
    loadSellingPrices();
  }, []);

  const loadSellingPrices = async () => {
    try {
      const response = await api.get('/prices');
      setSellingPrices(response.data);
      const cow = response.data.find((p: any) => p.animalType === 'cow');
      const buffalo = response.data.find((p: any) => p.animalType === 'buffalo');
      setCowPrice(cow ? cow.pricePerLiter.toString() : '60');
      setBuffaloPrice(buffalo ? buffalo.pricePerLiter.toString() : '80');
    } catch (err) {
      console.error('Error fetching prices in settings:', err);
    }
  };

  const handleUpdatePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrices(true);
    try {
      // Find the ID of each price document or update it directly
      const cowObj = sellingPrices.find(p => p.animalType === 'cow');
      const buffObj = sellingPrices.find(p => p.animalType === 'buffalo');

      if (cowObj?._id) {
        await api.put(`/prices/${cowObj._id}`, { pricePerLiter: cowPrice });
      } else {
        await api.post('/prices', { animalType: 'cow', pricePerLiter: cowPrice });
      }

      if (buffObj?._id) {
        await api.put(`/prices/${buffObj._id}`, { pricePerLiter: buffaloPrice });
      } else {
        await api.post('/prices', { animalType: 'buffalo', pricePerLiter: buffaloPrice });
      }

      setToast({ id: `pr-suc-${Date.now()}`, type: 'success', text: 'Bikri bhav (Selling prices) save ho gye!' });
      setShowPriceModal(false);
      loadSellingPrices();
    } catch (err: any) {
      setToast({ id: `pr-err-${Date.now()}`, type: 'error', text: 'Price update failed. Kripya details check karein.' });
    } finally {
      setIsSavingPrices(false);
    }
  };

  const loadChartEntries = async (animal: 'cow' | 'buffalo') => {
    setLoading(true);
    try {
      const response = await api.get('/charts', { params: { animalType: animal } });
      if (response.data && response.data.length > 0) {
        setChartEntries(response.data[0].entries || []);
      } else {
        setChartEntries([]);
      }
      setActiveChartAnimal(animal);
    } catch (err) {
      console.error(err);
      setToast({ id: 'chart-err', type: 'error', text: 'Chart load nahi ho saka.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddChartRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChartAnimal || !newFat || !newSnf || !newPrice) return;

    setIsSavingChart(true);
    try {
      const parsedFat = parseFloat(newFat);
      const parsedSnf = parseFloat(newSnf);
      const parsedPrice = parseFloat(newPrice);

      // Fetch active charts
      const response = await api.get('/charts', { params: { animalType: activeChartAnimal } });
      let activeChart = response.data?.[0];

      let updatedEntries = [...chartEntries];
      // Check if entry with same fat & snf already exists
      const existingIdx = updatedEntries.findIndex(e => e.fat === parsedFat && e.snf === parsedSnf);
      if (existingIdx > -1) {
        updatedEntries[existingIdx].pricePerLiter = parsedPrice;
      } else {
        updatedEntries.push({ fat: parsedFat, snf: parsedSnf, pricePerLiter: parsedPrice });
      }

      // Sort by Fat, then SNF
      updatedEntries.sort((a, b) => a.fat - b.fat || a.snf - b.snf);

      if (activeChart?._id) {
        await api.put(`/charts/${activeChart._id}`, { entries: updatedEntries });
      } else {
        await api.post('/charts', { animalType: activeChartAnimal, entries: updatedEntries });
      }

      setToast({ id: `ch-add-${Date.now()}`, type: 'success', text: 'Chart row updated!' });
      setChartEntries(updatedEntries);
      setNewFat('');
      setNewSnf('');
      setNewPrice('');
    } catch (err: any) {
      setToast({ id: `ch-err-${Date.now()}`, type: 'error', text: 'Chart update failed.' });
    } finally {
      setIsSavingChart(false);
    }
  };

  const handleDeleteChartRow = async (rowIndex: number) => {
    if (!activeChartAnimal) return;
    if (!window.confirm('Kya aap sachme is rule row ko chart se hatana chahte hain?')) return;

    try {
      const response = await api.get('/charts', { params: { animalType: activeChartAnimal } });
      let activeChart = response.data?.[0];

      let updatedEntries = [...chartEntries];
      updatedEntries.splice(rowIndex, 1);

      if (activeChart?._id) {
        await api.put(`/charts/${activeChart._id}`, { entries: updatedEntries });
      }

      setToast({ id: `ch-del-${Date.now()}`, type: 'success', text: 'Rule row deleted!' });
      setChartEntries(updatedEntries);
    } catch (err) {
      console.error(err);
      setToast({ id: `ch-del-err`, type: 'error', text: 'Delete failed.' });
    }
  };

  const handleLogoutClick = () => {
    const confirm = window.confirm('Kya aap log out hona chahte hain?');
    if (confirm) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-24 relative animate-fade-in-up">
      {/* Toast Notifier */}
      {toast && (
        <Toast 
          message={toast.text} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Top navbar */}
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h2 className="font-display font-extrabold text-xl text-text-primary">
          Settings
        </h2>
      </div>

      {/* Dairy Profile details Card */}
      <div className="bg-white border border-border-dairy rounded-2xl p-5 mb-6 shadow-xs relative overflow-hidden">
        <div className="absolute right-4 top-4 text-primary/10">
          <Building className="w-16 h-16" />
        </div>
        
        <h3 className="font-display font-black text-lg text-primary">
          {user?.dairyName || 'Krishna Premium Dairy'}
        </h3>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-1">
          Registered Shop Details
        </p>

        <div className="space-y-2 mt-4 pt-3 border-t border-border-dairy/60">
          <p className="text-xs font-medium text-text-primary flex items-center gap-2">
            <User className="w-4 h-4 text-text-muted shrink-0" /> Owner: <span className="font-semibold">{user?.ownerName || 'Ramesh Yadav'}</span>
          </p>
          <p className="text-xs font-medium text-text-primary flex items-center gap-2">
            <Phone className="w-4 h-4 text-text-muted shrink-0" /> ID / Phone: <span className="font-semibold">{user?.phone}</span>
          </p>
          <p className="text-xs font-medium text-text-primary flex items-center gap-2">
            <MapPin className="w-4 h-4 text-text-muted shrink-0" /> Address: <span className="font-semibold">{user?.address || 'Main Bazar, Jaipur'}</span>
          </p>
        </div>
      </div>

      {/* Settings Menu Options List */}
      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3.5">
        Dairy Configurations
      </h4>

      <div className="space-y-3 flex-1 mb-10">
        {/* Menu item 1: Cow Chart Editor */}
        <button
          id="btn-settings-cow-chart"
          onClick={() => loadChartEntries('cow')}
          className="w-full p-4 bg-white border border-border-dairy rounded-xl hover:bg-dairy-bg/30 text-left flex justify-between items-center transition-all shadow-xs tap-feedback"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold font-mono">COW</div>
            <div>
              <h5 className="font-display font-bold text-sm text-text-primary">Cow Fat/SNF Rate Chart</h5>
              <p className="text-[10px] text-text-muted">गाय के दूध का रेट चार्ट एडिट करें</p>
            </div>
          </div>
          <TableProperties className="w-4 h-4 text-text-muted" />
        </button>

        {/* Menu item 2: Buffalo Chart Editor */}
        <button
          id="btn-settings-buffalo-chart"
          onClick={() => loadChartEntries('buffalo')}
          className="w-full p-4 bg-white border border-border-dairy rounded-xl hover:bg-dairy-bg/30 text-left flex justify-between items-center transition-all shadow-xs tap-feedback"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold font-mono">BUFF</div>
            <div>
              <h5 className="font-display font-bold text-sm text-text-primary">Buffalo Fat/SNF Rate Chart</h5>
              <p className="text-[10px] text-text-muted">भैंस के दूध का रेट चार्ट एडिट करें</p>
            </div>
          </div>
          <TableProperties className="w-4 h-4 text-text-muted" />
        </button>

        {/* Menu item 3: Milk Selling Prices */}
        <button
          id="btn-settings-prices"
          onClick={() => setShowPriceModal(true)}
          className="w-full p-4 bg-white border border-border-dairy rounded-xl hover:bg-dairy-bg/30 text-left flex justify-between items-center transition-all shadow-xs tap-feedback"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-dairy/10 text-success-dairy rounded-lg">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-display font-bold text-sm text-text-primary">Milk Selling Prices</h5>
              <p className="text-[10px] text-text-muted">दूध बेचने का भाव (Sell Rates) सेट करें</p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary">Edit</span>
        </button>

        {/* Menu item 4: Logout trigger (Red row) */}
        <button
          id="btn-settings-logout"
          onClick={handleLogoutClick}
          className="w-full p-4 bg-red-50/40 border border-red-100 hover:bg-red-50 rounded-xl text-left flex justify-between items-center transition-all shadow-xs tap-feedback mt-6"
        >
          <div className="flex items-center gap-3 text-danger-dairy">
            <LogOut className="w-5 h-5 shrink-0" />
            <div>
              <h5 className="font-display font-bold text-sm">Logout Account</h5>
              <p className="text-[10px] text-danger-dairy/80">Dairy account se bahar niklein</p>
            </div>
          </div>
        </button>
      </div>

      {/* Selling Price Config Sheet Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowPriceModal(false)} />
          <form 
            onSubmit={handleUpdatePrices}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display font-extrabold text-base text-text-primary">
                Milk Selling Prices (दूध बेचने का भाव)
              </h3>
              <button 
                type="button" 
                onClick={() => setShowPriceModal(false)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Cow Selling Price (₹/Liter)
                </label>
                <input
                  type="number"
                  required
                  value={cowPrice}
                  onChange={(e) => setCowPrice(e.target.value)}
                  placeholder="e.g. 60"
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Buffalo Selling Price (₹/Liter)
                </label>
                <input
                  type="number"
                  required
                  value={buffaloPrice}
                  onChange={(e) => setBuffaloPrice(e.target.value)}
                  placeholder="e.g. 80"
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingPrices}
                className="w-full mt-2 py-3.5 bg-primary hover:bg-primary-light disabled:bg-text-muted text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSavingPrices ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Selling Prices'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chart Editor Modal Overlay (Extra screen for Settings) */}
      {activeChartAnimal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActiveChartAnimal(null)} />
          <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10 h-[90vh] flex flex-col">
            
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-dairy shrink-0">
              <div>
                <h3 className="font-display font-extrabold text-base text-text-primary uppercase">
                  {activeChartAnimal} Rate Chart Config
                </h3>
                <p className="text-[10px] text-text-muted">Set purchasing rates for raw milk collection</p>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveChartAnimal(null)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Add Row Form */}
            <form onSubmit={handleAddChartRow} className="bg-dairy-bg/60 p-3 rounded-xl border border-border-dairy mb-4 shrink-0">
              <span className="text-[9px] font-bold text-primary uppercase block mb-2 leading-tight">Nayi rule row add karein</span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="FAT (e.g. 4.2)"
                  value={newFat}
                  onChange={(e) => setNewFat(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-border-dairy rounded-lg text-xs font-semibold focus:outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="SNF (e.g. 8.5)"
                  value={newSnf}
                  onChange={(e) => setNewSnf(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-border-dairy rounded-lg text-xs font-semibold focus:outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="Price ₹"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-border-dairy rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingChart}
                className="w-full py-1.5 mt-2.5 bg-primary text-white font-bold text-xs rounded-lg active:scale-98 transition-transform tap-feedback flex items-center justify-center gap-1"
              >
                Add / Update Row Rule
              </button>
            </form>

            <div className="text-[9px] font-bold text-text-muted mb-1 flex justify-between shrink-0">
              <span>ACTIVE RULES ({chartEntries.length})</span>
              <span>Tap row bin todelete</span>
            </div>

            {/* Table Entries scroll area */}
            <div className="flex-1 overflow-y-auto border border-border-dairy rounded-xl relative no-scrollbar bg-dairy-bg/10">
              {loading ? (
                <LoadingSpinner message="Chart values load ho rahe hain..." />
              ) : chartEntries.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs font-semibold text-text-muted">Rate chart blank hai.</p>
                  <p className="text-[10px] text-text-muted/80 max-w-[180px] mx-auto mt-1 leading-normal">
                    Liters rate nikalne ke liye FAT & SNF rate rules add karna shuru karein.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border-dairy">
                  {/* Header */}
                  <div className="grid grid-cols-4 px-3 py-2 bg-dairy-bg text-[9px] font-extrabold text-text-muted text-center tracking-wider">
                    <div>FAT</div>
                    <div>SNF</div>
                    <div>Price/L</div>
                    <div>Action</div>
                  </div>
                  {/* Rows */}
                  {chartEntries.map((e, idx) => (
                    <div key={`${e.fat}-${e.snf}`} className="grid grid-cols-4 px-3 py-2.5 text-center text-xs font-semibold items-center bg-white">
                      <div className="font-mono text-text-primary">{e.fat.toFixed(1)}</div>
                      <div className="font-mono text-text-primary">{e.snf.toFixed(1)}</div>
                      <div className="font-mono text-primary font-bold">{formatCurrency(e.pricePerLiter)}</div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteChartRow(idx)}
                          className="p-1 text-danger-dairy hover:bg-red-50 rounded-lg tap-feedback"
                          aria-label="Delete rules row"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveChartAnimal(null)}
              className="w-full mt-4 py-3 bg-dairy-bg text-xs font-bold text-text-primary rounded-xl shrink-0 hover:bg-border-dairy tap-feedback"
            >
              Done / Close Chart Config
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
