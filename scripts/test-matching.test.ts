import { normalizeName, parseAmountToCents } from '../server/services/extractor';

describe('Matching Logic', () => {
  test('normalizeName handles Turkish characters and punctuation', () => {
    expect(normalizeName('Yener Yiğit ÇELİK.')).toBe('YENER YIGIT CELIK');
    expect(normalizeName('  şöför  ')).toBe('SOFOR');
  });

  test('parseAmountToCents handles different formats', () => {
    expect(parseAmountToCents('1.234,56')).toBe(123456);
    expect(parseAmountToCents('1234.56')).toBe(123456);
  });
});
