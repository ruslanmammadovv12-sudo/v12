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
    // Apply theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Apply display scaling
    const scale = settings.displayScale / 100;
    document.documentElement.style.transform = `scale(${scale})`;
    document.documentElement.style.transformOrigin = 'top left';
    // Adjust width/height to prevent scrollbars due to scaling
    document.documentElement.style.width = `${100 / scale}%`;
    document.documentElement.style.height = `${100 / scale}%`;
    // Removed: document.body.style.overflow = 'auto'; // This caused the entire body to scroll

    return () => {
      // Clean up styles on unmount or setting change
      document.documentElement.style.transform = '';
      document.documentElement.style.transformOrigin = '';
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
      // Removed: document.body.style.overflow = '';
    };
  }, [settings.theme, settings.displayScale]);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-900">
      <Sidebar />
      <div id="main-content" className="ml-64 p-8 flex-grow overflow-y-auto h-screen"> {/* Added h-screen and overflow-y-auto */}
        {children}
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default MainLayout;