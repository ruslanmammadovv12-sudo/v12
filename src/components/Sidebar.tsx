"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { t, getKeyAsPageId } from '@/utils/i18n';
import { useData } from '@/context/DataContext';
import {
  Home, Package, ShoppingCart, DollarSign, Users, Truck, Warehouse, TrendingUp, BarChart, Settings, UploadCloud, ArrowLeftRight, // Removed Trash2 icon
} from 'lucide-react';
import { Settings as SettingsType } from '@/types'; // Import Settings type with an alias

const navItems = [
  { id: 'dashboard', icon: <Home className="w-6 h-6 mr-3" /> },
  { id: 'products', icon: <Package className="w-6 h-6 mr-3" /> },
  { id: 'purchaseOrders', icon: <ShoppingCart className="w-6 h-6 mr-3" /> },
  { id: 'sellOrders', icon: <DollarSign className="w-6 h-6 mr-3" /> },
  { id: 'suppliers', icon: <Users className="w-6 h-6 mr-3" /> },
  { id: 'customers', icon: <Users className="w-6 h-6 mr-3" /> },
  { id: 'incomingPayments', icon: <DollarSign className="w-6 h-6 mr-3" /> }, // Reusing icon for now
  { id: 'outgoingPayments', icon: <DollarSign className="w-6 h-6 mr-3" /> }, // Reusing icon for now
  { id: 'warehouses', icon: <Warehouse className="w-6 h-6 mr-3" /> },
  { id: 'productMovement', icon: <ArrowLeftRight className="w-6 h-6 mr-3" /> },
  { id: 'finance', icon: <BarChart className="w-6 h-6 mr-3" /> },
  { id: 'profitability', icon: <TrendingUp className="w-6 h-6 mr-3" /> },
  { id: 'dataImportExport', icon: <UploadCloud className="w-6 h-6 mr-3" /> },
  { id: 'settings', icon: <Settings className="w-6 h-6 mr-3" /> },
  // Removed Recycle Bin item
];

const Sidebar: React.FC = () => {
  const { settings } = useData();
  const location = useLocation();
  const currentPageId = location.pathname === '/' ? 'dashboard' : getKeyAsPageId(location.pathname.substring(1));

  const companyName = settings.companyName || '';
  const companyLogo = settings.companyLogo;

  return (
    <div className="fixed top-0 left-0 h-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-64 p-4 z-20 sidebar border-r dark:border-slate-700 flex flex-col">
      <div className="flex-shrink-0 flex items-center mb-8">
        {companyLogo ? (
          <>
            <img src={companyLogo} className="w-auto h-8 mr-3 object-contain" alt="Company Logo" />
            {companyName && (
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{companyName}</h1>
            )}
          </>
        ) : companyName ? (
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{companyName}</h1>
        ) : (
          <>
            <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M12 6v12" stroke="#6b7280" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 6l9 12 9-12" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">ERP</h1>
          </>
        )}
      </div>
      <nav className="flex-grow overflow-y-auto">
        <ul>
          {navItems.map(item => {
            const pageId = getKeyAsPageId(item.id);
            const isActive = pageId === currentPageId;
            const activeClass = isActive ? 'bg-sky-500 text-white active:bg-sky-600' : 'text-slate-700 dark:text-slate-300';

            return (
              <li key={item.id} className="mb-2">
                <Link
                  to={pageId === 'dashboard' ? '/' : `/${pageId}`}
                  className={`nav-link flex items-center p-2 rounded-md hover:bg-sky-600 hover:text-white ${activeClass}`}
                >
                  {item.icon}{t(item.id as keyof typeof t)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;