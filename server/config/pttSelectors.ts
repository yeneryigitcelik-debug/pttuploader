/**
 * PTTAVM Tedarikci Panel Selectors
 * Base URL: https://tedarikci.pttavm.com
 *
 * MUI DataTable kullanilmaktadir.
 * data-testid attribute'leri:
 *   Row:  MuiDataTableBodyRow-{rowIndex}
 *   Cell: MuiDataTableBodyCell-{columnId}-{rowIndex}
 *
 * Gorunen sutunlar (soldan saga):
 *   Sepet Numarasi | Siparis Numarasi | Siparis Tarihi | Adet |
 *   Urun Adi | Musteri | Teslimat Noktasi | Durum
 *
 * NOT: Tutar/fiyat sutunu siparis listesinde yok.
 *       Siparis detay sayfasinda bulunabilir.
 */

export const selectors = {
  login: {
    // tedarikci.pttavm.com login sayfasi
    // <input id="email" class="_input_mlg16_33" type="email" name="email">
    usernameInput: '#email',
    // <input id="password" class="_input_mlg16_33" type="password" name="password">
    passwordInput: '#password',
    submitButton: 'button[type="submit"]',
  },

  orders: {
    // ======= TABLO =======
    // Her siparis satiri
    row: 'tr[data-testid^="MuiDataTableBodyRow"]',

    // Hucre selectors (satir icinde, data-testid column ID'leri)
    // Musteri adi - column 6 (dogrulanmis: "ilksen Gulerman")
    customerNameCell: 'td[data-testid^="MuiDataTableBodyCell-6-"]',

    // Siparis numarasi - link iceren hucre (orn: "PTT-0ANNM033I-240226")
    // Tablo icerisinde a etiketi icindeki text
    orderIdCell: 'td[data-testid^="MuiDataTableBodyCell-2-"] a, td[data-testid^="MuiDataTableBodyCell-1-"] a',

    // Sepet numarasi - ilk data sutunu
    basketIdCell: 'td[data-testid^="MuiDataTableBodyCell-1-"]',

    // Tutar - listede gorulmedi, detay sayfasinda aranacak
    amountCell: '.order-detail-amount',

    // Durum - column 19 (MuiChip icinde)
    statusCell: 'td[data-testid^="MuiDataTableBodyCell-19-"] .MuiChip-label',

    // ======= ARAMA / FILTRELEME =======
    // MUI DataTable ust toolbar'daki arama ikonu
    searchIcon: 'button[aria-label="Search"]',
    searchInput: 'input[placeholder*="Ara"], input[placeholder*="Search"], .MuiInput-input',

    // Filtre butonu
    filterButton: 'button[aria-label="Filter Table"], button[aria-label="Filter"]',

    // ======= SAYFALAMA =======
    nextPageBtn: 'button[aria-label="Next page"], .MuiTablePagination-actions button:last-child',
    prevPageBtn: 'button[aria-label="Previous page"], .MuiTablePagination-actions button:first-child',
    rowsPerPageSelect: '.MuiTablePagination-select',

    // ======= SIPARIS DETAY SAYFASI =======
    // Siparis detaya gitmek icin satirdaki linke tikla
    orderDetailLink: 'a[href*="/order-management/"]',

    // PDF yukleme alani (siparis detay sayfasinda)
    uploadButton: 'button:has-text("Yükle"), button:has-text("Dosya Ekle"), button:has-text("Upload"), input[type="file"] + button',
    fileInput: 'input[type="file"]',

    // Basari bildirimi
    successToast: '.MuiAlert-standardSuccess, .MuiSnackbar-root .MuiAlert-message, [role="alert"]',
  },
};

/**
 * Satir icindeki belirli bir hucreyi almak icin helper.
 * MUI DataTable'da hucre data-testid formati:
 *   MuiDataTableBodyCell-{columnId}-{rowIndex}
 *
 * Ornek kullanim:
 *   getCellSelector(6, 0) => 'td[data-testid="MuiDataTableBodyCell-6-0"]'
 */
export function getCellSelector(columnId: number, rowIndex: number): string {
  return `td[data-testid="MuiDataTableBodyCell-${columnId}-${rowIndex}"]`;
}

/**
 * Belirli bir satirdaki tum hucreleri ceken selector.
 */
export function getRowSelector(rowIndex: number): string {
  return `tr[data-testid="MuiDataTableBodyRow-${rowIndex}"]`;
}
