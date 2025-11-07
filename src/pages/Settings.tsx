"use client";

import React, { useState, useEffect } from 'react';
import { useData, Settings, CurrencyRates, Product, Customer } from '@/context/DataContext';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUpload from '@/components/ImageUpload';
import { toast } from 'sonner';

const SettingsPage: React.FC = () => {
  const { settings, setSettings, currencyRates, setCurrencyRates, setProducts, setCustomers, getNextId, setNextIdForCollection, showConfirmationModal } = useData();

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyLogo, setCompanyLogo] = useState<string | null>(settings.companyLogo);
  const [theme, setTheme] = useState<'light' | 'dark'>(settings.theme);
  const [defaultVat, setDefaultVat] = useState(settings.defaultVat);
  const [defaultMarkup, setDefaultMarkup] = useState(settings.defaultMarkup);

  const [usdRate, setUsdRate] = useState(currencyRates.USD);
  const [eurRate, setEurRate] = useState(currencyRates.EUR);
  const [rubRate, setRubRate] = useState(currencyRates.RUB);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setCompanyLogo(settings.companyLogo);
    setTheme(settings.theme);
    setDefaultVat(settings.defaultVat);
    setDefaultMarkup(settings.defaultMarkup);
    setUsdRate(currencyRates.USD);
    setEurRate(currencyRates.EUR);
    setRubRate(currencyRates.RUB);
  }, [settings, currencyRates]);

  const handleSaveCompanyDetails = () => {
    setSettings(prev => ({ ...prev, companyName, companyLogo: companyLogo || '' }));
    toast.success(t('success'), { description: t('detailsUpdated') });
  };

  const handleSaveCurrencyRates = () => {
    if (isNaN(usdRate) || isNaN(eurRate) || isNaN(rubRate) || usdRate <= 0 || eurRate <= 0 || rubRate <= 0) {
      toast.error(t('invalidRates'), { description: 'Please enter valid positive numbers for currency rates.' });
      return;
    }
    setCurrencyRates({ ...currencyRates, USD: usdRate, EUR: eurRate, RUB: rubRate });
    toast.success(t('success'), { description: t('ratesUpdated') });
  };

  const handleSaveDefaultVat = () => {
    if (isNaN(defaultVat) || defaultVat < 0 || defaultVat > 100) {
      toast.error('Validation Error', { description: 'VAT percentage must be between 0 and 100.' });
      return;
    }
    setSettings(prev => ({ ...prev, defaultVat }));
    toast.success(t('success'), { description: t('vatUpdated') });
  };

  const handleSaveDefaultMarkup = () => {
    if (isNaN(defaultMarkup) || defaultMarkup < 0) {
      toast.error('Validation Error', { description: 'Markup percentage cannot be negative.' });
      return;
    }
    setSettings(prev => ({ ...prev, defaultMarkup }));
    toast.success(t('success'), { description: t('markupUpdated') });
  };

  const handleThemeChange = (value: 'light' | 'dark') => {
    setTheme(value);
    setSettings(prev => ({ ...prev, theme: value }));
    // The MainLayout useEffect will handle applying the class to document.documentElement
  };

  const performEraseAllData = () => {
    // Clear all local storage items used by the app
    localStorage.removeItem('products');
    localStorage.removeItem('suppliers');
    localStorage.removeItem('customers');
    localStorage.removeItem('warehouses');
    localStorage.removeItem('purchaseOrders');
    localStorage.removeItem('sellOrders');
    localStorage.removeItem('incomingPayments');
    localStorage.removeItem('outgoingPayments');
    localStorage.removeItem('productMovements');
    localStorage.removeItem('settings');
    localStorage.removeItem('currencyRates');
    localStorage.removeItem('nextIds');
    localStorage.removeItem('initialized'); // Reset initialization flag

    toast.success(t('success'), { description: t('allDataErased') });
    setTimeout(() => window.location.reload(), 1000); // Reload to re-initialize with default data
  };

  const handleEraseAllData = () => {
    showConfirmationModal(
      t('eraseAllData'),
      t('eraseAllDataWarning'),
      () => {
        showConfirmationModal(
          t('eraseAllData'),
          t('eraseAllData100PercentSure'),
          performEraseAllData
        );
      }
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-200 mb-6">{t('settings')}</h1>

      {/* Company Details */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('companyDetails')}</h2>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="companyName" className="text-right">{t('companyName')}</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right">{t('companyLogo')}</Label>
            <div className="col-span-3">
              <ImageUpload
                label=""
                initialImageUrl={companyLogo || undefined}
                onImageChange={setCompanyLogo}
                previewSize="sm"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSaveCompanyDetails}>{t('saveCompanyDetails')}</Button>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('theme')}</h2>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="theme-select" className="text-right">{t('theme')}</Label>
          <Select onValueChange={handleThemeChange} value={theme}>
            <SelectTrigger id="theme-select" className="col-span-3">
              <SelectValue placeholder={t('light')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t('light')}</SelectItem>
              <SelectItem value="dark">{t('dark')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Default VAT */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('defaultVat')}</h2>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="defaultVat" className="text-right">{t('defaultVat')}</Label>
          <Input
            id="defaultVat"
            type="number"
            step="0.01"
            value={defaultVat}
            onChange={(e) => setDefaultVat(parseFloat(e.target.value) || 0)}
            className="col-span-3"
            min="0"
            max="100"
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSaveDefaultVat}>{t('saveDefaultVat')}</Button>
        </div>
      </div>

      {/* Default Markup */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('defaultMarkup')}</h2>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="defaultMarkup" className="text-right">{t('defaultMarkup')}</Label>
          <Input
            id="defaultMarkup"
            type="number"
            step="0.01"
            value={defaultMarkup}
            onChange={(e) => setDefaultMarkup(parseFloat(e.target.value) || 0)}
            className="col-span-3"
            min="0"
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handleSaveDefaultMarkup}>{t('saveDefaultMarkup')}</Button>
        </div>
      </div>

      {/* Currency Rates */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('currencyRatesSettings')}</h2>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="usdToAzn" className="text-right">{t('usdToAzn')}</Label>
            <Input
              id="usdToAzn"
              type="number"
              step="0.0001"
              value={usdRate}
              onChange={(e) => setUsdRate(parseFloat(e.target.value) || 0)}
              className="col-span-3"
              min="0.0001"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="eurToAzn" className="text-right">{t('eurToAzn')}</Label>
            <Input
              id="eurToAzn"
              type="number"
              step="0.0001"
              value={eurRate}
              onChange={(e) => setEurRate(parseFloat(e.target.value) || 0)}
              className="col-span-3"
              min="0.0001"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rubToAzn" className="text-right">{t('rubToAzn')}</Label>
            <Input
              id="rubToAzn"
              type="number"
              step="0.0001"
              value={rubRate}
              onChange={(e) => setRubRate(parseFloat(e.target.value) || 0)}
              className="col-span-3"
              min="0.0001"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSaveCurrencyRates}>{t('saveCurrencyRates')}</Button>
        </div>
      </div>

      {/* Erase All Data */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-4">{t('eraseAllData')}</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          {t('eraseAllDataDescription')}
        </p>
        <div className="flex justify-end">
          <Button variant="destructive" onClick={handleEraseAllData}>
            {t('eraseAllData')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;