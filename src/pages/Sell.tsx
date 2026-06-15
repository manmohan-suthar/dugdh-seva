import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Calendar, AlertCircle, ArrowLeft, Coffee, Flame } from 'lucide-react';
import api from '../api/client';
import { Customer, MilkPriceEntry } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast, { ToastMessage } from '../components/Toast';
import { formatCurrency, formatLiters } from '../lib/formatters';

export const Sell: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Step 1: Search & Select customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Step 2: Sale details
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [animalType, setAnimalType] = useState<'cow' | 'buffalo'>('cow');
  const [liters, setLiters] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [prices, setPrices] = useState<MilkPriceEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load taking customers on search / mount
  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const response = await api.get('/customers', {
        params: { type: 'take', search: searchQuery }
      });
      setCustomers(response.data);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setToast({ id: 'err-take-cust', type: 'error', text: 'Customers load nahi ho sake.' });
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Load selling price lists on stepping to card 2
  useEffect(() => {
    if (step === 2 && selectedCustomer) {
      setAnimalType(selectedCustomer.milkType); // Prefill animalType
      
      api.get('/prices')
        .then(response => {
          setPrices(response.data);
        })
        .catch(err => {
          console.error('Failed to load price details:', err);
        });
    }
  }, [step, selectedCustomer]);

  // Determine current selling rate per liter
  const getRate = (): number => {
    const matched = prices.find(p => p.animalType === animalType);
    if (matched) return matched.pricePerLiter;
    // Fallback constants
    return animalType === 'cow' ? 60 : 80;
  };

  const currentRate = getRate();
  const calculatedTotal = liters ? parseFloat(liters) * currentRate : 0;
  const paid = amountPaid ? parseFloat(amountPaid) : 0;
  const balanceDue = calculatedTotal - paid;

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStep(2);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !liters) {
      setToast({ id: 'err-miss', type: 'error', text: 'Kripya liters sahi number fill karein.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/sales', {
        customerId: selectedCustomer._id,
        date,
        animalType,
        liters,
        amountPaid: amountPaid || '0',
        notes
      });

      setToast({ id: 'success-sell', type: 'success', text: 'Sale entry successfully saved!' });
      
      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Saving sale entry failed.';
      setToast({ id: 'err-save-sell', type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-24 animate-fade-in-up">
      {toast && (
        <Toast 
          message={toast.text} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* STEP 1: SELECT BUYING CUSTOMER */}
      {step === 1 && (
        <div className="flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/home')} className="p-2 -ml-2 hover:bg-border-dairy rounded-full tap-feedback text-text-primary">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display font-extrabold text-xl text-text-primary">
              Doodh Dena (Sell)
            </h2>
          </div>

          <p className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2.5">
            Step 1: Choose Selling Customer (Lene wala)
          </p>

          {/* Search Input */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-muted" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Grahak ka naam ya ID search..."
              className="block w-full pl-10 pr-4 py-3 bg-white border border-border-dairy rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
            />
          </div>

          {/* Customer Scroll List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[450px] no-scrollbar">
            {isLoadingCustomers ? (
              <LoadingSpinner message="Customer fetch ho rahe hain..." />
            ) : customers.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white/70 border border-border-dairy rounded-2xl">
                <p className="text-sm font-medium text-text-muted">Koi lene wale grahak nahi mile</p>
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
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-accent/5 active:scale-99 border border-border-dairy hover:border-accent rounded-xl transition-all shadow-xs text-left tap-feedback"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-mono font-bold text-xs ring-4 ring-accent/5">
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

      {/* STEP 2: METRIC FORM ACTIONS */}
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
              Bechne Ke Details
            </h2>
          </div>

          {/* Profile Card Preview */}
          <div className="p-4 bg-white border border-border-dairy rounded-2xl flex justify-between items-center shadow-xs">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-accent/10 text-accent text-[10px] font-extrabold rounded-md mb-1.5 uppercase">
                Grahak Selected
              </span>
              <h3 className="font-display font-bold text-base text-text-primary">
                {selectedCustomer.name}
              </h3>
              <p className="text-xs text-text-muted mt-1 font-medium">
                Customer ID: #{selectedCustomer.customerId} • General Type: <span className="font-semibold uppercase">{selectedCustomer.milkType}</span>
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

          {/* Form Actions */}
          <div className="space-y-3.5">
            {/* Row 1: Date & Dairy Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Sale Date
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
                  Milk Type (Cow/Buffalo)
                </label>
                <div className="grid grid-cols-2 bg-white border border-border-dairy rounded-xl p-0.5 h-[38px] items-center">
                  <button
                    type="button"
                    onClick={() => setAnimalType('cow')}
                    className={`h-full text-xs font-bold rounded-lg transition-colors tap-feedback ${
                      animalType === 'cow' ? 'bg-accent text-white shadow-xs' : 'text-text-muted'
                    }`}
                  >
                    Cow
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnimalType('buffalo')}
                    className={`h-full text-xs font-bold rounded-lg transition-colors tap-feedback ${
                      animalType === 'buffalo' ? 'bg-accent text-white shadow-xs' : 'text-text-muted'
                    }`}
                  >
                    Buffalo
                  </button>
                </div>
              </div>
            </div>

            {/* Liters Qty */}
            <div>
              <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                Quantity (Liters)
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                placeholder="e.g. 10"
                required
                className="block w-full px-4 py-3 bg-white border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>

            {/* Rate Calculator Banner */}
            <div className="p-3 bg-accent/5 rounded-2xl border border-accent/15 flex justify-between items-center text-accent">
              <span className="text-xs font-bold uppercase tracking-wider">Sell Rate:</span>
              <span className="font-display font-extrabold text-base">
                {formatCurrency(currentRate)}/L
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Cash Paid input */}
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Amount Received (₹ Received)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="₹ received this time"
                  className="block w-full px-4 py-3 bg-white border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Balance Calculated Display */}
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Calculated Balance Due (₹)
                </label>
                <div className={`h-[48px] px-4 rounded-xl border border-border-dairy bg-white flex items-center font-display font-bold text-sm ${
                  balanceDue > 0 ? 'text-danger-dairy' : 'text-success-dairy'
                }`}>
                  {formatCurrency(balanceDue)}
                </div>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                Notes / Remark (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid via UPI / Shaam ko dega"
                className="block w-full px-4 py-3 bg-white border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>

            {/* Price/Billing Breakdown Card */}
            {liters && (
              <div className="p-4 rounded-2xl bg-dairy-bg border border-border-dairy shadow-inner flex justify-between items-center text-xs">
                <div>
                  <span className="text-text-muted font-medium">Billing Total:</span>
                  <p className="font-display font-extrabold text-[15px] text-text-primary">
                    {formatLiters(parseFloat(liters))} × {formatCurrency(currentRate)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-text-muted font-medium">Bill Net:</span>
                  <p className="font-display font-extrabold text-base text-accent">
                    {formatCurrency(calculatedTotal)}
                  </p>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              id="btn-sell-save"
              type="submit"
              disabled={isSubmitting || !liters}
              className="w-full mt-4 py-3.5 bg-accent hover:bg-amber-600 disabled:bg-text-muted text-white text-base font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 tap-feedback select-none"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Save Sale Transaction'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Sell;
