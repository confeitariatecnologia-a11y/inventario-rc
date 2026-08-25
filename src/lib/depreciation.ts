import type { Asset } from '@/types';

export interface DepreciationRule {
  residualRate: number; // ex: 0.10 para 10%
  usefulLifeYears: number; // ex: 5 anos
  annualRate: number; // ex: 0.20 (20% a.a.)
}

export const DEPRECIATION_RULES: Record<string, DepreciationRule> = {
  'Móveis e Utensílios': { residualRate: 0.10, usefulLifeYears: 5, annualRate: 0.20 },
  'Máquinas e Equipamentos': { residualRate: 0.20, usefulLifeYears: 10, annualRate: 0.10 },
  'Computadores e Periféricos': { residualRate: 0.00, usefulLifeYears: 5, annualRate: 0.20 },
  'Veículos': { residualRate: 0.40, usefulLifeYears: 5, annualRate: 0.20 },
};

export interface DepreciationResult {
  acquisitionValue: number;
  residualValue: number;
  depreciableBase: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  depreciationPercent: number;
  usefulLifeYears: number;
  isFullyDepreciated: boolean;
}

export function calculateDepreciation(asset: Asset, referenceDate = new Date()): DepreciationResult {
  const value = Number(asset.acquisition_value) || 0;
  const catName = asset.category?.name || 'Móveis e Utensílios';
  const rule = DEPRECIATION_RULES[catName] || { residualRate: 0.10, usefulLifeYears: 5, annualRate: 0.20 };

  const residualValue = Math.round(value * rule.residualRate * 100) / 100;
  const depreciableBase = Math.max(0, value - residualValue);

  // Calcula idade do bem em meses
  const acqDate = asset.acquisition_date ? new Date(asset.acquisition_date) : new Date(asset.created_at || '2024-01-01');
  const diffTime = Math.max(0, referenceDate.getTime() - acqDate.getTime());
  const elapsedMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4375);
  const totalMonths = rule.usefulLifeYears * 12;

  const progress = Math.min(1, Math.max(0, elapsedMonths / totalMonths));
  const accumulatedDepreciation = Math.round(depreciableBase * progress * 100) / 100;
  const currentBookValue = Math.max(residualValue, Math.round((value - accumulatedDepreciation) * 100) / 100);
  const depreciationPercent = value > 0 ? Math.round((accumulatedDepreciation / value) * 100) : 0;

  return {
    acquisitionValue: value,
    residualValue,
    depreciableBase,
    accumulatedDepreciation,
    currentBookValue,
    depreciationPercent,
    usefulLifeYears: rule.usefulLifeYears,
    isFullyDepreciated: progress >= 1,
  };
}
