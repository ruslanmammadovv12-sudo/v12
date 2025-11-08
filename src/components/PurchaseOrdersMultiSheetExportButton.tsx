"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { t } from '@/utils/i18n';
import { PurchaseOrder, Product, Supplier, Warehouse, CurrencyRates } from '@/types';

interface PurchaseOrdersMultiSheetExportButtonProps {
  purchaseOrders: PurchaseOrder[];
  productMap: { [key: number]: Product };
  supplierMap: { [key: number]: Supplier };
  warehouseMap: { [key: number]: Warehouse };
  currencyRates: CurrencyRates;
  buttonLabel: string; // New prop
}

const PurchaseOrdersMultiSheetExportButton: React.FC<PurchaseOrdersMultiSheetExportButtonProps> = ({
  purchaseOrders,
  productMap,
  supplierMap,
  warehouseMap,
  currencyRates,
  buttonLabel,
}) => {
  const handleExport = () => {
    if (!purchaseOrders || purchaseOrders.length === 0) {
      toast.info(t('excelExportInfo'), { description: t('noDataToExport') });
      return;
    }

    const wb = XLSX.utils.book_new();

    purchaseOrders.forEach(order => {
      const sheetName = `PO#${order.id}`;
      const data: any[] = [];

      // --- Order Summary ---
      data.push([{ v: t('orderSummary'), s: { font: { bold: true, sz: 14 } } }]);
      data.push([t('orderId'), order.id]);
      data.push([t('supplier'), supplierMap[order.contactId]?.name || 'N/A']);
      data.push([t('warehouse'), warehouseMap[order.warehouseId]?.name || 'N/A']);
      data.push([t('orderDate'), order.orderDate]);
      data.push([t('status'), t(order.status.toLowerCase() as keyof typeof t)]);
      data.push([t('orderCurrency'), order.currency]);
      if (order.currency !== 'AZN') {
        data.push([t('exchangeRateToAZN'), order.exchangeRate || currencyRates[order.currency] || 1]);
      }
      data.push([]); // Spacer

      // --- Order Items ---
      data.push([{ v: t('orderItems'), s: { font: { bold: true, sz: 12 } } }]);
      const itemHeaders = [
        t('productName'),
        t('sku'),
        t('qty'),
        `${t('price')} (${order.currency})`,
        `${t('itemTotal')} (${order.currency})`,
        t('landedCostPerUnit'),
        `${t('totalValue')} (AZN)`,
      ];
      data.push(itemHeaders);

      order.items.forEach(item => {
        const product = productMap[item.productId];
        const itemTotalNative = item.qty * item.price;
        const itemTotalLandedAZN = (item.landedCostPerUnit || 0) * item.qty;
        data.push([
          product?.name || 'N/A',
          product?.sku || 'N/A',
          item.qty,
          item.price.toFixed(2),
          itemTotalNative.toFixed(2),
          (item.landedCostPerUnit || 0).toFixed(2),
          itemTotalLandedAZN.toFixed(2),
        ]);
      });
      data.push([]); // Spacer

      // --- Fees ---
      data.push([{ v: t('fees'), s: { font: { bold: true, sz: 12 } } }]);
      data.push([t('transportationFees'), `${order.transportationFees.toFixed(2)} ${order.transportationFeesCurrency}`]);
      data.push([t('customFees'), `${order.customFees.toFixed(2)} ${order.customFeesCurrency}`]);
      data.push([t('additionalFees'), `${order.additionalFees.toFixed(2)} ${order.additionalFeesCurrency}`]);
      data.push([]); // Spacer

      // --- Totals ---
      data.push([{ v: t('totalLandedCost'), s: { font: { bold: true } } }, { v: `${order.total.toFixed(2)} AZN`, s: { font: { bold: true } } }]);

      const ws = XLSX.utils.aoa_to_sheet(data);

      // Set column widths (example, adjust as needed)
      const colWidths = [
        { wch: 25 }, // Product Name
        { wch: 15 }, // SKU
        { wch: 10 }, // Qty
        { wch: 15 }, // Price
        { wch: 15 }, // Item Total
        { wch: 20 }, // Landed Cost / Unit
        { wch: 15 }, // Total Value (AZN)
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `purchase_orders_details_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t('success'), { description: `${t('purchaseOrders')} ${t('exportedSuccessfully')}.` });
  };

  return (
    <Button onClick={handleExport} className="bg-sky-500 hover:bg-sky-600 text-white w-full">
      <Download className="w-4 h-4 mr-2" />
      {buttonLabel}
    </Button>
  );
};

export default PurchaseOrdersMultiSheetExportButton;