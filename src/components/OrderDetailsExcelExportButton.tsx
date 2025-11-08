"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { t } from '@/utils/i18n';
import { PurchaseOrder, SellOrder, Product, Customer, Supplier, Warehouse, CurrencyRates } from '@/types';

interface OrderDetailsExcelExportButtonProps {
  order: PurchaseOrder | SellOrder;
  orderType: 'purchase' | 'sell';
  productMap: { [key: number]: Product };
  customerMap: { [key: number]: Customer };
  supplierMap: { [key: number]: Supplier };
  warehouseMap: { [key: number]: Warehouse };
  currencyRates: CurrencyRates;
}

const OrderDetailsExcelExportButton: React.FC<OrderDetailsExcelExportButtonProps> = ({
  order,
  orderType,
  productMap,
  customerMap,
  supplierMap,
  warehouseMap,
  currencyRates,
}) => {
  const handleExport = () => {
    if (!order) {
      toast.error(t('exportError'), { description: t('noDataToExport') });
      return;
    }

    const wb = XLSX.utils.book_new();

    // --- Sheet 1: Order Summary ---
    const summaryData: { Field: string; Value: string | number }[] = [
      { Field: t('orderId'), Value: order.id },
      { Field: t('orderDate'), Value: order.orderDate },
      { Field: t('warehouse'), Value: warehouseMap[order.warehouseId]?.name || 'N/A' },
      { Field: t('status'), Value: t(order.status.toLowerCase() as keyof typeof t) },
    ];

    if (orderType === 'purchase') {
      const po = order as PurchaseOrder;
      summaryData.push(
        { Field: t('supplier'), Value: supplierMap[po.contactId]?.name || 'N/A' },
        { Field: t('orderCurrency'), Value: po.currency },
      );
      if (po.currency !== 'AZN') {
        summaryData.push({ Field: t('exchangeRateToAZN'), Value: po.exchangeRate || currencyRates[po.currency] || 1 });
      }
      summaryData.push(
        { Field: t('transportationFees'), Value: `${po.transportationFees.toFixed(2)} ${po.transportationFeesCurrency}` },
        { Field: t('customFees'), Value: `${po.customFees.toFixed(2)} ${po.customFeesCurrency}` },
        { Field: t('additionalFees'), Value: `${po.additionalFees.toFixed(2)} ${po.additionalFeesCurrency}` },
        { Field: t('totalLandedCost'), Value: `${po.total.toFixed(2)} AZN` },
      );
    } else { // Sell Order
      const so = order as SellOrder;
      summaryData.push(
        { Field: t('customer'), Value: customerMap[so.contactId]?.name || 'N/A' },
        { Field: t('vatPercent'), Value: `${so.vatPercent}%` },
        { Field: t('totalRevenueExVat'), Value: `${(so.total / (1 + so.vatPercent / 100)).toFixed(2)} AZN` },
        { Field: t('totalVat'), Value: `${(so.total - (so.total / (1 + so.vatPercent / 100))).toFixed(2)} AZN` },
        { Field: t('total'), Value: `${so.total.toFixed(2)} AZN` },
      );
    }

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, t('orderSummary'));

    // --- Sheet 2: Order Items ---
    const itemsData = order.items.map(item => {
      const product = productMap[item.productId];
      const baseItem = {
        [t('productName')]: product?.name || 'N/A',
        [t('sku')]: product?.sku || 'N/A',
        [t('qty')]: item.qty,
        [t('price')]: `${item.price.toFixed(2)} ${orderType === 'purchase' ? (order as PurchaseOrder).currency : 'AZN'}`,
        [t('itemTotal')]: `${(item.qty * item.price).toFixed(2)} ${orderType === 'purchase' ? (order as PurchaseOrder).currency : 'AZN'}`,
      };

      if (orderType === 'purchase') {
        const poItem = item as PurchaseOrder['items'][0];
        return {
          ...baseItem,
          [t('landedCostPerUnit')]: `${(poItem.landedCostPerUnit || 0).toFixed(2)} AZN`,
        };
      } else { // Sell Order Item
        const soItem = item as SellOrder['items'][0];
        const productLandedCost = product?.averageLandedCost || 0;
        const cleanProfit = (soItem.price - productLandedCost) * soItem.qty;
        return {
          ...baseItem,
          [t('landedCost')]: `${productLandedCost.toFixed(2)} AZN`,
          [t('cleanProfit')]: `${cleanProfit.toFixed(2)} AZN`,
        };
      }
    });

    const wsItems = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, wsItems, t('orderItems'));

    // --- Sheet 3: Fees (for Purchase Orders only) ---
    if (orderType === 'purchase') {
      const po = order as PurchaseOrder;
      const feesData = [
        { [t('feeType')]: t('transportationFees'), [t('amount')]: `${po.transportationFees.toFixed(2)} ${po.transportationFeesCurrency}` },
        { [t('feeType')]: t('customFees'), [t('amount')]: `${po.customFees.toFixed(2)} ${po.customFeesCurrency}` },
        { [t('feeType')]: t('additionalFees'), [t('amount')]: `${po.additionalFees.toFixed(2)} ${po.additionalFeesCurrency}` },
      ];
      const wsFees = XLSX.utils.json_to_sheet(feesData);
      XLSX.utils.book_append_sheet(wb, wsFees, t('orderFees'));
    }

    XLSX.writeFile(wb, `${orderType}_order_${order.id}_details.xlsx`);
    toast.success(t('success'), { description: `${t('order')} #${order.id} ${t('exportedSuccessfully')}.` });
  };

  return (
    <Button onClick={handleExport} className="bg-sky-500 hover:bg-sky-600 text-white w-full mt-4">
      <Download className="w-4 h-4 mr-2" />
      {t('exportToExcel')}
    </Button>
  );
};

export default OrderDetailsExcelExportButton;