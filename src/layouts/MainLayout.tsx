"use client";

import React, { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useData } from '@/context/DataContext';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Settings } from '@/types'; // Import types from types file

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { settings } = useData();

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-900">
      <Sidebar />
      <div id="main-content" className="ml-64 p-8 flex-grow main-content">
        {children}
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default MainLayout;