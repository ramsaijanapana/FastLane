type OpenFoodFactsResponse = {
  status?: number;
  product?: {
    product_name?: string;
    brands?: string;
    quantity?: string;
    serving_size?: string;
    nutriments?: Record<string, unknown>;
  };
};

export type ScannedMealPrefill = {
  name: string;
  calories?: number;
  note?: string;
};

const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2/product';

const isLikelyProductBarcode = (value: string) => /^\d{8,14}$/.test(value);

const asFiniteNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const parseQuantityAmount = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);

  if (!match) {
    return undefined;
  }

  const amount = Number.parseFloat(match[1].replace(',', '.'));

  return Number.isFinite(amount) ? amount : undefined;
};

const getCaloriesFromProduct = (product: OpenFoodFactsResponse['product']) => {
  const nutriments = product?.nutriments ?? {};
  const servingCalories = asFiniteNumber(nutriments['energy-kcal_serving']);

  if (servingCalories !== undefined) {
    return {
      calories: Math.round(servingCalories),
      noteSuffix: 'Calories filled from the listed serving.',
    };
  }

  const perHundredCalories = asFiniteNumber(nutriments['energy-kcal_100g']);
  const quantityAmount =
    parseQuantityAmount(product?.serving_size) ?? parseQuantityAmount(product?.quantity);

  if (perHundredCalories !== undefined && quantityAmount !== undefined) {
    return {
      calories: Math.round((perHundredCalories * quantityAmount) / 100),
      noteSuffix: 'Calories estimated from package quantity.',
    };
  }

  return {
    calories: undefined,
    noteSuffix: undefined,
  };
};

const buildFallbackPrefill = (data: string, type: string): ScannedMealPrefill => {
  const trimmed = data.trim();
  const compactText = trimmed.replace(/\s+/g, ' ');
  const looksLikeShortLabel =
    compactText.length > 0 &&
    compactText.length <= 48 &&
    !/^https?:\/\//i.test(compactText);

  return {
    name: looksLikeShortLabel ? compactText : 'Scanned item',
    note:
      looksLikeShortLabel
        ? `Scanned from ${type}.`
        : `Scanned ${type}: ${compactText || 'No data available.'}`,
  };
};

export const getMealPrefillFromScan = async (
  rawData: string,
  rawType: string,
): Promise<ScannedMealPrefill> => {
  const data = rawData.trim();
  const type = rawType.trim() || 'code';

  if (!data) {
    return {
      name: 'Scanned item',
      note: 'The code was detected, but it did not include readable text.',
    };
  }

  if (!isLikelyProductBarcode(data)) {
    return buildFallbackPrefill(data, type);
  }

  try {
    const response = await fetch(
      `${OPEN_FOOD_FACTS_API}/${encodeURIComponent(
        data,
      )}.json?fields=product_name,brands,quantity,serving_size,nutriments`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      return buildFallbackPrefill(data, type);
    }

    const payload = (await response.json()) as OpenFoodFactsResponse;
    const product = payload.product;
    const productName = product?.product_name?.trim();

    if (!productName) {
      return buildFallbackPrefill(data, type);
    }

    const calories = getCaloriesFromProduct(product);
    const brand = product?.brands?.trim();
    const quantity = product?.quantity?.trim();
    const noteParts = [
      brand ? `Brand: ${brand}.` : null,
      quantity ? `Pack: ${quantity}.` : null,
      calories.noteSuffix ?? null,
      `Barcode: ${data}.`,
    ].filter((part): part is string => Boolean(part));

    return {
      name: productName,
      calories: calories.calories,
      note: noteParts.join(' '),
    };
  } catch {
    return buildFallbackPrefill(data, type);
  }
};
