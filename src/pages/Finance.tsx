"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { PurchaseOrder, SellOrder, Payment, Product } from '@/types'; // Import types from types file

const Finance: React.FC = () => {
  const { purchaseOrders, sellOrders, incomingPayments, outgoingPayments, products, currencyRates } = useData();
  const [period, setPeriod] = useState<'allTime' | 'thisYear' | 'thisMonth' | 'thisWeek' | 'today'>('allTime');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const getPeriodDates = useCallback(() => {
    const now = MOCK_CURRENT_DATE;
    let start = new Date(0); // Epoch
    let end = new Date(now);

    switch (period) {
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'thisWeek':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'allTime':
      default:
        start = new Date(0);
        end = new Date(now);
        break;
    }
    return { start, end };
  }, [period]);

  const { start: calculatedStartDate, end: calculatedEndDate } = getPeriodDates();

  const effectiveStartDate = startDate ? new Date(startDate) : calculatedStartDate;
  const effectiveEndDate = endDate ? new Date(endDate) : calculatedEndDate;

  const filteredData = useMemo(() => {
    const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as { [key: number]: Product });

    const filteredSellOrders = sellOrders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= effectiveStartDate && orderDate <= effectiveEndDate;
    });

    const filteredPurchaseOrders = purchaseOrders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= effectiveStartDate && orderDate <= effectiveEndDate;
    });

    const filteredIncomingPayments = incomingPayments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate >= effectiveStartDate && paymentDate <= effectiveEndDate;
    });

    const filteredOutgoingPayments = outgoingPayments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate >= effectiveStartDate && paymentDate <= effectiveEndDate;
    });

    let totalRevenue = 0; // Excl. VAT
    let totalCOGS = 0;
    let totalVatCollected = 0;

    filteredSellOrders.forEach(order => {
      if (order.status === 'Shipped') {
        const subtotalExVat = order.total / (1 + order.vatPercent / 100);
        totalRevenue += subtotalExVat;
        totalVatCollected += order.total - subtotalExVat;

        order.items.forEach(item => {
          const product = productMap[item.productId];
          if (product) {
            totalCOGS += item.qty * (product.averageLandedCost || 0);
          }
        });
      }
    });

    const grossProfit = totalRevenue - totalCOGS;

    const totalIncoming = filteredIncomingPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutgoing = filteredOutgoingPayments.reduce((sum, p) => sum + p.amount, 0);
    const netCashFlow = totalIncoming - totalOutgoing;

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalVatCollected,
      totalIncoming,
      totalOutgoing,
      netCashFlow,
    };
  }, [purchaseOrders, sellOrders, incomingPayments, outgoingPayments, products, effectiveStartDate, effectiveEndDate, currencyRates]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200 mb-6">{t('financeTitle')}</h1>

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="period-select" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('period')}</Label>
            <Select onValueChange={(value: typeof period) => { setPeriod(value); setStartDate(''); setEndDate(''); }} value={period}>
              <SelectTrigger id="period-select" className="w-full mt-1">
                <SelectValue placeholder={t('allTime')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allTime">{t('allTime')}</SelectItem>
                <SelectItem value="thisYear">{t('thisYear')}</SelectItem>
                <SelectItem value="thisMonth">{t('thisMonth')}</SelectItem>
                <SelectItem value="thisWeek">{t('thisWeek')}</SelectItem>
                <SelectItem value="today">{t('today')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="start-date-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('startDate')}</Label>
            <Input
              type="date"
              id="start-date-filter"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPeriod('allTime'); }}
              className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="end-date-filter" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('endDate')}</Label>
            <Input
              type="date"
              id="end-date-filter"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriod('allTime'); }}
              className="mt-1 w-full p-2 border rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-200 mb-4">{t('keyMetrics')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{filteredData.totalRevenue.toFixed(2)} AZN</div>
            <p className="text-xs text-muted-foreground">{t('revenueExVat')}</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('cogsTotal')}</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{filteredData.totalCOGS.toFixed(2)} AZN</div>
            <p className="text-xs text-muted-foreground">{t('costOfGoodsSold')}</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('grossProfit')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredData.grossProfit.toFixed(2)} AZN</div>
            <p className="text-xs text-muted-foreground">{t('grossProfitTotal')}</p>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('totalVatCollected')}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{filteredData.totalVatCollected.toFixed(2)} AZN</div>
            <p className="text-xs text-muted-foreground">{t('vatCollectedFromSales')}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-200 mb-4">{t('cashFlow')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('totalIncomingPayments')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{filteredData.totalIncoming.toFixed(2)} AZN</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('totalOutgoingPayments')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{filteredData.totalOutgoing.toFixed(2)} AZN</div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-800 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('netCashFlow')}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${filteredData.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {filteredData.netCashFlow.toFixed(2)} AZN
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Finance;