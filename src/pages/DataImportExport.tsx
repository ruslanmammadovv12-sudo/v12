"use client";

import React, { useRef } from 'react'; // Import useRef
import { useData } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, UploadCloud } from 'lucide-react'; // Add UploadCloud icon

const DataImportExport: React.FC = () => {
  const {
    products, suppliers, customers, warehouses, purchaseOrders, sellOrders,
    incomingPayments, outgoingPayments, productMovements, settings,
    setProducts, setSuppliers, setCustomers, setWarehouses, setPurchaseOrders,
    setSellOrders, setIncomingPayments, setOutgoingPayments, setProductMovements,
    setSettings,
    showConfirmationModal,
  } = useData();

  const fileInputRef = useRef<HTMLInputElement>(null); // Create a ref for the hidden file input

  const handleExportData = () => {
    const dataToExport = {
      products,
      suppliers,
      customers,
      warehouses,
      purchaseOrders,
      sellOrders,
      incomingPayments,
      outgoingPayments,
      productMovements,
      settings,
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp_data_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('success'), { description: t('backupData') + ' exported successfully to JSON.' });
  };

  const handleImportButtonClick = () => {
    fileInputRef.current?.click(); // Trigger the hidden file input click
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error(t('restoreError'), { description: 'No file selected.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const importedData = JSON.parse(data);

        if (typeof importedData !== 'object' || importedData === null) {
          toast.error(t('restoreError'), { description: 'Invalid JSON structure in backup file.' });
          return;
        }

        showConfirmationModal(
          t('restoreData'),
          t('restoreWarning'),
          () => {
            // Perform the restore
            setProducts(importedData.products || []);
            setSuppliers(importedData.suppliers || []);
            setCustomers(importedData.customers || []);
            setWarehouses(importedData.warehouses || []);
            setPurchaseOrders(importedData.purchaseOrders || []);
            setSellOrders(importedData.sellOrders || []);
            setIncomingPayments(importedData.incomingPayments || []);
            setOutgoingPayments(importedData.outgoingPayments || []);
            setProductMovements(importedData.productMovements || []);
            setSettings(importedData.settings || {});
            toast.success(t('restoreSuccess'));
            // Optionally reload the app to ensure all contexts are re-initialized
            setTimeout(() => window.location.reload(), 1000);
          }
        );

      } catch (error) {
        console.error("Error importing data:", error);
        toast.error(t('restoreError'), { description: 'Failed to parse backup JSON file.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200 mb-6">{t('dataImportExport')}</h1>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('backupData')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('exportDataToJson')}
        </p>
        <Button onClick={handleExportData} className="bg-sky-500 hover:bg-sky-600 text-white">
          <Download className="w-4 h-4 mr-2" />
          {t('export')}
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('restoreData')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('restoreWarning')}
        </p>
        <div className="flex items-center space-x-4">
          {/* Hidden file input */}
          <Input
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleImportData}
            ref={fileInputRef}
            className="hidden" // Hide the input visually
          />
          {/* Styled button to trigger the hidden file input */}
          <Button onClick={handleImportButtonClick} className="bg-sky-500 hover:bg-sky-600 text-white">
            <UploadCloud className="w-4 h-4 mr-2" />
            {t('import')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataImportExport;