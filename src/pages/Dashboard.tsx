"use client";

import React from 'react';
import { useData, MOCK_CURRENT_DATE } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { AlertCircle } from 'lucide-react';
import { Product, SellOrder, Payment, CurrencyRates } from '@/types'; // Import types from types file

const Dashboard: React.FC = () => {
  const { products, sellOrders, incomingPayments, currencyRates } = useData();

  const getOverdueSellOrders = () => {
    const customers = useData().customers.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as { [key: number]: string });
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const now = MOCK_CURRENT_DATE.getTime();

    const paymentsByOrder = incomingPayments.reduce((acc, payment) => {
      acc[payment.orderId] = (acc[payment.orderId] || 0) + payment.amount;
      return acc;
    }, {} as { [key: number]: number });

    const overdueOrders: any[] = [];
    sellOrders.forEach(order => {
      const totalPaid = paymentsByOrder[order.id] || 0;
      const amountDue = order.total - totalPaid;
      if (amountDue > 0.001) {
        const orderDate = new Date(order.orderDate).getTime();
        const timeDiff = now - orderDate;
        if (timeDiff > thirtyDaysInMs) {
          overdueOrders.push({
            ...order,
            amountDue: amountDue,
            daysOverdue: Math.floor(timeDiff / (1000 * 60 * 60 * 24)) - 30,
            customerName: customers[order.contactId] || 'Unknown Customer'
          });
        }
      }
    });
    overdueOrders.sort((a, b) => b.daysOverdue - a.daysOverdue);
    return overdueOrders;
  };

  const lowStockProducts = products.filter(p => (p.stock ? Object.values(p.stock).reduce((a, b) => a + b, 0) : 0) < p.minStock);
  const shippedSellOrders = sellOrders.filter(o => o.status === 'Shipped');

  let totalRevenue = 0;
  let totalCOGS = 0;

  shippedSellOrders.forEach(order => {
    totalRevenue += order.total;
    (order.items || []).forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) totalCOGS += item.qty * (product.averageLandedCost || 0);
    });
  });
  const grossProfit = totalRevenue - totalCOGS;
  const overdueOrders = getOverdueSellOrders();

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200 mb-6">{t('dashboard')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300">{t('totalRevenueShipped')}</h2>
          <p className="text-3xl font-bold text-green-500 mt-2">{totalRevenue.toFixed(2)} AZN</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300">{t('cogs')}</h2>
          <p className="text-3xl font-bold text-red-500 mt-2">{totalCOGS.toFixed(2)} AZN</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300">{t('grossProfitShipped')}</h2>
          <p className="text-3xl font-bold text-blue-500 mt-2">{grossProfit.toFixed(2)} AZN</p>
        </div>
      </div>
      <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('liveCurrencyRates')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">USD to AZN</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{(currencyRates.USD || 0).toFixed(4)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">EUR to AZN</p>
            <p className="2xl font-bold text-gray-800 dark:text-slate-200">{(currencyRates.EUR || 0).toFixed(4)}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">RUB to AZN</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{(currencyRates.RUB || 0).toFixed(4)}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Overdue Payments */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4 flex items-center">
            <AlertCircle className="w-6 h-6 mr-3 text-red-500" />
            {t('overduePaymentAlerts')}
          </h2>
          {overdueOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-700">
                    <th className="p-3">{t('orderId')}</th>
                    <th className="p-3">{t('customer')}</th>
                    <th className="p-3">{t('orderDate')}</th>
                    <th className="p-3">{t('daysOverdue')}</th>
                    <th className="p-3">{t('amountDue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueOrders.map(o => (
                    <tr key={o.id} className="border-b dark:border-slate-700">
                      <td className="p-3 font-semibold">#{o.id}</td>
                      <td className="p-3">{o.customerName}</td>
                      <td className="p-3">{o.orderDate}</td>
                      <td className="p-3 text-red-600 font-bold">{o.daysOverdue}</td>
                      <td className="p-3 font-semibold">{o.amountDue.toFixed(2)} AZN</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400">{t('noOverduePayments')}</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('lowStockAlerts')}</h2>
          {lowStockProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-700">
                    <th className="p-3">{t('product')}</th>
                    <th className="p-3">{t('sku')}</th>
                    <th className="p-3">{t('totalStock')}</th>
                    <th className="p-3">{t('minStock')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map(p => (
                    <tr key={p.id} className="border-b dark:border-slate-700">
                      <td className="p-3">{p.name}</td>
                      <td className="p-3">{p.sku}</td>
                      <td className="p-3 text-red-500 font-bold">{p.stock ? Object.values(p.stock).reduce((a, b) => a + b, 0) : 0}</td>
                      <td className="p-3">{p.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-slate-400">{t('noLowStockProducts')}</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;