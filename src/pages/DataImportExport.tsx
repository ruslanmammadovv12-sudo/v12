"use client";

import React, { useRef } from 'react'; // Import useRef
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext'; // Import MOCK_CURRENT_DATE from DataContext
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, UploadCloud } from 'lucide-react'; // Add UploadCloud icon
import ExcelImportButton from '@/components/ExcelImportButton'; // Import the new component
import ExcelExportButton from '@/components/ExcelExportButton'; // Import the new ExcelExportButton
import { Product, Customer } from '@/types'; // Import Product and Customer types from types file

const DataImportExport: React.FC = () => {
  const {
    products, suppliers, customers, warehouses, purchaseOrders, sellOrders,
    incomingPayments, outgoingPayments, productMovements, settings,
    setProducts, setSuppliers, setCustomers, setWarehouses, setPurchaseOrders,
    setSellOrders, setIncomingPayments, setOutgoingPayments, setProductMovements,
    setSettings,
    showConfirmationModal,
    getNextId, // Added for Excel import
    setNextIdForCollection, // Added for Excel import
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

  const handleImportProducts = (data: any[]) => {
    const newProducts: Product[] = data.map((row: any) => ({
      id: getNextId('products'), // Assign new ID for each imported product
      name: String(row['Product Name'] || ''),
      sku: String(row['SKU'] || ''),
      category: String(row['Category'] || ''),
      description: String(row['Description'] || ''),
      stock: {}, // Initialize empty stock, will be updated by POs or movements
      minStock: parseInt(row['Min. Stock'] || '0'),
      averageLandedCost: parseFloat(row['Avg. Landed Cost'] || '0'),
      imageUrl: String(row['Image URL'] || ''),
    }));

    setProducts(prev => {
      const existingSkus = new Set(prev.map(p => p.sku.toLowerCase()));
      const uniqueNewProducts = newProducts.filter(p => !existingSkus.has(p.sku.toLowerCase()));

      if (uniqueNewProducts.length < newProducts.length) {
        toast.info(t('excelImportInfo'), { description: t('duplicateProductsSkipped') });
      }

      const allProducts = [...prev, ...uniqueNewProducts];
      const maxId = allProducts.reduce((max, p) => Math.max(max, p.id), 0);
      setNextIdForCollection('products', maxId + 1); // Update next ID counter
      return allProducts;
    });
  };

  const handleImportCustomers = (data: any[]) => {
    const newCustomers: Customer[] = data.map((row: any) => ({
      id: getNextId('customers'), // Assign new ID for each imported customer
      name: String(row['Customer Name'] || ''),
      contact: String(row['Contact Person'] || ''),
      email: String(row['Email'] || ''),
      phone: String(row['Phone'] || ''),
      address: String(row['Address'] || ''),
    }));

    setCustomers(prev => {
      const existingEmails = new Set(prev.map(c => c.email.toLowerCase()).filter(Boolean));
      const uniqueNewCustomers = newCustomers.filter(c => !c.email || !existingEmails.has(c.email.toLowerCase()));

      if (uniqueNewCustomers.length < newCustomers.length) {
        toast.info(t('excelImportInfo'), { description: t('duplicateCustomersSkipped') });
      }

      const allCustomers = [...prev, ...uniqueNewCustomers];
      const maxId = allCustomers.reduce((max, c) => Math.max(max, c.id), 0);
      setNextIdForCollection('customers', maxId + 1); // Update next ID counter
      return allCustomers;
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200 mb-6">{t('dataImportExport')}</h1>

      {/* JSON Backup/Restore */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('backupRestore')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('exportDataToJson')}
        </p>
        <Button onClick={handleExportData} className="bg-sky-500 hover:bg-sky-600 text-white w-full mb-4">
          <Download className="w-4 h-4 mr-2" />
          {t('exportJsonFile')}
        </Button>
        <div className="mt-4">
          <p className="text-gray-600 dark:text-slate-400 mb-4">
            {t('restoreWarning')}
          </p>
          <div className="flex flex-col space-y-4"> {/* Changed to flex-col and space-y */}
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImportData}
              ref={fileInputRef}
              className="hidden"
            />
            <Button onClick={handleImportButtonClick} className="bg-sky-500 hover:bg-sky-600 text-white w-full"> {/* Added w-full */}
              <UploadCloud className="w-4 h-4 mr-2" />
              {t('importJsonFile')}
            </Button>
          </div>
        </div>
      </div>

      {/* Excel Export Sections */}
      <ExcelExportButton
        label={t('exportProductsToExcel')}
        description={t('exportProductsDescription')}
        data={products}
        fileName="products_export"
        sheetName="Products"
        columns={[
          { header: 'ID', accessor: 'id' },
          { header: 'Product Name', accessor: 'name' },
          { header: 'SKU', accessor: 'sku' },
          { header: 'Category', accessor: 'category' },
          { header: 'Description', accessor: 'description' },
          { header: 'Min. Stock', accessor: 'minStock' },
          { header: 'Avg. Landed Cost', accessor: 'averageLandedCost' },
          { header: 'Image URL', accessor: 'imageUrl' },
          // Note: Stock is per warehouse, so exporting total stock might be more practical here
          { header: 'Total Stock', accessor: 'totalStock' }, // Assuming 'totalStock' is calculated or added to product objects
        ]}
      />

      <ExcelExportButton
        label={t('exportCustomersToExcel')}
        description={t('exportCustomersDescription')}
        data={customers}
        fileName="customers_export"
        sheetName="Customers"
        columns={[
          { header: 'ID', accessor: 'id' },
          { header: 'Customer Name', accessor: 'name' },
          { header: 'Contact Person', accessor: 'contact' },
          { header: 'Email', accessor: 'email' },
          { header: 'Phone', accessor: 'phone' },
          { header: 'Address', accessor: 'address' },
        ]}
      />

      {/* Excel Import Sections */}
      <ExcelImportButton
        label={t('importProductsFromExcel')}
        description={t('importProductsDescription')}
        onImport={handleImportProducts}
        requiredColumns={['Product Name', 'SKU', 'Category', 'Description', 'Min. Stock', 'Avg. Landed Cost', 'Image URL']}
      />

      <ExcelImportButton
        label={t('importCustomersFromExcel')}
        description={t('importCustomersDescription')}
        onImport={handleImportCustomers}
        requiredColumns={['Customer Name', 'Contact Person', 'Email', 'Phone', 'Address']}
      />
    </div>
  );
};

export default DataImportExport;