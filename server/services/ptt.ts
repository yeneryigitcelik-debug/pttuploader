import { chromium, type Page } from 'playwright';
import { selectors, getCellSelector } from '../config/pttSelectors';
import path from 'path';
import fs from 'fs';
import { normalizeName } from './extractor';

const PTT_BASE_URL = 'https://tedarikci.pttavm.com';
const ORDERS_URL = `${PTT_BASE_URL}/app/order-management/orders`;

export interface Candidate {
  orderId: string;
  basketId: string;
  customerName: string;
  amountCents: number;
}

/**
 * PTTAVM paneline login yapar.
 */
async function loginToPttavm(page: Page): Promise<void> {
  await page.goto(PTT_BASE_URL);
  await page.waitForLoadState('networkidle');

  // Login form doldur
  const usernameEl = await page.waitForSelector(selectors.login.usernameInput, { timeout: 10000 });
  await usernameEl.fill(process.env.PTT_USERNAME || '');

  const passwordEl = await page.waitForSelector(selectors.login.passwordInput, { timeout: 5000 });
  await passwordEl.fill(process.env.PTT_PASSWORD || '');

  await page.click(selectors.login.submitButton);
  await page.waitForLoadState('networkidle');

  // Login sonrasi siparis sayfasina git
  // Oncelikle sidebar'daki "Siparisler" linkini dene, yoksa dogrudan URL'e git
  const sidebarLink = await page.$(`text="${selectors.orders.sidebarOrdersText}"`);
  if (sidebarLink) {
    await sidebarLink.click();
    await page.waitForLoadState('networkidle');
  } else {
    await page.goto(ORDERS_URL);
  }
  await page.waitForSelector(selectors.orders.row, { timeout: 15000 });
}

/**
 * MUI DataTable'daki siparisleri tarar ve musteri adina gore eslestirir.
 * NOT: Tutar sutunu listede yok, sadece isim eslesmesi yapilir.
 */
export async function findOrderCandidates(page: Page, insuredNameNormalized: string, _amountCents: number) {
  const maxPages = Number(process.env.PTT_MAX_PAGES_TO_SCAN) || 5;

  const candidates: Candidate[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    // Tablonun yuklenmesini bekle
    await page.waitForSelector(selectors.orders.row, { timeout: 10000 }).catch(() => null);

    const rows = await page.$$(selectors.orders.row);

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];

      // Musteri adi - MUI DataTable cell'inden oku
      const nameCell = await row.$('td[data-testid^="MuiDataTableBodyCell-6-"]');
      const nameText = nameCell ? (await nameCell.textContent() || '').trim() : '';

      // Siparis numarasi - link icindeki text
      const orderLink = await row.$('a[href*="/order-management/"]');
      const orderId = orderLink ? (await orderLink.textContent() || '').trim() : '';

      // Sepet numarasi
      const basketCell = await row.$('td[data-testid^="MuiDataTableBodyCell-1-"]');
      const basketId = basketCell ? (await basketCell.textContent() || '').trim() : '';

      if (!nameText || !orderId) continue;

      const normalizedRowName = normalizeName(nameText);

      // Isim eslesmesi kontrol
      if (
        normalizedRowName.includes(insuredNameNormalized) ||
        insuredNameNormalized.includes(normalizedRowName)
      ) {
        candidates.push({
          orderId,
          basketId,
          customerName: nameText,
          amountCents: 0, // Listede tutar yok
        });
      }
    }

    // Sonraki sayfaya gec
    const nextBtn = await page.$(selectors.orders.nextPageBtn);
    if (!nextBtn) break;

    const isDisabled = await nextBtn.isDisabled();
    if (isDisabled) break;

    await nextBtn.click();
    await page.waitForLoadState('networkidle');
  }

  // Eslestirme karari
  if (candidates.length === 1) {
    return {
      decision: 'AUTO_UPLOAD' as const,
      selectedOrderId: candidates[0].orderId,
      reason: `Tek eslesme: ${candidates[0].customerName}`,
      candidates,
    };
  }
  if (candidates.length > 1) {
    return {
      decision: 'MANUAL' as const,
      reason: `${candidates.length} aday bulundu, manuel secim gerekli`,
      candidates,
    };
  }
  return {
    decision: 'MANUAL' as const,
    reason: 'Eslesen siparis bulunamadi',
    candidates: [],
  };
}

/**
 * Verilen siparis numarasina PDF yukler.
 */
export async function uploadPdf(
  orderId: string,
  filePath: string
): Promise<{ success: boolean; error?: string; evidence?: string }> {
  const browser = await chromium.launch({
    headless: process.env.PTT_HEADLESS !== 'false',
    slowMo: Number(process.env.PTT_SLOWMO_MS) || 0,
  });

  const evidenceDir = path.join(process.cwd(), 'data', 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    await loginToPttavm(page);

    // Arama yap - once arama ikonuna tikla (MUI DataTable search)
    const searchIcon = await page.$(selectors.orders.searchIcon);
    if (searchIcon) {
      await searchIcon.click();
      await page.waitForTimeout(500);
    }

    // Arama kutusunu bul ve siparis no yaz
    const searchInput = await page.waitForSelector(selectors.orders.searchInput, { timeout: 5000 });
    await searchInput.fill(orderId);
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle');

    // Sonuclari bekle
    await page.waitForSelector(selectors.orders.row, { timeout: 10000 });

    // Ilk sonuca tikla - siparis detay sayfasina git
    const orderLink = await page.$(selectors.orders.orderDetailLink);
    if (orderLink) {
      await orderLink.click();
    } else {
      await page.click(selectors.orders.row);
    }
    await page.waitForLoadState('networkidle');

    // Screenshot - oncesi
    const beforeShot = path.join(evidenceDir, `${orderId}-before.png`);
    await page.screenshot({ path: beforeShot, fullPage: true });

    if (process.env.DRY_RUN === 'true') {
      console.log(`[DRY RUN] ${filePath} -> siparis ${orderId}`);
      return { success: true, evidence: beforeShot };
    }

    // 1) PDF dosyasini sec - input#new_invoice_file
    const fileInput = await page.waitForSelector(selectors.orders.fileInput, { timeout: 10000 });
    await fileInput.setInputFiles(filePath);

    // 2) "Yukle" butonuna tikla
    const uploadBtn = await page.$(`text="Yükle"`);
    if (uploadBtn) {
      await uploadBtn.click();
    } else {
      // XPath fallback
      await page.click(selectors.orders.uploadButtonFallback);
    }
    await page.waitForLoadState('networkidle');

    // Screenshot - yukleme sonrasi
    const uploadShot = path.join(evidenceDir, `${orderId}-uploaded.png`);
    await page.screenshot({ path: uploadShot, fullPage: true });

    // 3) "GONDERILDI OLARAK ISARETLE" butonuna tikla
    const markSentBtn = await page.$(`text="GÖNDERİLDİ OLARAK İŞARETLE"`);
    if (markSentBtn) {
      await markSentBtn.click();
    } else {
      await page.click(selectors.orders.markAsSentButtonFallback);
    }
    await page.waitForTimeout(1000);

    // 4) Onay dialogunda tekrar "GONDERILDI OLARAK ISARETLE" tikla
    const confirmSentBtn = await page.$(`text="GÖNDERİLDİ OLARAK İŞARETLE"`);
    if (confirmSentBtn) {
      await confirmSentBtn.click();
    }
    await page.waitForLoadState('networkidle');

    // 5) "TESLIM EDILDI OLARAK ISARETLE" butonuna tikla
    const markDeliveredBtn = await page.waitForSelector(`text="TESLİM EDİLDİ OLARAK İŞARETLE"`, { timeout: 10000 }).catch(() => null);
    if (markDeliveredBtn) {
      await markDeliveredBtn.click();
      await page.waitForTimeout(1000);

      // 6) Onay dialogunda tekrar tikla
      const confirmDeliveredBtn = await page.$(`text="TESLİM EDİLDİ OLARAK İŞARETLE"`);
      if (confirmDeliveredBtn) {
        await confirmDeliveredBtn.click();
      }
      await page.waitForLoadState('networkidle');
    }

    // Screenshot - sonrasi (tum islemler bitti)
    const afterShot = path.join(evidenceDir, `${orderId}-after.png`);
    await page.screenshot({ path: afterShot, fullPage: true });

    return { success: true, evidence: afterShot };
  } catch (err: any) {
    console.error('Playwright Error:', err);
    return { success: false, error: err.message };
  } finally {
    await browser.close();
  }
}
