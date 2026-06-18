import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Calendar, Sparkles, AlertCircle, ArrowLeft, Coffee, Flame } from 'lucide-react';
import api from '../api/client';
import { Customer, FatSNFChart } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast, { ToastMessage } from '../components/Toast';
import { formatCurrency, formatLiters } from '../lib/formatters';

// Simple client-side calcRate matching server-side logic
function calculateClientRate(chart: FatSNFChart | null, fat: number, snf: number): number | null {
  if (!chart || !chart.entries || chart.entries.length === 0) return null;

  // Exact Match
  const exact = chart.entries.find(e => 
    parseFloat(e.fat.toString()) === parseFloat(fat.toString()) && 
    parseFloat(e.snf.toString()) === parseFloat(snf.toString())
  );
  if (exact) return exact.pricePerLiter;

  // Nearest search
  let bestEntry: any = null;
  let minFatDiff = Infinity;
  let minSnfDiff = Infinity;

  for (const entry of chart.entries) {
    const fatDiff = Math.abs(entry.fat - fat);
    const snfDiff = Math.abs(entry.snf - snf);

    if (fatDiff < minFatDiff) {
      minFatDiff = fatDiff;
      minSnfDiff = snfDiff;
      bestEntry = entry;
    } else if (Math.abs(fatDiff - minFatDiff) < 0.01) {
      if (snfDiff < minSnfDiff) {
        minSnfDiff = snfDiff;
        bestEntry = entry;
      }
    }
  }

  if (bestEntry && minFatDiff <= 2.0 && minSnfDiff <= 2.0) {
    return bestEntry.pricePerLiter;
  }
  return bestEntry ? bestEntry.pricePerLiter : null;
}

export const Collect: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  
  // State for Step 1
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // State for Step 2
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'morning' | 'evening'>('morning');
  const [liters, setLiters] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [chart, setChart] = useState<FatSNFChart | null>(null);
  const [purchaseAdjustmentType, setPurchaseAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [purchaseAdjustmentAmount, setPurchaseAdjustmentAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load giving customers on init
  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const response = await api.get('/customers', {
        params: { type: 'give', search: searchQuery }
      });
      setCustomers(response.data);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setToast({ id: 'err-cust', type: 'error', text: 'Customers load nahi ho sake.' });
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // When step 2 loads, fetch rate charts for the selected customer's milkType
  useEffect(() => {
    if (step === 2 && selectedCustomer) {
      api.get('/charts', { params: { animalType: selectedCustomer.milkType } })
        .then(response => {
          if (response.data && response.data.length > 0) {
            setChart(response.data[0]);
          } else {
            setChart(null);
          }
        })
        .catch(err => {
          console.error('Failed to load charts:', err);
        });

      api.get('/settings')
        .then(response => {
          setPurchaseAdjustmentType(response.data.purchaseAdjustmentType === 'subtract' ? 'subtract' : 'add');
          setPurchaseAdjustmentAmount(Number(response.data.purchaseAdjustmentAmount) || 0);
        })
        .catch(err => {
          console.error('Failed to load purchase settings:', err);
          setPurchaseAdjustmentType('add');
          setPurchaseAdjustmentAmount(0);
        });
    }
  }, [step, selectedCustomer]);

  // Dynamic Rate & Total Calculations
  const enteredFat = parseFloat(fat);
  const enteredSnf = parseFloat(snf);
  const enteredLiters = parseFloat(liters);

  const baseCalculatedRate = (enteredFat && enteredSnf) ? calculateClientRate(chart, enteredFat, enteredSnf) : null;
  const adjustmentValue = purchaseAdjustmentType === 'subtract' ? -purchaseAdjustmentAmount : purchaseAdjustmentAmount;
  const calculatedRate = baseCalculatedRate !== null ? Math.max(0, baseCalculatedRate + adjustmentValue) : null;
  const calculatedTotal = (calculatedRate && enteredLiters) ? (calculatedRate * enteredLiters) : 0;

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStep(2);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !liters || !fat || !snf) {
      setToast({ id: 'err-fields', type: 'error', text: 'Kripya saare field sahi se fill karien.' });
      return;
    }

    if (calculatedRate === null) {
      setToast({ id: 'err-norated', type: 'error', text: 'Is fat/snf ke liye rate nahi mila. Pehle chart configure karein.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/collection', {
        customerId: selectedCustomer._id,
        date,
        shift,
        liters,
        fat,
        snf
      });

      setToast({ id: 'success-collect', type: 'success', text: 'Entry saved! Navigating back...' });
      
      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Saving collection failed.';
      setToast({ id: 'err-sub', type: 'error', text: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-24 relative animate-fade-in-up">
      {toast && (
        <Toast 
          message={toast.text} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* STEP 1: CUSTOMER LIST */}
      {step === 1 && (
        <div className="flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/home')} className="p-2 -ml-2 hover:bg-border-dairy rounded-full tap-feedback text-text-primary">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display font-extrabold text-xl text-text-primary">
              Doodh Lena (Collect)
            </h2>
          </div>

          <p className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2.5">
            Step 1: Choose Giving Customer (Dene wala)
          </p>

          {/* Search bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-muted" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Grahak ka naam ya ID likhein..."
              className="block w-full pl-10 pr-4 py-3 bg-white border border-border-dairy rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
            />
          </div>

          {/* Customer list container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[450px] no-scrollbar">
            {isLoadingCustomers ? (
              <LoadingSpinner message="Grahak load ho rahe hain..." />
            ) : customers.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white/70 border border-border-dairy rounded-2xl">
                <p className="text-sm font-medium text-text-muted">Koi dene wale grahak nahi mile</p>
                <button 
                  onClick={() => navigate('/customers')} 
                  className="mt-3 px-4 py-2 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-semibold rounded-lg tap-feedback"
                >
                  Naya Grahak Banayein
                </button>
              </div>
            ) : (
              customers.map((c) => (
                <button
                  key={c._id}
                  onClick={() => handleSelectCustomer(c)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-primary/5 active:scale-99 border border-border-dairy hover:border-primary rounded-xl transition-all shadow-xs text-left tap-feedback"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs ring-4 ring-primary/5">
                      #{c.customerId}
                    </span>
                    <div>
                      <h4 className="font-display font-semibold text-[15px] text-text-primary">
                        {c.name}
                      </h4>
                      <p className="text-[11px] text-text-muted font-medium">
                        📞 {c.phone || 'No phone'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider ${
                      c.milkType === 'cow' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {c.milkType}
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* STEP 2: FILL TRANSACTION DETAILS */}
      {step === 2 && selectedCustomer && (
        <form onSubmit={handleSave} className="flex flex-col flex-1 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <button 
              type="button" 
              onClick={() => { setStep(1); setSelectedCustomer(null); }} 
              className="p-2 -ml-2 hover:bg-border-dairy rounded-full tap-feedback"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display font-extrabold text-xl text-text-primary">
              Details Fill Karein
            </h2>
          </div>

          {/* Selected Customer Card Preview */}
          <div className="p-4 bg-white border border-border-dairy rounded-2xl flex justify-between items-center shadow-xs">
            <div>
              <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-extrabold rounded-md mb-1.5 uppercase">
                Grahak Selected
              </span>
              <h3 className="font-display font-bold text-base text-text-primary">
                {selectedCustomer.name}
              </h3>
              <p className="text-xs text-text-muted mt-1 font-medium">
                Customer ID: #{selectedCustomer.customerId} • Milk Type: <span className="font-semibold uppercase">{selectedCustomer.milkType}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setStep(1); setSelectedCustomer(null); }}
              className="px-3 py-1.5 bg-dairy-bg hover:bg-border-dairy rounded-lg text-xs font-semibold text-text-primary tap-feedback"
            >
              Change
            </button>
          </div>

          <div className="space-y-3">
            {/* Row 1: Date & Shift */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Collection Date
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="block w-full pl-9 pr-2 py-2.5 bg-white border border-border-dairy rounded-xl text-xs font-semibold text-text-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Shift (समय)
                </label>
                <div className="grid grid-cols-2 bg-white border border-border-dairy rounded-xl p-0.5 h-[38px] items-center">
                  <button
                    type="button"
                    onClick={() => setShift('morning')}
                    className={`h-full text-xs font-bold rounded-lg transition-colors tap-feedback flex items-center justify-center gap-1 ${
                      shift === 'morning' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" /> Subah
                  </button>
                  <button
                    type="button"
                    onClick={() => setShift('evening')}
                    className={`h-full text-xs font-bold rounded-lg transition-colors tap-feedback flex items-center justify-center gap-1 ${
                      shift === 'evening' ? 'bg-primary text-white shadow-xs' : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" /> Shaam
                  </button>
                </div>
              </div>
            </div>

            {/* Liters Input */}
            <div>
              <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                Milk Quantity (Liters)
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="e.g. 5.5"
                required
                className="block w-full px-4 py-3 bg-white border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Fat and SNF Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  FAT Value
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="e.g. 4.2"
                  required
                  className="block w-full px-4 py-2.5 bg-white border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  SNF Value
                </label>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={snf}
                  onChange={(e) => setSnf(e.target.value)}
                  placeholder="e.g. 8.5"
                  required
                  className="block w-full px-4 py-2.5 bg-white border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Auto Rate Calculation Section */}
            <div className="mt-4 p-4 rounded-2xl border bg-dairy-bg flex flex-col justify-center items-center shadow-inner relative overflow-hidden">
              <div className="absolute right-3 top-3 opacity-15">
                <Sparkles className="w-16 h-16 text-primary" />
              </div>

              {calculatedRate !== null ? (
                <div className="text-center">
                  <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Auto Calculation Active
                  </div>
                  <div className="text-lg font-extrabold text-text-primary">
                    Rate: <span className="text-primary font-display">{formatCurrency(calculatedRate)}/L</span>
                  </div>
                  {purchaseAdjustmentAmount > 0 && baseCalculatedRate !== null && (
                    <div className="text-[11px] font-semibold text-text-muted mt-0.5">
                      Base {formatCurrency(baseCalculatedRate)}/L {purchaseAdjustmentType === 'subtract' ? '-' : '+'} {formatCurrency(purchaseAdjustmentAmount)}/L
                    </div>
                  )}
                  {enteredLiters > 0 && (
                    <div className="text-sm font-semibold text-text-muted mt-0.5">
                      Total: <span className="text-secondary font-display font-extrabold text-base text-text-primary">{formatCurrency(calculatedTotal)}</span> for {formatLiters(enteredLiters)}
                    </div>
                  )}
                </div>
              ) : (enteredFat && enteredSnf) ? (
                <div className="text-center p-1 text-danger-dairy flex flex-col items-center">
                  <AlertCircle className="w-5 h-5 mb-1 shrink-0" />
                  <p className="text-xs font-bold">Rate nahi mila!</p>
                  <p className="text-[10px] mt-0.5 font-medium leading-tight">
                    Is Fat/SNF ({enteredFat}/{enteredSnf}) ke liye rate chart set karein.
                  </p>
                </div>
              ) : (
                <div className="text-center p-1 text-text-muted">
                  <p className="text-xs font-bold">Billing Live Calculator</p>
                  <p className="text-[10px] mt-0.5 font-medium leading-tight max-w-[280px]">
                    FAT aur SNF likhte hi pure billing details yhan instantly dikhenge
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              id="btn-collect-save"
              type="submit"
              disabled={isSubmitting || calculatedRate === null}
              className="w-full mt-4 py-3.5 bg-primary hover:bg-primary-light disabled:bg-text-muted text-white text-base font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 tap-feedback select-none"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Save Collection Entry'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Collect;
