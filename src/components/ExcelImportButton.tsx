"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { t } from '@/utils/i18n';
import { Product, Customer } from '@/types'; // Import types from types file

interface ExcelImportButtonProps {
  onImport: (data: any[]) => void;
  buttonLabel: string; // Changed from 'label'
  description: string; // Kept for the file input description, but not rendered as h2/p
  requiredColumns: string[];
}

const ExcelImportButton: React.FC<ExcelImportButtonProps> = ({ onImport, buttonLabel, description, requiredColumns }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error(t('excelImportError'), { description: t('noFileSelected') });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (!Array.isArray(json) || json.length === 0) {
          toast.error(t('excelImportError'), { description: t('emptyOrInvalidExcel') });
          return;
        }

        // Validate required columns
        const firstRow = json[0] as Record<string, any>;
        const missingColumns = requiredColumns.filter(col => !Object.keys(firstRow).includes(col));
        if (missingColumns.length > 0) {
          toast.error(t('excelImportError'), { description: `${t('missingRequiredColumns')}: ${missingColumns.join(', ')}` });
          return;
        }

        onImport(json);
        toast.success(t('excelImportSuccess'), { description: `${buttonLabel} ${t('importedSuccessfully')}.` });

      } catch (error) {
        console.error("Error importing Excel:", error);
        toast.error(t('excelImportError'), { description: t('failedToParseExcel') });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex items-center space-x-4">
      <Input
        id={`excel-import-${buttonLabel.replace(/\s/g, '-')}`}
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
      />
      <Button onClick={() => document.getElementById(`excel-import-${buttonLabel.replace(/\s/g, '-')}`)?.click()} className="bg-sky-500 hover:bg-sky-600 text-white w-full">
        <UploadCloud className="w-4 h-4 mr-2" />
        {buttonLabel}
      </Button>
    </div>
  );
};

export default ExcelImportButton;