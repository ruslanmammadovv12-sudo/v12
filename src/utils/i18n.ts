import { useState, useEffect } from 'react';

const i18n = {
  en: {
    backupRestore: 'Backup & Restore', backupData: 'Backup Data', restoreData: 'Restore Data', restoreWarning: 'This will overwrite all current data. Are you sure you want to proceed?', restoreSuccess: 'Data restored successfully. The application will now reload.', restoreError: 'Invalid backup file.',
    theme: 'Theme', light: 'Light', dark: 'Dark', companyDetails: 'Company Details', companyName: 'Company Name', companyLogo: 'Company Logo', changeLogo: 'Change Logo', saveCompanyDetails: 'Save Company Details', success: 'Success', detailsUpdated: 'Company details updated.',
    dashboard: 'Dashboard', products: 'Products', purchaseOrders: 'Purchase Orders', sellOrders: 'SellOrders', suppliers: 'Suppliers', customers: 'Customers', incomingPayments: 'Incoming Payments', outgoingPayments: 'Outgoing Payments', warehouses: 'Warehouses', productMovement: 'Product Movement', finance: 'Finance', profitability: 'Profitability', dataImportExport: 'Data Import/Export', settings: 'Settings', totalRevenueShipped: 'Total Revenue (Shipped)', cogs: 'Cost of Goods Sold (COGS)', grossProfitShipped: 'Gross Profit (Shipped)', liveCurrencyRates: 'Live Currency Rates (to AZN)', overduePaymentAlerts: 'Overdue Payment Alerts', orderId: 'Order ID', customer: 'Customer', orderDate: 'Order Date', daysOverdue: 'Days Overdue', amountDue: 'Amount Due', noOverduePayments: 'No overdue payments. All accounts are settled!', lowStockAlerts: 'Low Stock Alerts', product: 'Product', sku: 'SKU', totalStock: 'Total Stock', minStock: 'Min. Stock', noLowStockProducts: 'No products are low on stock. Great job!', addProduct: 'Add Product', image: 'Image', name: 'Name', category: 'Category', avgLandedCost: 'Avg. Landed Cost', landedCostPlusMarkup: 'Avg LC + Markup (Excl VAT)',
    edit: 'Edit', delete: 'Delete', noItemsFound: 'No items found.', editProduct: 'Edit Product', createProduct: 'Create Product', productName: 'Product Name', productImage: 'Product Image', chooseFile: 'Choose File', minimumStockLevel: 'Minimum Stock Level', saveProduct: 'Save Product', editSellOrder: 'Edit Sell Order', createSellOrder: 'Create Sell Order', editPurchaseOrder: 'Edit Purchase Order', createPurchaseOrder: 'Create Purchase Order', supplier: 'Supplier', sourceWarehouse: 'Source Warehouse', destinationWarehouse: 'Destination Warehouse', status: 'Status', draft: 'Draft', confirmed: 'Confirmed', ordered: 'Ordered', shipped: 'Shipped', received: 'Received', orderItems: 'Order Items', selectProduct: 'Select Product', qty: 'Qty', price: 'Price', addItem: 'Add Item', exchangeRateToAZN: 'Exchange Rate to AZN', exchangeRatePlaceholder: 'e.g., 2.00 for EUR', exchangeRateHelpText: 'Enter the value of 1 unit of the foreign currency in AZN.', transportationFees: 'Transportation Fees', customFees: 'Custom Fees', additionalFees: 'Additional Fees', vatPercent: 'VAT (%)', total: 'Total', saveOrder: 'Save Order', stockError: 'Stock Error', notEnoughStock: 'Not enough stock for', available: 'Available', requested: 'Requested', language: 'Language', addWarehouse: 'Add Warehouse', productsInThisWarehouse: 'Products in this Warehouse', noProductsStored: 'No products currently stored here.', addPO: 'Add PO', addSO: 'Add SO', filterByWarehouse: 'Filter by Warehouse:', allWarehouses: 'All Warehouses', noOrdersForWarehouse: 'No orders found for this warehouse.', orderStatus: 'Order Status', paymentStatus: 'Payment Status', paid: 'Paid', partiallyPaid: 'Partially Paid', unpaid: 'Unpaid', addPayment: 'Add Payment', paymentId: 'Payment ID', linkedOrder: 'Linked Order', amount: 'Amount', method: 'Method', newMovement: 'New Movement', from: 'From', to: 'To', totalItems: 'Total Items', view: 'View', detailsForMovement: 'Details for Movement', financeTitle: 'Finance - Profit & Loss', period: 'Period:', allTime: 'All Time', thisYear: 'This Year', thisYear: 'This Year', thisMonth: 'This Month', thisWeek: 'This Week', today: 'Today', keyMetrics: 'Key Metrics', totalRevenue: 'Total Revenue', grossProfit: 'Gross Profit', totalVatCollected: 'Total VAT Collected', cashFlow: 'Cash Flow', totalIncomingPayments: 'Total Incoming Payments', totalOutgoingPayments: 'Total Outgoing Payments', netCashFlow: 'Net Cash Flow', profitabilityAnalysis: 'Profitability Analysis', startDate: 'Start Date', endDate: 'End Date', filter: 'Filter', salesPercentage: 'Sales Percentage (by Qty)', daysInStock: 'Days in Stock', totalSales: 'Total Sales (Markup-Based)', cleanProfit: 'Clean Profit (Markup-Based)',
    currencyRatesSettings: 'Currency Rates (to AZN)', usdToAzn: 'USD to AZN', eurToAzn: 'EUR to AZN', rubToAzn: 'RUB to AZN', saveCurrencyRates: 'Save Currency Rates', ratesUpdated: 'Currency rates updated.', invalidRates: 'Please enter valid numbers for currency rates.',
    defaultVat: 'Default VAT (%)', saveDefaultVat: 'Save VAT', vatUpdated: 'Default VAT updated.',
    defaultMarkup: 'Default Sales Markup (%)',
    saveDefaultMarkup: 'Save Markup',
    markupUpdated: 'Default markup updated.',
    paymentMethodPlaceholder: 'e.g., Bank Transfer, Cash',
    amountPaid: 'Amount Paid',
    paymentDate: 'Payment Date',
    linkedSellOrder: 'Linked Sell Order',
    linkedPurchaseOrder: 'Linked Purchase Order',
    createIncomingPayment: 'Create Incoming Payment',
    editIncomingPayment: 'Edit Incoming Payment',
    createOutgoingPayment: 'Create Outgoing Payment',
    editOutgoingPayment: 'Edit Outgoing Payment',
    savePayment: 'Save Payment',
    noOrdersWithBalance: 'No orders found with an outstanding balance.',
    warehouseName: 'Warehouse Name',
    location: 'Location',
    saveWarehouse: 'Save Warehouse',
    editWarehouse: 'Edit Warehouse',
    createWarehouse: 'Create Warehouse',
    supplierName: 'Supplier Name',
    contactPerson: 'Contact Person',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    save: 'Save',
    customerName: 'Customer Name',
    editSupplier: 'Edit Supplier',
    createSupplier: 'Create Supplier',
    editCustomer: 'Edit Customer',
    createCustomer: 'Create Customer',
    actions: 'Actions',
    productsToMove: 'Products to Move',
    saveMovement: 'Save Movement',
    editProductMovement: 'Edit Product Movement',
    createProductMovement: 'Create Product Movement',
    totalValue: 'Total Value',
    landedCostPerUnit: 'Landed Cost / Unit (AZN)',
    remaining: 'Remaining',
    cogsTotal: 'Total COGS',
    revenueExVat: 'Total Revenue (Excl. VAT)',
    grossProfitTotal: 'Gross Profit',
    orderCurrency: 'Order Currency',
    productsSubtotal: 'Products Subtotal',
    productName: 'Product Name',
    qtySold: 'Qty Sold',
    manualExpense: 'Manual Expense / Unlinked Payment',
    landedCostPlusMarkupPlusVat: 'Markup + VAT (Incl VAT)',
    totals: 'Totals',
    allSuppliers: 'All Suppliers',
    allProducts: 'All Products',
    allCustomers: 'All Customers',
    confirmation: 'Confirmation',
    areYouSure: 'Are You Sure?',
    productSubtotalNative: 'Product Subtotal (Native)',
    stockAvailable: 'Stock Available',
    exportDataToJson: 'Export Data to JSON', // Updated translation
    export: 'Export',
    noProductsToAnalyze: 'No products to analyze for this period.',
    cancel: 'Cancel',
    fees: 'Fees', // New translation
    selectSupplier: 'Select Supplier', // New translation
    selectWarehouse: 'Select Warehouse', // New translation
    selectCustomer: 'Select Customer', // New translation
    detailsForOrder: 'Details for Order', // New translation
    costOfGoodsSold: 'Cost of Goods Sold', // New translation
    vatCollectedFromSales: 'VAT Collected From Sales', // New translation
    chooseJsonFile: 'Choose JSON File', // New translation
    searchProductBySku: 'Search product by name or SKU...', // New translation
    noProductFound: 'No product found.', // New translation
    generateProductMovement: 'Generate Product Movement', // New translation
    warehouseType: 'Warehouse Type', // New translation
    mainWarehouseType: 'Main', // New translation
    secondaryWarehouseType: 'Secondary', // New translation
    selectWarehouseType: 'Select Warehouse Type', // New translation
    onlyOneMainWarehouse: 'Only one warehouse can be designated as Main. Please change the existing Main warehouse first.', // New translation
    validationError: 'Validation Error', // New translation
    mainWarehouseNotFound: 'Main Warehouse not found. Please ensure a warehouse of type "Main" exists.', // New translation
    selectDestinationWarehouse: 'Please select a destination warehouse for the sell order first.', // New translation
    movementNotNeeded: 'The sell order is already linked to the Main Warehouse. No movement needed.', // New translation
    noValidProductsForMovement: 'No valid products in the sell order to generate a movement for.', // New translation
    productMovementAlreadyGenerated: 'A product movement has been generated for this sell order.', // New translation
    totalLandedCost: 'Total Landed Cost', // New translation
    paymentForProducts: 'Payment for Products', // New translation
    paymentForFees: 'Payment for Fees', // New translation
    productsTotal: 'Products Total', // New translation
    feesTotal: 'Fees Total', // New translation
    itemTotal: 'Item Total', // New translation
    searchBySku: 'Search by SKU', // New translation
    enterSku: 'Enter SKU...', // New translation
    totalVat: 'Total VAT', // New translation
    totalCleanProfit: 'Total Clean Profit', // New translation
    landedCost: 'Landed Cost', // New translation
    // New translations for Excel Import
    importProductsFromExcel: 'Import Products from Excel',
    importProductsDescription: 'Upload an Excel file (.xlsx or .xls) to import your product list. The file should have columns like "Product Name", "SKU", "Category", "Description", "Min. Stock", "Avg. Landed Cost", "Image URL". Existing products with the same SKU will be skipped.',
    importCustomersFromExcel: 'Import Customers from Excel',
    importCustomersDescription: 'Upload an Excel file (.xlsx or .xls) to import your customer list. The file should have columns like "Customer Name", "Contact Person", "Email", "Phone", "Address". Existing customers with the same email will be skipped.',
    importExcelFile: 'Import Excel File',
    excelImportSuccess: 'Excel Import Success',
    excelImportError: 'Excel Import Error',
    noFileSelected: 'No file selected.',
    emptyOrInvalidExcel: 'The Excel file is empty or has an invalid format.',
    missingRequiredColumns: 'Missing required columns',
    importedSuccessfully: 'imported successfully',
    failedToParseExcel: 'Failed to parse the Excel file. Please ensure it is a valid .xlsx or .xls file.',
    excelImportInfo: 'Excel Import Info',
    duplicateProductsSkipped: 'Some products were skipped because their SKUs already exist.',
    duplicateCustomersSkipped: 'Some customers were skipped because their emails already exist.',
    // New translations for Excel Export
    exportProductsToExcel: 'Export Products to Excel',
    exportProductsDescription: 'Download your current product list as an Excel file.',
    exportCustomersToExcel: 'Export Customers to Excel',
    exportCustomersDescription: 'Download your current customer list as an Excel file.',
    exportExcelFile: 'Export Excel File',
    noDataToExport: 'No data available to export.',
    exportJsonFile: 'Export JSON File',
    importJsonFile: 'Import JSON File',
    // New translations for Erase All Data
    eraseAllData: 'Erase All Data',
    eraseAllDataDescription: 'This action will permanently delete ALL application data stored locally and reset the application to its initial state. This cannot be undone.',
    eraseAllDataWarning: 'Are you absolutely sure you want to erase all data? This action is irreversible and will reset the application to its default state.',
    eraseAllData100PercentSure: 'Are you 100% sure? This action is irreversible.', // New translation
    allDataErased: 'All application data has been erased.',
    // New translations for code confirmation
    finalConfirmation: 'Final Confirmation',
    enterCodeToConfirm: 'To confirm, please type the following 4-digit code:',
    enterCode: 'Enter Code',
    enterTheCodeHere: 'Enter the code here',
    confirmErase: 'Confirm Erase',
    codeMismatchError: 'Code Mismatch',
    pleaseEnterCorrectCode: 'Please enter the correct code to proceed.',
    filterByProduct: 'Filter by Product', // New translation
    // New translations for Order Details Export
    exportToExcel: 'Export to Excel',
    orderSummary: 'Order Summary',
    orderItems: 'Order Items',
    orderFees: 'Order Fees',
    feeType: 'Fee Type',
    amount: 'Amount',
    order: 'Order',
    exportedSuccessfully: 'exported successfully',
    exportError: 'Export Error',
    totalRevenueExVat: 'Total Revenue (Excl. VAT)',
  }
};

// Language is fixed to English for now
const currentLang = 'en';

export function t(key: keyof typeof i18n.en): string {
  return i18n.en[key] || key;
}

export function getKeyAsPageId(key: string): string {
  // from camelCase to kebab-case, e.g., purchaseOrders -> purchase-orders
  return key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}