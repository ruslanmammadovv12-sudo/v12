"use client";

import React, { useRef, useMemo, useCallback } from 'react'; // Added useCallback
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, UploadCloud, Trash2, RotateCcw, XCircle } from 'lucide-react'; // Added Recycle Bin icons
import ExcelImportButton from '@/components/ExcelImportButton';
import ExcelExportButton from '@/components/ExcelImportButton';
import PurchaseOrdersMultiSheetExportButton from '@/components/PurchaseOrdersMultiSheetExportButton';
import SellOrdersMultiSheetExportButton from '@/components/SellOrdersMultiSheetExportButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Added Table components for Recycle Bin
import { format } from 'date-fns'; // Added for date formatting in Recycle Bin
import { Product, Customer, Supplier, PurchaseOrder, SellOrder, Payment, ProductMovement, CollectionKey } from '@/types';

const DataImportExport: React.FC = () => {
  const {
    products, suppliers, customers, warehouses, purchaseOrders, sellOrders,
    incomingPayments, outgoingPayments, productMovements, settings, currencyRates,
    setProducts, setSuppliers, setCustomers, setWarehouses, setPurchaseOrders,
    setSellOrders, setIncomingPayments, setOutgoingPayments, setProductMovements,
    setSettings, setCurrencyRates,
    showConfirmationModal,
    getNextId,
    setNextIdForCollection,
    recycleBin, // Added for Recycle Bin
    restoreFromRecycleBin, // Added for Recycle Bin
    deletePermanentlyFromRecycleBin, // Added for Recycle Bin
    cleanRecycleBin, // Added for Recycle Bin
    showAlertModal, // Added for Recycle Bin
  } = useData();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const supplierMap = useMemo(() => suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as { [key: number]: Supplier }), [suppliers]);
  const customerMap = useMemo(() => customers.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as { [key: number]: Customer }), [customers]);
  const warehouseMap = useMemo(() => warehouses.reduce((acc, w) => ({ ...acc, [w.id]: w }), {} as { [key: number]: Warehouse }), [warehouses]);
  const productMap = useMemo(() => products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product }), [products]);

  const formatOrderItems = (items: any[] | undefined, productMap: { [key: number]: Product }, currency?: string, includeLandedCost = false) => {
    if (!items || items.length === 0) return '';
    return items.map(item => {
      const product = productMap[item.productId];
      const productName = product?.name || 'Unknown Product';
      const itemCurrency = currency || 'AZN';
      let itemString = `${productName} (x${item.qty}) @ ${item.price.toFixed(2)} ${itemCurrency}`;
      if (includeLandedCost && item.landedCostPerUnit !== undefined) {
        itemString += ` (LC: ${item.landedCostPerUnit.toFixed(2)} AZN)`;
      }
      return itemString;
    }).join('; ');
  };

  const formatMovementItems = (items: { productId: number; quantity: number }[] | undefined, productMap: { [key: number]: Product }) => {
    if (!items || items.length === 0) return '';
    return items.map(item => {
      const product = productMap[item.productId];
      const productName = product?.name || 'Unknown Product';
      return `${productName} (x${item.quantity})`;
    }).join('; ');
  };

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
      currencyRates,
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
    fileInputRef.current?.click();
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
            setCurrencyRates(importedData.currencyRates || currencyRates);
            toast.success(t('restoreSuccess'));
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
      id: getNextId('products'),
      name: String(row['Product Name'] || ''),
      sku: String(row['SKU'] || ''),
      category: String(row['Category'] || ''),
      description: String(row['Description'] || ''),
      stock: {},
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
      setNextIdForCollection('products', maxId + 1);
      return allProducts;
    });
  };

  const handleImportCustomers = (data: any[]) => {
    const newCustomers: Customer[] = data.map((row: any) => ({
      id: getNextId('customers'),
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
      setNextIdForCollection('customers', maxId + 1);
      return allCustomers;
    });
  };

  const handleImportSuppliers = (data: any[]) => {
    const newSuppliers: Supplier[] = data.map((row: any) => ({
      id: getNextId('suppliers'),
      name: String(row['Supplier Name'] || ''),
      contact: String(row['Contact Person'] || ''),
      email: String(row['Email'] || ''),
      phone: String(row['Phone'] || ''),
      address: String(row['Address'] || ''),
    }));

    setSuppliers(prev => {
      const existingEmails = new Set(prev.map(s => s.email.toLowerCase()).filter(Boolean));
      const uniqueNewSuppliers = newSuppliers.filter(s => !s.email || !existingEmails.has(s.email.toLowerCase()));

      if (uniqueNewSuppliers.length < newSuppliers.length) {
        toast.info(t('excelImportInfo'), { description: t('duplicateSuppliersSkipped') });
      }

      const allSuppliers = [...prev, ...uniqueNewSuppliers];
      const maxId = allSuppliers.reduce((max, s) => Math.max(max, s.id), 0);
      setNextIdForCollection('suppliers', maxId + 1);
      return allSuppliers;
    });
  };

  const handleImportPurchaseOrders = (data: any[]) => {
    const newPurchaseOrders: PurchaseOrder[] = [];
    const errors: string[] = [];

    data.forEach((row: any, index: number) => {
      const supplier = suppliers.find(s => s.name === String(row['Supplier Name']));
      const warehouse = warehouses.find(w => w.name === String(row['Warehouse Name']));

      if (!supplier) {
        errors.push(`Row ${index + 2}: Supplier "${row['Supplier Name']}" not found.`);
        return;
      }
      if (!warehouse) {
        errors.push(`Row ${index + 2}: Warehouse "${row['Warehouse Name']}" not found.`);
        return;
      }

      if (!row['Order Date'] || !row['Status'] || !row['Currency'] || !row['Total (AZN)']) {
        errors.push(`Row ${index + 2}: Missing required fields (Order Date, Status, Currency, Total (AZN)).`);
        return;
      }

      const newOrder: PurchaseOrder = {
        id: getNextId('purchaseOrders'),
        contactId: supplier.id,
        orderDate: String(row['Order Date']),
        warehouseId: warehouse.id,
        status: row['Status'] as PurchaseOrder['status'],
        items: [],
        currency: row['Currency'] as PurchaseOrder['currency'],
        exchangeRate: parseFloat(row['Exchange Rate to AZN'] || '0') || undefined,
        transportationFees: parseFloat(row['Transportation Fees'] || '0'),
        transportationFeesCurrency: row['Transportation Fees Currency'] as PurchaseOrder['transportationFeesCurrency'] || 'AZN',
        customFees: parseFloat(row['Custom Fees'] || '0'),
        customFeesCurrency: row['Custom Fees Currency'] as PurchaseOrder['customFeesCurrency'] || 'AZN',
        additionalFees: parseFloat(row['Additional Fees'] || '0'),
        additionalFeesCurrency: row['Additional Fees Currency'] as PurchaseOrder['additionalFeesCurrency'] || 'AZN',
        total: parseFloat(row['Total (AZN)'] || '0'),
      };
      newPurchaseOrders.push(newOrder);
    });

    if (errors.length > 0) {
      toast.error(t('excelImportError'), {
        description: `${t('importErrorsFound')}: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
        duration: 10000,
      });
    }

    setPurchaseOrders(prev => {
      const allOrders = [...prev, ...newPurchaseOrders];
      const maxId = allOrders.reduce((max, o) => Math.max(max, o.id), 0);
      setNextIdForCollection('purchaseOrders', maxId + 1);
      return allOrders;
    });

    if (newPurchaseOrders.length > 0) {
      toast.success(t('excelImportSuccess'), { description: `${newPurchaseOrders.length} ${t('purchaseOrders')} ${t('importedSuccessfully')}. ${t('itemsNotImportedWarning')}` });
    }
  };

  const handleImportSellOrders = (data: any[]) => {
    const newSellOrders: SellOrder[] = [];
    const errors: string[] = [];

    data.forEach((row: any, index: number) => {
      const customer = customers.find(c => c.name === String(row['Customer Name']));
      const warehouse = warehouses.find(w => w.name === String(row['Warehouse Name']));

      if (!customer) {
        errors.push(`Row ${index + 2}: Customer "${row['Customer Name']}" not found.`);
        return;
      }
      if (!warehouse) {
        errors.push(`Row ${index + 2}: Warehouse "${row['Warehouse Name']}" not found.`);
        return;
      }

      if (!row['Order Date'] || !row['Status'] || !row['VAT (%)'] || !row['Total (AZN)']) {
        errors.push(`Row ${index + 2}: Missing required fields (Order Date, Status, VAT (%), Total (AZN)).`);
        return;
      }

      const newOrder: SellOrder = {
        id: getNextId('sellOrders'),
        contactId: customer.id,
        orderDate: String(row['Order Date']),
        warehouseId: warehouse.id,
        status: row['Status'] as SellOrder['status'],
        items: [],
        vatPercent: parseFloat(row['VAT (%)'] || '0'),
        total: parseFloat(row['Total (AZN)'] || '0'),
      };
      newSellOrders.push(newOrder);
    });

    if (errors.length > 0) {
      toast.error(t('excelImportError'), {
        description: `${t('importErrorsFound')}: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
        duration: 10000,
      });
    }

    setSellOrders(prev => {
      const allOrders = [...prev, ...newSellOrders];
      const maxId = allOrders.reduce((max, o) => Math.max(max, o.id), 0);
      setNextIdForCollection('sellOrders', maxId + 1);
      return allOrders;
    });

    if (newSellOrders.length > 0) {
      toast.success(t('excelImportSuccess'), { description: `${newSellOrders.length} ${t('sellOrders')} ${t('importedSuccessfully')}. ${t('itemsNotImportedWarning')}` });
    }
  };

  const handleImportIncomingPayments = (data: any[]) => {
    const newPayments: Payment[] = [];
    const errors: string[] = [];

    data.forEach((row: any, index: number) => {
      const orderId = parseInt(row['Linked Order ID'] || '0');
      const paymentCategory = row['Payment Category'] as Payment['paymentCategory'] || 'manual';
      const paymentCurrency = row['Payment Currency'] as Payment['paymentCurrency'] || 'AZN';

      if (orderId !== 0) {
        const order = sellOrders.find(o => o.id === orderId);
        if (!order) {
          errors.push(`Row ${index + 2}: Linked Sell Order ID "${orderId}" not found.`);
          return;
        }
      }

      if (!row['Payment Date'] || !row['Amount Paid'] || !row['Method']) {
        errors.push(`Row ${index + 2}: Missing required fields (Payment Date, Amount Paid, Method).`);
        return;
      }
      if (paymentCategory === 'manual' && !row['Manual Description']) {
        errors.push(`Row ${index + 2}: Manual Expense requires a description.`);
        return;
      }

      const newPayment: Payment = {
        id: getNextId('incomingPayments'),
        orderId: orderId,
        paymentCategory: paymentCategory,
        manualDescription: row['Manual Description'] || undefined,
        date: String(row['Payment Date']),
        amount: parseFloat(row['Amount Paid'] || '0'),
        paymentCurrency: paymentCurrency,
        paymentExchangeRate: parseFloat(row['Exchange Rate to AZN'] || '0') || undefined,
        method: String(row['Method'] || ''),
      };
      newPayments.push(newPayment);
    });

    if (errors.length > 0) {
      toast.error(t('excelImportError'), {
        description: `${t('importErrorsFound')}: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
        duration: 10000,
      });
    }

    setIncomingPayments(prev => {
      const allPayments = [...prev, ...newPayments];
      const maxId = allPayments.reduce((max, p) => Math.max(max, p.id), 0);
      setNextIdForCollection('incomingPayments', maxId + 1);
      return allPayments;
    });

    if (newPayments.length > 0) {
      toast.success(t('excelImportSuccess'), { description: `${newPayments.length} ${t('incomingPayments')} ${t('importedSuccessfully')}.` });
    }
  };

  const handleImportOutgoingPayments = (data: any[]) => {
    const newPayments: Payment[] = [];
    const errors: string[] = [];

    data.forEach((row: any, index: number) => {
      const orderId = parseInt(row['Linked Order ID'] || '0');
      const paymentCategory = row['Payment Category'] as Payment['paymentCategory'] || 'manual';
      const paymentCurrency = row['Payment Currency'] as Payment['paymentCurrency'] || 'AZN';

      if (orderId !== 0) {
        const order = purchaseOrders.find(o => o.id === orderId);
        if (!order) {
          errors.push(`Row ${index + 2}: Linked Purchase Order ID "${orderId}" not found.`);
          return;
        }
      }

      if (!row['Payment Date'] || !row['Amount Paid'] || !row['Method']) {
        errors.push(`Row ${index + 2}: Missing required fields (Payment Date, Amount Paid, Method).`);
        return;
      }
      if (paymentCategory === 'manual' && !row['Manual Description']) {
        errors.push(`Row ${index + 2}: Manual Expense requires a description.`);
        return;
      }

      const newPayment: Payment = {
        id: getNextId('outgoingPayments'),
        orderId: orderId,
        paymentCategory: paymentCategory,
        manualDescription: row['Manual Description'] || undefined,
        date: String(row['Payment Date']),
        amount: parseFloat(row['Amount Paid'] || '0'),
        paymentCurrency: paymentCurrency,
        paymentExchangeRate: parseFloat(row['Exchange Rate to AZN'] || '0') || undefined,
        method: String(row['Method'] || ''),
      };
      newPayments.push(newPayment);
    });

    if (errors.length > 0) {
      toast.error(t('excelImportError'), {
        description: `${t('importErrorsFound')}: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
        duration: 10000,
      });
    }

    setOutgoingPayments(prev => {
      const allPayments = [...prev, ...newPayments];
      const maxId = allPayments.reduce((max, p) => Math.max(max, p.id), 0);
      setNextIdForCollection('outgoingPayments', maxId + 1);
      return allPayments;
    });

    if (newPayments.length > 0) {
      toast.success(t('excelImportSuccess'), { description: `${newPayments.length} ${t('outgoingPayments')} ${t('importedSuccessfully')}.` });
    }
  };

  const handleImportProductMovements = (data: any[]) => {
    const newMovements: ProductMovement[] = [];
    const errors: string[] = [];

    data.forEach((row: any, index: number) => {
      const sourceWarehouse = warehouses.find(w => w.name === String(row['Source Warehouse Name']));
      const destWarehouse = warehouses.find(w => w.name === String(row['Destination Warehouse Name']));

      if (!sourceWarehouse) {
        errors.push(`Row ${index + 2}: Source Warehouse "${row['Source Warehouse Name']}" not found.`);
        return;
      }
      if (!destWarehouse) {
        errors.push(`Row ${index + 2}: Destination Warehouse "${row['Destination Warehouse Name']}" not found.`);
        return;
      }

      if (!row['Movement Date']) {
        errors.push(`Row ${index + 2}: Missing required field (Movement Date).`);
        return;
      }

      const newMovement: ProductMovement = {
        id: getNextId('productMovements'),
        sourceWarehouseId: sourceWarehouse.id,
        destWarehouseId: destWarehouse.id,
        items: [],
        date: String(row['Movement Date']),
      };
      newMovements.push(newMovement);
    });

    if (errors.length > 0) {
      toast.error(t('excelImportError'), {
        description: `${t('importErrorsFound')}: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
        duration: 10000,
      });
    }

    setProductMovements(prev => {
      const allMovements = [...prev, ...newMovements];
      const maxId = allMovements.reduce((max, m) => Math.max(max, m.id), 0);
      setNextIdForCollection('productMovements', maxId + 1);
      return allMovements;
    });

    if (newMovements.length > 0) {
      toast.success(t('excelImportSuccess'), { description: `${newMovements.length} ${t('productMovement')} ${t('importedSuccessfully')}. ${t('itemsNotImportedWarning')}` });
    }
  };

  // Helper function for Recycle Bin summary
  const getItemSummary = useCallback((item: any, collectionKey: CollectionKey): string => {
    switch (collectionKey) {
      case 'products':
        const product = item as Product;
        return `${product.name} (SKU: ${product.sku})`;
      case 'suppliers':
        const supplier = item as Supplier;
        return `${supplier.name} (Contact: ${supplier.contact})`;
      case 'customers':
        const customer = item as Customer;
        return `${customer.name} (Email: ${customer.email})`;
      case 'warehouses':
        const warehouse = item as Warehouse;
        return `${warehouse.name} (${warehouse.location})`;
      case 'purchaseOrders':
        const po = item as PurchaseOrder;
        const poSupplier = supplierMap[po.contactId]?.name || 'N/A';
        return `PO #${po.id} (${poSupplier}) - Total: ${po.total.toFixed(2)} AZN`;
      case 'sellOrders':
        const so = item as SellOrder;
        const soCustomer = customerMap[so.contactId]?.name || 'N/A';
        return `SO #${so.id} (${soCustomer}) - Total: ${so.total.toFixed(2)} AZN`;
      case 'incomingPayments':
      case 'outgoingPayments':
        const payment = item as Payment;
        const orderRef = payment.orderId === 0 ? t('manualExpense') : `${t('orderId')} #${payment.orderId}`;
        return `${t('paymentId')} #${payment.id} - ${payment.amount.toFixed(2)} ${payment.paymentCurrency} (${orderRef})`;
      case 'productMovements':
        const pm = item as ProductMovement;
        const source = warehouseMap[pm.sourceWarehouseId]?.name || 'N/A';
        const dest = warehouseMap[pm.destWarehouseId]?.name || 'N/A';
        return `${t('movement')} #${pm.id} from ${source} to ${dest}`;
      default:
        return JSON.stringify(item);
    }
  }, [productMap, supplierMap, customerMap, warehouseMap]); // Added maps as dependencies for useCallback

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
          <div className="flex flex-col space-y-4">
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImportData}
              ref={fileInputRef}
              className="hidden"
            />
            <Button onClick={handleImportButtonClick} className="bg-sky-500 hover:bg-sky-600 text-white w-full">
              <UploadCloud className="w-4 h-4 mr-2" />
              {t('importJsonFile')}
            </Button>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('products')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('productsImportExportDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExcelImportButton
            buttonLabel={t('importExcelFile')}
            description={t('importProductsDescription')}
            onImport={handleImportProducts}
            requiredColumns={['Product Name', 'SKU', 'Category', 'Description', 'Min. Stock', 'Avg. Landed Cost', 'Image URL']}
          />
          <ExcelExportButton
            buttonLabel={t('exportExcelFile')}
            data={products.map(p => ({
              ...p,
              totalStock: Object.values(p.stock || {}).reduce((a, b) => a + b, 0),
            }))}
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
              { header: 'Total Stock', accessor: 'totalStock' },
            ]}
          />
        </div>
      </div>

      {/* Customers Section */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('customers')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('customersImportExportDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExcelImportButton
            buttonLabel={t('importExcelFile')}
            description={t('importCustomersDescription')}
            onImport={handleImportCustomers}
            requiredColumns={['Customer Name', 'Contact Person', 'Email', 'Phone', 'Address']}
          />
          <ExcelExportButton
            buttonLabel={t('exportExcelFile')}
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
        </div>
      </div>

      {/* Suppliers Section */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('suppliers')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('suppliersImportExportDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExcelImportButton
            buttonLabel={t('importExcelFile')}
            description={t('importSuppliersDescription')}
            onImport={handleImportSuppliers}
            requiredColumns={['Supplier Name', 'Contact Person', 'Email', 'Phone', 'Address']}
          />
          <ExcelExportButton
            buttonLabel={t('exportExcelFile')}
            data={suppliers}
            fileName="suppliers_export"
            sheetName="Suppliers"
            columns={[
              { header: 'ID', accessor: 'id' },
              { header: 'Supplier Name', accessor: 'name' },
              { header: 'Contact Person', accessor: 'contact' },
              { header: 'Email', accessor: 'email' },
              { header: 'Phone', accessor: 'phone' },
              { header: 'Address', accessor: 'address' },
            ]}
          />
        </div>
      </div>

      {/* Purchase Orders Section */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('purchaseOrders')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('purchaseOrdersImportExportDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExcelImportButton
            buttonLabel={t('importExcelFile')}
            description={t('importPurchaseOrdersDescription')}
            onImport={handleImportPurchaseOrders}
            requiredColumns={['Supplier Name', 'Warehouse Name', 'Order Date', 'Status', 'Currency', 'Total (AZN)']}
          />
          <PurchaseOrdersMultiSheetExportButton
            buttonLabel={t('exportExcelFileDetailed')}
            purchaseOrders={purchaseOrders}
            productMap={productMap}
            supplierMap={supplierMap}
            warehouseMap={warehouseMap}
            currencyRates={currencyRates}
          />
        </div>
      </div>

      {/* Sell Orders Section */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('sellOrders')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('sellOrdersImportExportDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExcelImportButton
            buttonLabel={t('importExcelFile')}
            description={t('importSellOrdersDescription')}
            onImport={handleImportSellOrders}
            requiredColumns={['Customer Name', 'Warehouse Name', 'Order Date', 'Status', 'VAT (%)', 'Total (AZN)']}
          />
          <SellOrdersMultiSheetExportButton
            buttonLabel={t('exportExcelFileDetailed')}
            sellOrders={sellOrders}
            productMap={productMap}
            customerMap={customerMap}
            warehouseMap={warehouseMap}
          />
        </div>
      </div>

      {/* Incoming Payments Section */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('incomingPayments')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('incomingPaymentsImportExportDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExcelImportButton
            buttonLabel={t('importExcelFile')}
            description={t('importIncomingPaymentsDescription')}
            onImport={handleImportIncomingPayments}
            requiredColumns={['Payment Date', 'Amount Paid', 'Method', 'Payment Currency']}
          />
          <ExcelExportButton
            buttonLabel={t('exportExcelFile')}
            data={incomingPayments.map(p => {
              let linkedOrderDisplay = '';
              if (p.orderId === 0) {
                linkedOrderDisplay = t('manualExpense');
              } else {
                const order = sellOrders.find(o => o.id === p.orderId);
                const customerName = order ? customerMap[order.contactId]?.name || 'Unknown' : 'N/A';
                linkedOrderDisplay = `${t('orderId')} #${p.orderId} (${customerName})`;
              }
              return {
                ...p,
                linkedOrderDisplay,
                paymentCategoryDisplay: p.paymentCategory || 'manual',
              };
            })}
            fileName="incoming_payments_export"
            sheetName="Incoming Payments"
            columns={[
              { header: 'ID', accessor: 'id' },
              { header: 'Linked Order ID', accessor: 'orderId' },
              { header: 'Payment Category', accessor: 'paymentCategoryDisplay' },
              { header: 'Manual Description', accessor: 'manualDescription' },
              { header: 'Payment Date', accessor: 'date' },
              { header: 'Amount Paid', accessor: 'amount' },
              { header: 'Payment Currency', accessor: 'paymentCurrency' },
              { header: 'Exchange Rate to AZN', accessor: 'paymentExchangeRate' },
              { header: 'Method', accessor: 'method' },
            ]}
          />
        </div>
      </div>

      {/* Outgoing Payments Section */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('outgoingPayments')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('outgoingPaymentsImportExportDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExcelImportButton
            buttonLabel={t('importExcelFile')}
            description={t('importOutgoingPaymentsDescription')}
            onImport={handleImportOutgoingPayments}
            requiredColumns={['Payment Date', 'Amount Paid', 'Method', 'Payment Currency']}
          />
          <ExcelExportButton
            buttonLabel={t('exportExcelFile')}
            data={outgoingPayments.map(p => {
              let linkedOrderDisplay = '';
              if (p.orderId === 0) {
                linkedOrderDisplay = t('manualExpense');
              } else {
                const order = purchaseOrders.find(o => o.id === p.orderId);
                const supplierName = order ? supplierMap[order.contactId]?.name || 'Unknown' : 'N/A';
                const categoryText = p.paymentCategory === 'products' ? t('paymentForProducts') : (p.paymentCategory === 'fees' ? t('paymentForFees') : '');
                linkedOrderDisplay = `${t('orderId')} #${p.orderId} (${supplierName}) ${categoryText}`;
              }
              return {
                ...p,
                linkedOrderDisplay,
                paymentCategoryDisplay: p.paymentCategory || 'manual',
              };
            })}
            fileName="outgoing_payments_export"
            sheetName="Outgoing Payments"
            columns={[
              { header: 'ID', accessor: 'id' },
              { header: 'Linked Order ID', accessor: 'orderId' },
              { header: 'Payment Category', accessor: 'paymentCategoryDisplay' },
              { header: 'Manual Description', accessor: 'manualDescription' },
              { header: 'Payment Date', accessor: 'date' },
              { header: 'Amount Paid', accessor: 'amount' },
              { header: 'Payment Currency', accessor: 'paymentCurrency' },
              { header: 'Exchange Rate to AZN', accessor: 'paymentExchangeRate' },
              { header: 'Method', accessor: 'method' },
            ]}
          />
        </div>
      </div>

      {/* Product Movements Section */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('productMovement')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('productMovementsImportExportDescription')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExcelImportButton
            buttonLabel={t('importExcelFile')}
            description={t('importProductMovementsDescription')}
            onImport={handleImportProductMovements}
            requiredColumns={['Source Warehouse Name', 'Destination Warehouse Name', 'Movement Date']}
          />
          <ExcelExportButton
            buttonLabel={t('exportExcelFile')}
            data={productMovements.map(pm => ({
              ...pm,
              sourceWarehouseName: warehouseMap[pm.sourceWarehouseId]?.name || 'N/A',
              destWarehouseName: warehouseMap[pm.destWarehouseId]?.name || 'N/A',
              itemsString: formatMovementItems(pm.items, productMap),
            }))}
            fileName="product_movements_export"
            sheetName="Product Movements"
            columns={[
              { header: 'ID', accessor: 'id' },
              { header: 'Source Warehouse Name', accessor: 'sourceWarehouseName' },
              { header: 'Destination Warehouse Name', accessor: 'destWarehouseName' },
              { header: 'Movement Date', accessor: 'date' },
              { header: 'Items', accessor: 'itemsString' },
            ]}
          />
        </div>
      </div>

      {/* Recycle Bin Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300">{t('recycleBin')}</h2>
          <Button onClick={cleanRecycleBin} variant="destructive" disabled={recycleBin.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            {t('cleanRecycleBin')}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 dark:bg-slate-700">
                <TableHead className="p-3">{t('itemType')}</TableHead>
                <TableHead className="p-3">{t('originalId')}</TableHead>
                <TableHead className="p-3">{t('dataSummary')}</TableHead>
                <TableHead className="p-3">{t('deletedAt')}</TableHead>
                <TableHead className="p-3">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recycleBin.length > 0 ? (
                recycleBin.map(item => (
                  <TableRow key={item.id} className="border-b dark:border-slate-700 text-gray-800 dark:text-slate-300">
                    <TableCell className="p-3 capitalize">{t(item.collectionKey)}</TableCell>
                    <TableCell className="p-3">#{item.originalId}</TableCell>
                    <TableCell className="p-3 text-sm">{getItemSummary(item.data, item.collectionKey)}</TableCell>
                    <TableCell className="p-3">{format(new Date(item.deletedAt), 'yyyy-MM-dd HH:mm')}</TableCell>
                    <TableCell className="p-3 flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => restoreFromRecycleBin(item.id)}>
                        <RotateCcw className="w-4 h-4 mr-1" /> {t('restore')}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deletePermanentlyFromRecycleBin(item.id)}>
                        <XCircle className="w-4 h-4 mr-1" /> {t('deletePermanently')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="p-4 text-center text-gray-500 dark:text-slate-400">
                    {t('noItemsInRecycleBin')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DataImportExport;