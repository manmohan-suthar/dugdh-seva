import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Phone, BadgeAlert, Plus, Trash2, Calendar, 
  MapPin, Coins, TrendingDown, TrendingUp, AlertCircle, Wallet, X
} from 'lucide-react';
import api from '../api/client';
import { Customer, MilkTransaction, MilkSaleTransaction, Advance } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast, { ToastMessage } from '../components/Toast';
import { formatCurrency, formatLiters, formatDate } from '../lib/formatters';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [collections, setCollections] = useState<MilkTransaction[]>([]);
  const [sales, setSales] = useState<MilkSaleTransaction[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Modal Action States
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);

  // Selected Entry Options Sheet
  const [selectedEntry, setSelectedEntry] = useState<{ id: string, type: 'collection' | 'sale' } | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    setIsLoading(true);
    try {
      // 1. Load single customer details
      const custRes = await api.get(`/customers/${id}`);
      setCustomer(custRes.data);

      const targetType = custRes.data.type; // give or take

      if (targetType === 'give') {
        const collRes = await api.get('/collection', { params: { customerId: id } });
        setCollections(collRes.data);
        const advRes = await api.get('/advances', { params: { customerId: id } });
        setAdvances(advRes.data);
      } else {
        const saleRes = await api.get('/sales', { params: { customerId: id } });
        setSales(saleRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load customer profile details:', err);
      setToast({ id: 'err', type: 'error', text: 'Grahak details load nahi ho sake.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !advanceAmount) return;

    setIsSavingAdvance(true);
    try {
      await api.post('/advances', {
        customerId: customer._id,
        amount: advanceAmount,
        notes: advanceNotes,
        date: new Date().toISOString()
      });

      setToast({ id: `adv-suc-${Date.now()}`, type: 'success', text: 'Advance register ho gya!' });
      setShowAdvanceModal(false);
      setAdvanceAmount('');
      setAdvanceNotes('');
      loadCustomerData(); // Reload
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to save advance.';
      setToast({ id: `adv-err-${Date.now()}`, type: 'error', text: msg });
    } finally {
      setIsSavingAdvance(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    if (!window.confirm('Kya aap sachme is grahak ko delete karna chahte hain? Unka sara transaction history delete ho jayega.')) return;

    try {
      await api.delete(`/customers/${customer._id}`);
      alert('Grahak successfully delete ho gya.');
      navigate('/customers');
    } catch (err) {
      console.error(err);
      setToast({ id: 'err-del', type: 'error', text: 'Delete failed.' });
    }
  };

  const handleDeleteTransaction = async () => {
    if (!selectedEntry) return;

    const confirm = window.confirm('Kya aap is entry ko delete karna chahte hain?');
    if (!confirm) return;

    setIsDeletingEntry(true);
    try {
      const endpoint = selectedEntry.type === 'collection' ? `/collection/${selectedEntry.id}` : `/sales/${selectedEntry.id}`;
      await api.delete(endpoint);
      setToast({ id: 'tx-del-suc', type: 'success', text: 'Entry delete ho gayi!' });
      setSelectedEntry(null);
      loadCustomerData(); // Reload
    } catch (err: any) {
      console.error(err);
      setToast({ id: 'tx-del-err', type: 'error', text: 'Delete failed.' });
    } finally {
      setIsDeletingEntry(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-dairy-bg">
        <LoadingSpinner message="Grahak ka khata taiyar ho raha hai..." />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex-1 p-6 text-center text-text-primary bg-dairy-bg">
        <p className="font-semibold">Grahak details nahi mile.</p>
        <button onClick={() => navigate('/customers')} className="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl">
          Back to Grahak Register
        </button>
      </div>
    );
  }

  const isDeneWala = customer.type === 'give';

  // Compute stats metrics
  let totalLiters = 0;
  let totalAmount = 0;
  let amountPaid = 0;
  let balanceDue = 0;
  let totalAdvances = 0;

  if (isDeneWala) {
    totalLiters = collections.reduce((acc, curr) => acc + curr.liters, 0);
    totalAmount = collections.reduce((acc, curr) => acc + curr.totalAmount, 0);
    totalAdvances = advances.reduce((acc, curr) => acc + curr.amount, 0);
    // Dues bache hue: for giving customer, dairy owes them money. Is mathematically totalAmount - totalAdvances
    balanceDue = Math.max(0, totalAmount - totalAdvances);
  } else {
    totalLiters = sales.reduce((acc, curr) => acc + curr.liters, 0);
    totalAmount = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);
    amountPaid = sales.reduce((acc, curr) => acc + curr.amountPaid, 0);
    balanceDue = sales.reduce((acc, curr) => acc + curr.balanceDue, 0);
  }

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-24 relative animate-fade-in-up">
      {/* Toast notifications */}
      {toast && (
        <Toast 
          message={toast.text} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Top navbar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/customers')} className="p-2 -ml-2 hover:bg-border-dairy rounded-full tap-feedback text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display font-extrabold text-lg text-text-primary">
            {customer.name}
          </h2>
        </div>
        <button 
          onClick={handleDeleteCustomer}
          className="p-2.5 bg-red-50 hover:bg-red-100 text-danger-dairy rounded-full transition-colors tap-feedback"
          aria-label="Delete Customer Profile"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Section Box */}
      <div className="p-4 bg-white border border-border-dairy rounded-2xl shadow-xs relative overflow-hidden mb-4">
        <div className="absolute right-3.5 top-3.5">
          <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-black text-sm shadow-inner">
            #{customer.customerId}
          </span>
        </div>

        <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider mb-2 ${
          customer.type === 'give' ? 'bg-green-100 text-primary' : 'bg-amber-100 text-accent'
        }`}>
          {customer.type === 'give' ? 'Dene Wala (Seller)' : 'Lene Wala (Buyer)'}
        </span>
        <h3 className="font-display font-extrabold text-xl text-text-primary leading-tight">
          {customer.name}
        </h3>
        <div className="space-y-1 mt-2.5">
          <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-text-muted" /> {customer.phone || 'No Phone Register'}
          </p>
          <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5 uppercase">
            🥛 Animal Pre-fill: <span className="font-bold text-text-primary">{customer.milkType}</span>
          </p>
        </div>
      </div>

      {/* 2x2 Metric Summary Grid */}
      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
        Khata Summary (Overall Stats)
      </h4>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Metric 1 */}
        <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
          <span className="text-[10px] text-text-muted font-bold uppercase">Total Liters</span>
          <p className="font-display font-extrabold text-base text-text-primary mt-1">
            {formatLiters(totalLiters)}
          </p>
          <TrendingDown className="absolute right-3.5 bottom-3 w-4 h-4 text-primary" />
        </div>

        {/* Metric 2 */}
        <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
          <span className="text-[10px] text-text-muted font-bold uppercase">Total Amount</span>
          <p className="font-display font-extrabold text-base text-text-primary mt-1">
            {formatCurrency(totalAmount)}
          </p>
          <TrendingUp className="absolute right-3.5 bottom-3 w-4 h-4 text-accent" />
        </div>

        {/* Metric 3 / 4 Conditional giving / taking details */}
        {isDeneWala ? (
          <>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Advances Paid</span>
              <p className="font-display font-extrabold text-base text-indigo-600 mt-1">
                {formatCurrency(totalAdvances)}
              </p>
              <Wallet className="absolute right-3.5 bottom-3 w-4 h-4 text-indigo-500" />
            </div>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Net Owed (Dues)</span>
              <p className="font-display font-black text-base text-success-dairy mt-1">
                {formatCurrency(balanceDue)}
              </p>
              <Coins className="absolute right-3.5 bottom-3 w-4 h-4 text-success-dairy" />
            </div>
          </>
        ) : (
          <>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Amount Paid</span>
              <p className="font-display font-extrabold text-base text-success-dairy mt-1">
                {formatCurrency(amountPaid)}
              </p>
              <Coins className="absolute right-3.5 bottom-3 w-4 h-4 text-success-dairy" />
            </div>
            <div className="p-3 bg-white border border-border-dairy rounded-xl relative shadow-xs">
              <span className="text-[10px] text-text-muted font-bold uppercase">Balance Due</span>
              <p className={`font-display font-black text-base mt-1 ${balanceDue > 0 ? 'text-danger-dairy' : 'text-success-dairy'}`}>
                {formatCurrency(balanceDue)}
              </p>
              <AlertCircle className="absolute right-3.5 bottom-3 w-4 h-4 text-danger-dairy" />
            </div>
          </>
        )}
      </div>

      {/* Conditional Add Advance control for suppliers */}
      {isDeneWala && (
        <button
          id="btn-add-advance"
          onClick={() => setShowAdvanceModal(true)}
          className="w-full mb-6 py-3 border border-indigo-600 hover:bg-indigo-600/5 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all tap-feedback"
        >
          <Plus className="w-4 h-4" /> Add Advance Payment
        </button>
      )}

      {/* Transaction Streams */}
      <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2.5">
        Pichle Transactions (History)
      </h4>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] no-scrollbar">
        {isDeneWala ? (
          // Collections stream list
          collections.length === 0 ? (
            <p className="text-center text-xs font-semibold text-text-muted py-8">Koi collection entries nahi mili.</p>
          ) : (
            collections.map((tx) => (
              <button
                key={tx._id}
                onClick={() => setSelectedEntry({ id: tx._id, type: 'collection' })}
                className="w-full p-3.5 bg-white border border-border-dairy hover:bg-dairy-bg/30 rounded-xl text-left flex justify-between items-center transition-all shadow-xs tap-feedback"
              >
                <div>
                  <span className="text-[9px] font-bold text-text-muted uppercase block leading-tight">
                    {formatDate(tx.date)}
                  </span>
                  <p className="font-display font-black text-[14px] text-text-primary mt-1">
                    {tx.liters.toFixed(2)}L • <span className="text-xs font-semibold text-text-muted">Rate ₹{tx.ratePerLiter}/L</span>
                  </p>
                  <span className="inline-block px-1.5 py-0.5 bg-dairy-bg text-[9px] font-bold text-text-muted rounded mr-1">
                    {tx.shift === 'morning' ? 'Subah' : 'Shaam'}
                  </span>
                  <span className="inline-block px-1.5 py-0.5 bg-dairy-bg text-[9px] font-extrabold text-green-700 rounded uppercase">
                    {tx.animalType}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-text-muted">Total</span>
                  <p className="font-display font-black text-sm text-text-primary">
                    {formatCurrency(tx.totalAmount)}
                  </p>
                </div>
              </button>
            ))
          )
        ) : (
          // Sales history stream list
          sales.length === 0 ? (
            <p className="text-center text-xs font-semibold text-text-muted py-8">Koi sales history nahi mili.</p>
          ) : (
            sales.map((tx) => (
              <button
                key={tx._id}
                onClick={() => setSelectedEntry({ id: tx._id, type: 'sale' })}
                className="w-full p-3.5 bg-white border border-border-dairy hover:bg-dairy-bg/30 rounded-xl text-left flex justify-between items-center transition-all shadow-xs tap-feedback hover:border-accent"
              >
                <div>
                  <span className="text-[9px] font-bold text-text-muted uppercase block leading-tight">
                    {formatDate(tx.date)}
                  </span>
                  <p className="font-display font-black text-[14px] text-text-primary mt-1">
                    {tx.liters.toFixed(2)}L • <span className="text-xs font-semibold text-text-muted">Rate ₹{tx.ratePerLiter}/L</span>
                  </p>
                  {tx.notes && (
                    <p className="text-[10px] text-text-muted mt-0.5 italic truncate max-w-[200px]">
                      "{tx.notes}"
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-display font-black text-sm text-text-primary">
                    {formatCurrency(tx.totalAmount)}
                  </p>
                  <span className={`text-[9px] font-bold ${tx.balanceDue > 0 ? 'text-danger-dairy' : 'text-success-dairy'}`}>
                    Paid: {formatCurrency(tx.amountPaid)}
                  </span>
                </div>
              </button>
            ))
          )
        )}
      </div>

      {/* Selected Transaction Options Sheet Modal */}
      {selectedEntry && (
      <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedEntry(null)} />
          <div className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-5 shadow-2xl animate-fade-in-up z-10">
            <h3 className="font-display font-bold text-base text-text-primary mb-4 text-center border-b border-border-dairy pb-3">
              Transaction Settings
            </h3>
            <button
              onClick={handleDeleteTransaction}
              disabled={isDeletingEntry}
              className="w-full py-4 text-danger-dairy hover:bg-red-50 text-sm font-bold border border-red-200 rounded-xl flex items-center justify-center gap-2 transition-all tap-feedback"
            >
              <Trash2 className="w-4 h-4" /> Remove Entry (Delete)
            </button>
            <button
              type="button"
              onClick={() => setSelectedEntry(null)}
              className="w-full py-3.5 mt-3 bg-dairy-bg hover:bg-border-dairy text-xs font-bold text-text-primary rounded-xl transition-all tap-feedback"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Advance Modal Sheet */}
      {showAdvanceModal && (
      <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowAdvanceModal(false)} />
          <form 
            onSubmit={handleCreateAdvance}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display font-extrabold text-base text-text-primary">
                Naya Advance Register karein
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAdvanceModal(false)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Advance Amount (₹)*
                </label>
                <input
                  type="number"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  autoFocus
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="e.g. For festival purchase"
                  className="block w-full px-4 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-xs font-semibold focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingAdvance}
                className="w-full mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-text-muted text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSavingAdvance ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Confirm & Save Advance'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
