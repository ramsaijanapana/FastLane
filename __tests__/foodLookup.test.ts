import { getMealPrefillFromScan } from '../src/services/foodLookup';

describe('getMealPrefillFromScan', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hydrates a meal prefill from a known product response', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          product: {
            product_name: 'Sparkling Water',
            brands: 'Clear Spring',
            quantity: '330 ml',
            nutriments: {
              'energy-kcal_serving': 0,
            },
          },
        }),
      } as Response);

    const result = await getMealPrefillFromScan('12345678', 'ean8');

    expect(fetchMock).toHaveBeenCalled();
    expect(result.name).toBe('Sparkling Water');
    expect(result.calories).toBe(0);
    expect(result.note).toContain('Brand: Clear Spring.');
    expect(result.note).toContain('Barcode: 12345678.');
  });

  it('falls back to readable QR text when lookup is not needed', async () => {
    const result = await getMealPrefillFromScan('Protein shake', 'qr');

    expect(result).toEqual({
      name: 'Protein shake',
      note: 'Scanned from qr.',
    });
  });
});
