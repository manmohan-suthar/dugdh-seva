import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Plus, BarChart2, Settings, ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showActionSheet, setShowActionSheet] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isCustomersActive = () => {
    return location.pathname.startsWith('/customers');
  };

  const handlePlusAction = (route: string) => {
    setShowActionSheet(false);
    navigate(route);
  };

  return (
    <>
      {/* Bottom Nav Bar */}
      <div 
        id="bottom-nav-bar"
        className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-2 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="pointer-events-auto flex h-[64px] w-full max-w-[430px] items-center justify-around border-t border-gray-200 bg-white px-2 shadow-sm">
        {/* Item 1: Home */}
        <button
          onClick={() => navigate('/home')}
          className="flex flex-col items-center justify-center w-14 py-1 select-none cursor-pointer text-center active:scale-95 transition-transform"
        >
          <Home 
            className={`w-[22px] h-[22px] ${
              isActive('/home') ? 'text-[#2E7D32]' : 'text-gray-400 hover:text-[#2E7D32]'
            }`} 
          />
          <span 
            className={`text-[10px] uppercase mt-0.5 tracking-wider font-semibold ${
              isActive('/home') ? 'text-[#2E7D32] font-extrabold' : 'text-gray-400'
            }`}
          >
            Home
          </span>
        </button>

        {/* Item 2: Grahak (Customers) */}
        <button
          onClick={() => navigate('/customers')}
          className="flex flex-col items-center justify-center w-14 py-1 select-none cursor-pointer text-center active:scale-95 transition-transform"
        >
          <Users 
            className={`w-[22px] h-[22px] ${
              isCustomersActive() ? 'text-[#2E7D32]' : 'text-gray-400 hover:text-[#2E7D32]'
            }`} 
          />
          <span 
            className={`text-[10px] uppercase mt-0.5 tracking-wider font-semibold ${
              isCustomersActive() ? 'text-[#2E7D32] font-extrabold' : 'text-gray-400'
            }`}
          >
            Grahak
          </span>
        </button>

        {/* Item 3: Raised Overlapping Plus Center Button */}
        <div className="-mt-12 z-50">
          <button
            id="center-plus-btn"
            onClick={() => setShowActionSheet(true)}
            className="w-[58px] h-[58px] bg-[#2E7D32] rounded-full border-[6px] border-[#F5F5F0] shadow-md flex items-center justify-center text-white active:scale-90 hover:scale-105 transition-all cursor-pointer hover:bg-green-700"
            aria-label="New Transaction Options"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>
        </div>

        {/* Item 4: Reports (Dashboard / Analytics Summary) */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center justify-center w-14 py-1 select-none cursor-pointer text-center active:scale-95 transition-transform"
        >
          <BarChart2 
            className={`w-[22px] h-[22px] ${
              isActive('/dashboard') ? 'text-[#2E7D32]' : 'text-gray-400 hover:text-[#2E7D32]'
            }`} 
          />
          <span 
            className={`text-[10px] uppercase mt-0.5 tracking-wider font-semibold ${
              isActive('/dashboard') ? 'text-[#2E7D32] font-extrabold' : 'text-gray-400'
            }`}
          >
            Reports
          </span>
        </button>

        {/* Item 5: Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center justify-center w-14 py-1 select-none cursor-pointer text-center active:scale-95 transition-transform"
        >
          <Settings 
            className={`w-[22px] h-[22px] ${
              isActive('/settings') ? 'text-[#2E7D32]' : 'text-gray-400 hover:text-[#2E7D32]'
            }`} 
          />
          <span 
            className={`text-[10px] uppercase mt-0.5 tracking-wider font-semibold ${
              isActive('/settings') ? 'text-[#2E7D32] font-extrabold' : 'text-gray-400'
            }`}
        >
          Settings
          </span>
        </button>
        </div>
      </div>

      {/* Action Sheet Modal */}
      {showActionSheet && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setShowActionSheet(false)}
          />
          
          {/* Content Sheet */}
          <div 
            id="action-sheet-panel"
            className="relative bg-white w-full max-w-[430px] rounded-t-3xl p-6 shadow-2xl animate-fade-in-up z-10 bottom-0"
          >
            {/* Top Sheet Drag Indicator Block */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display font-bold text-lg text-gray-800">
                Kaam Shuru Karein (Select Task)
              </h3>
              <button 
                onClick={() => setShowActionSheet(false)}
                className="p-1.5 rounded-full bg-[#F5F5F0] text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Option 1: Collect Milk */}
              <button
                id="btn-sheet-collect"
                onClick={() => handlePlusAction('/collect')}
                className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[#2E7D32]/5 hover:bg-[#2E7D32]/10 border border-[#2E7D32]/15 transition-all text-center group cursor-pointer active:scale-95"
              >
                <ArrowDownCircle className="w-11 h-11 text-[#2E7D32] mb-3 transition-transform group-hover:scale-105" />
                <span className="font-display font-bold text-[15px] text-[#2E7D32]">
                  Doodh Lena
                </span>
                <span className="text-[11px] text-gray-400 mt-1 leading-tight font-medium">
                  grahak se doodh collect karein (Buy)
                </span>
              </button>

              {/* Option 2: Sell Milk */}
              <button
                id="btn-sheet-sell"
                onClick={() => handlePlusAction('/sell')}
                className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[#F9A825]/5 hover:bg-[#F9A825]/10 border border-[#F9A825]/15 transition-all text-center group cursor-pointer active:scale-95"
              >
                <ArrowUpCircle className="w-11 h-11 text-[#F9A825] mb-3 transition-transform group-hover:scale-105" />
                <span className="font-display font-bold text-[15px] text-[#e4991f]">
                  Doodh Dena
                </span>
                <span className="text-[11px] text-gray-400 mt-1 leading-tight font-medium">
                  grahak ko doodh bechein (Sell)
                </span>
              </button>
            </div>

            <div className="mt-5 text-center">
              <button
                onClick={() => setShowActionSheet(false)}
                className="w-full py-3 bg-[#F5F5F0] rounded-xl text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomNav;
