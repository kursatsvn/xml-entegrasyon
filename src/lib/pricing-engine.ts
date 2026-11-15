import { PriceRuleItem, XmlSource } from '@/types/sopyo';

/**
 * Sopyo birebir fiyat kuralı ve yuvarlama motoru
 */
export function applySingleRule(basePrice: number, rule: PriceRuleItem): number {
  if (!basePrice || basePrice <= 0) return 0;
  let result = basePrice;
  const amount = Number(rule.ruleAmount) || 0;
  const extra = Number(rule.ruleExtraPrice) || 0;

  if (rule.ruleOperationType === 'percent') {
    const delta = basePrice * (amount / 100);
    result = rule.ruleType === 'increase' ? basePrice + delta : basePrice - delta;
  } else {
    result = rule.ruleType === 'increase' ? basePrice + amount : basePrice - amount;
  }

  result += extra;
  return Math.max(0, Number(result.toFixed(2)));
}

export function applyPriceRounding(
  price: number,
  enabled: boolean,
  roundType: XmlSource['priceRoundType'],
  roundWay: XmlSource['priceRoundWay']
): number {
  if (!enabled || price <= 0) return Number(price.toFixed(2));

  const intPart = Math.floor(price);
  if (roundType === '99') {
    return Number((intPart + 0.99).toFixed(2));
  }
  if (roundType === '90') {
    return Number((intPart + 0.90).toFixed(2));
  }
  if (roundType === '00') {
    if (roundWay === 'roundUp') return Math.ceil(price);
    if (roundWay === 'roundDown') return Math.floor(price);
    return Math.round(price);
  }
  if (roundType === 'x9') {
    const decade = Math.floor(intPart / 10) * 10;
    return Number((decade + 9.90).toFixed(2));
  }
  if (roundType === 'x0') {
    const decade = Math.round(intPart / 10) * 10;
    return Number(decade.toFixed(2));
  }
  return Number(price.toFixed(2));
}

export function calculateChannelPrices(
  basePrice: number,
  xmlSource: Pick<
    XmlSource,
    | 'priceRuleType'
    | 'fixedPriceRule'
    | 'dynamicPriceRules'
    | 'marketplacePriceRules'
    | 'priceRoundEnabled'
    | 'priceRoundType'
    | 'priceRoundWay'
  >
): { trendyolPrice: number; trendyolListPrice: number; hepsiburadaPrice: number } {
  if (!basePrice || basePrice <= 0) {
    return { trendyolPrice: 0, trendyolListPrice: 0, hepsiburadaPrice: 0 };
  }

  let tyPrice = basePrice;
  let hbPrice = basePrice;

  if (xmlSource.priceRuleType === 1 && xmlSource.fixedPriceRule) {
    tyPrice = applySingleRule(basePrice, xmlSource.fixedPriceRule);
    hbPrice = tyPrice;
  } else if (xmlSource.priceRuleType === 2 && xmlSource.dynamicPriceRules?.length) {
    const matched = xmlSource.dynamicPriceRules.find(
      (r) => basePrice >= Number(r.ruleMinPrice) && basePrice < Number(r.ruleMaxPrice)
    );
    if (matched) {
      tyPrice = applySingleRule(basePrice, matched);
      hbPrice = tyPrice;
    }
  } else if (xmlSource.priceRuleType === 3 && xmlSource.marketplacePriceRules) {
    const tyRule = xmlSource.marketplacePriceRules.Trendyol?.find(
      (r) => basePrice >= Number(r.ruleMinPrice) && basePrice < Number(r.ruleMaxPrice)
    );
    if (tyRule) {
      tyPrice = applySingleRule(basePrice, tyRule);
    }

    const hbRule = xmlSource.marketplacePriceRules.Hepsiburada?.find(
      (r) => basePrice >= Number(r.ruleMinPrice) && basePrice < Number(r.ruleMaxPrice)
    );
    if (hbRule) {
      hbPrice = applySingleRule(basePrice, hbRule);
    }
  }

  tyPrice = applyPriceRounding(
    tyPrice,
    xmlSource.priceRoundEnabled,
    xmlSource.priceRoundType,
    xmlSource.priceRoundWay
  );
  hbPrice = applyPriceRounding(
    hbPrice,
    xmlSource.priceRoundEnabled,
    xmlSource.priceRoundType,
    xmlSource.priceRoundWay
  );

  // Trendyol üstü çizili liste fiyatı (%15 marjlı referans liste fiyatı)
  const trendyolListPrice = Number((tyPrice * 1.15).toFixed(2));

  return {
    trendyolPrice: tyPrice,
    trendyolListPrice,
    hepsiburadaPrice: hbPrice
  };
}

/**
 * Ürün detay ekranındaki Komisyon + Kargo + Karlılık Hesaplama Robotu
 */
export function calculateProfitBreakdown(params: {
  buyingCost: number;
  commissionPct: number;
  shippingCostExclVat: number;
  targetProfitPct: number;
  vatRate: number;
}) {
  const { buyingCost, commissionPct, shippingCostExclVat, targetProfitPct, vatRate } = params;
  const shippingInclVat = shippingCostExclVat * (1 + vatRate / 100);
  const totalRatio = (commissionPct + targetProfitPct) / 100;
  const denominator = Math.max(0.05, 1 - totalRatio);
  const suggestedSalePrice = Number(((buyingCost + shippingInclVat) / denominator).toFixed(2));
  const commissionAmount = Number(((suggestedSalePrice * commissionPct) / 100).toFixed(2));
  const netProfit = Number((suggestedSalePrice - buyingCost - shippingInclVat - commissionAmount).toFixed(2));

  return {
    suggestedSalePrice,
    commissionAmount,
    shippingInclVat: Number(shippingInclVat.toFixed(2)),
    netProfit
  };
}

/**
 * Desi Hesaplama (En x Boy x Yükseklik / 3000)
 */
export function calculateDesi(widthCm: number, lengthCm: number, heightCm: number, weightKg = 0): number {
  const volumetric = (Number(widthCm) * Number(lengthCm) * Number(heightCm)) / 3000;
  return Number(Math.max(volumetric, Number(weightKg) || 0, 0.5).toFixed(2));
}
