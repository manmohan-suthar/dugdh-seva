import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, ChevronRight, X, Phone, User, Milk, HeartHandshake } from 'lucide-react';
import api from '../api/client';
import { Customer } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast, { ToastMessage } from '../components/Toast';

export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'give' | 'take'>('give');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Bottom Sheet/Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: 'give' as 'give' | 'take',
    milkType: 'cow' as 'cow' | 'buffalo'
  });

  // Fetch customers whenever activeTab or searchQuery changes
  useEffect(() => {
    loadCustomers();
  }, [activeTab, searchQuery]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/customers', {
        params: { type: activeTab, search: searchQuery }
      });
      setCustomers(response.data);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setToast({ id: 'err-cust', type: 'error', text: 'Customers load nahi ho sake.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setToast({ id: 'err-name-req', type: 'error', text: 'Kripya grahak ka naam likhein.' });
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.post('/customers', formData);
      setToast({ id: `sc-${Date.now()}`, type: 'success', text: 'Grahak safalta purvak jud gaya!' });
      
      // Close sheet & reset
      setShowAddModal(false);
      setFormData({
        name: '',
        phone: '',
        type: activeTab, // maintain active setting
        milkType: 'cow'
      });

      // Reload list
      loadCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Customer create nahi ho saka.';
      setToast({ id: `err-${Date.now()}`, type: 'error', text: msg });
    } finally {
      setIsSaving(false);
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

      {/* Top Title Bar */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-6 h-6 text-primary" />
        <h2 className="font-display font-extrabold text-xl text-text-primary">
          Grahak Register
        </h2>
      </div>

      {/* Tab Switcher (Dene Wale | Lene Wale) */}
      <div className="grid grid-cols-2 bg-white border border-border-dairy rounded-2xl p-1 mb-4 h-12 items-center">
        <button
          onClick={() => { setActiveTab('give'); setSearchQuery(''); }}
          className={`h-full text-xs font-bold rounded-xl transition-all tap-feedback ${
            activeTab === 'give' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Dene Wale (दूध लेना)
        </button>
        <button
          onClick={() => { setActiveTab('take'); setSearchQuery(''); }}
          className={`h-full text-xs font-bold rounded-xl transition-all tap-feedback ${
            activeTab === 'take' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Lene Wale (दूध बेचना)
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-5">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-text-muted" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search by Name or Customer ID...`}
          className="block w-full pl-10 pr-4 py-3 bg-white border border-border-dairy rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
        />
      </div>

      {/* Grahak Scrolls list */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[460px] no-scrollbar">
        {isLoading ? (
          <LoadingSpinner message="Grahak fetch ho rhe hain..." />
        ) : customers.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white/70 border border-border-dairy rounded-2xl">
            <Users className="w-12 h-12 text-border-dairy mx-auto mb-2.5" />
            <p className="text-sm font-semibold text-text-muted">Koi data nahi mila</p>
            <p className="text-xs text-text-muted/80 mt-1 max-w-[240px] mx-auto leading-normal">
              Is list me filhal koi grahak registered nahi hain. + Button daba kar grahak shuru karein.
            </p>
          </div>
        ) : (
          customers.map((c) => (
            <button
              key={c._id}
              onClick={() => navigate(`/customers/${c._id}`)}
              className="w-full flex items-center justify-between p-4 bg-white border border-border-dairy hover:bg-dairy-bg/30 rounded-2xl transition-all shadow-xs text-left tap-feedback active:scale-99 ring-1 ring-black/[0.01]"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-extrabold text-xs shrink-0 shadow-inner">
                  #{c.customerId}
                </span>
                <div>
                  <h4 className="font-display font-bold text-[15px] text-text-primary leading-tight">
                    {c.name}
                  </h4>
                  <p className="text-[11px] text-text-muted font-medium mt-0.5">
                    📞 {c.phone || 'No phone'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-md tracking-wider ${
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

      {/* Floating Action Button (FAB) at Bottom-Right */}
      <button
        id="btn-fab-add-customer"
        onClick={() => {
          setFormData({ name: '', phone: '', type: activeTab, milkType: 'cow' });
          setShowAddModal(true);
        }}
        className="fixed bottom-20 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(46,125,50,0.5)] hover:bg-primary-light transition-all tap-feedback active:scale-95 z-30"
        aria-label="Add new customer"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Add Customer Dialog Bottom Sheet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          {/* Backdrop screen lock */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowAddModal(false)}
          />

          {/* Sliding sheet */}
          <form 
            id="form-customer-sheet"
            onSubmit={handleCreateCustomer}
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10 bottom-0"
          >
            {/* Grab handle/top bar */}
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display font-extrabold text-lg text-text-primary">
                Naya Grahak Jodein
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full bg-dairy-bg text-text-muted hover:text-text-primary tap-feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Name input */}
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Grahak Ka Naam (Name)*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-text-muted" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Satish Yadav"
                    required
                    autoFocus
                    className="block w-full pl-9 pr-3 py-2.5 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Customer Phone input */}
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-text-muted" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. 9876543210"
                    pattern="[0-9]{10}"
                    className="block w-full pl-9 pr-3 py-2.5 bg-dairy-bg border border-border-dairy rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Customer Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Grahak Ka Type (Type)
                </label>
                <div className="grid grid-cols-2 bg-dairy-bg border border-border-dairy rounded-xl p-0.5 h-[38px] items-center">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'give' })}
                    className={`h-full text-xs font-bold rounded-lg transition-colors tap-feedback ${
                      formData.type === 'give' ? 'bg-primary text-white shadow-xs' : 'text-text-muted'
                    }`}
                  >
                    Dena (Give Milk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'take' })}
                    className={`h-full text-xs font-bold rounded-lg transition-colors tap-feedback ${
                      formData.type === 'take' ? 'bg-primary text-white shadow-xs' : 'text-text-muted'
                    }`}
                  >
                    Lena (Take Milk)
                  </button>
                </div>
              </div>

              {/* Milk Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
                  Doodh Ka Type (Milk Type)
                </label>
                <div className="grid grid-cols-2 bg-dairy-bg border border-border-dairy rounded-xl p-0.5 h-[38px] items-center">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, milkType: 'cow' })}
                    className={`h-full text-xs font-bold rounded-lg transition-colors tap-feedback ${
                      formData.milkType === 'cow' ? 'bg-primary text-white shadow-xs' : 'text-text-muted'
                    }`}
                  >
                    Cow (गाय)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, milkType: 'buffalo' })}
                    className={`h-full text-xs font-bold rounded-lg transition-colors tap-feedback ${
                      formData.milkType === 'buffalo' ? 'bg-primary text-white shadow-xs' : 'text-text-muted'
                    }`}
                  >
                    Buffalo (भैंस)
                  </button>
                </div>
              </div>

              {/* Save trigger */}
              <button
                id="btn-customer-save"
                type="submit"
                disabled={isSaving}
                className="w-full mt-2 py-3 bg-primary hover:bg-primary-light text-white text-sm font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1 tap-feedback"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Save Grahak'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Customers;
