import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Droplets, Eye, EyeOff, MapPin, Phone, User, Building, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Toast, { ToastMessage } from '../components/Toast';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    dairyName: '',
    ownerName: '',
    address: '',
    phone: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dairyName || !formData.ownerName || !formData.address || !formData.phone || !formData.password) {
      setToast({ id: '1', type: 'error', text: 'Kripya saare details bharein.' });
      return;
    }

    setIsSubmitting(true);
    const result = await register(formData);
    setIsSubmitting(false);

    if (result.success) {
      setToast({ id: '2', type: 'success', text: 'Dairy account ban gaya! Redirecting...' });
      // Direct navigate to /login or /home, prompt suggests login
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } else {
      setToast({ id: '3', type: 'error', text: result.error || 'Registration failed.' });
    }
  };

  return (
    <div className="flex flex-col flex-1 justify-center px-6 py-8 min-h-screen bg-white">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.text} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Top logo header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
          <Droplets className="w-9 h-9 text-primary-light" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary">
          Dairy Manager
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Naya dairy account set up karein
        </p>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dairy Name */}
        <div>
          <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
            Dairy Ka Naam
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type="text"
              name="dairyName"
              value={formData.dairyName}
              onChange={handleChange}
              placeholder="e.g. Krishna Dairy"
              required
              autoFocus
              className="block w-full pl-10 pr-3 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
            />
          </div>
        </div>

        {/* Owner Name */}
        <div>
          <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
            Owner (Malik) Ka Naam
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              placeholder="e.g. Ramesh Kumar"
              required
              className="block w-full pl-10 pr-3 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
            Mobile Number (Login ID)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="10 digit number"
              required
              pattern="[0-9]{10}"
              className="block w-full pl-10 pr-3 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
            Dairy Ka Pata (Address)
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 pointer-events-none">
              <MapPin className="h-5 w-5 text-text-muted" />
            </div>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Main Bazar, Ward No. 5"
              required
              rows={2}
              className="block w-full pl-10 pr-3 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all resize-none"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password banayein"
              required
              className="block w-full pl-10 pr-10 py-3 bg-dairy-bg border border-border-dairy rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted focus:outline-none hover:text-text-primary tap-feedback"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          id="btn-register"
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-primary text-white font-semibold text-base rounded-xl hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-md active:scale-98 tap-feedback flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Account Banayein'
          )}
        </button>
      </form>

      {/* Footer Link */}
      <div className="mt-8 text-center text-sm font-medium">
        <span className="text-text-muted">Pehle se account hai? </span>
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Login Karein
        </Link>
      </div>
    </div>
  );
};

export default Register;
