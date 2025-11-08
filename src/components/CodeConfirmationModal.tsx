"use client";

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { t } from '@/utils/i18n';
import { toast } from 'sonner';
// No types from src/types/index.ts are directly used here, so no import needed.

interface CodeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (enteredCode: string) => void;
  codeToEnter: string;
}

const CodeConfirmationModal: React.FC<CodeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  codeToEnter,
}) => {
  const [enteredCode, setEnteredCode] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setEnteredCode(''); // Reset input when modal closes
    }
  }, [isOpen]);

  const handleConfirmClick = () => {
    if (enteredCode === codeToEnter) {
      onConfirm(enteredCode);
      onClose();
    } else {
      toast.error(t('codeMismatchError'), { description: t('pleaseEnterCorrectCode') });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('finalConfirmation')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('enterCodeToConfirm')}
            <br />
            <strong className="text-lg text-red-500 dark:text-red-400">{codeToEnter}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="confirmation-code" className="text-right">
              {t('enterCode')}
            </Label>
            <Input
              id="confirmation-code"
              type="text"
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
              className="col-span-3"
              placeholder={t('enterTheCodeHere')}
              maxLength={4}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{t('cancel')}</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirmClick}>
            {t('confirmErase')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CodeConfirmationModal;