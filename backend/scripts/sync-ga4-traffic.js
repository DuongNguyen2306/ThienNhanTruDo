/**
 * Đồng bộ số liệu GA4 → MongoDB (chạy bằng BACKEND LOCAL).
 *
 * Dùng:  node scripts/sync-ga4-traffic.js [so_ngay]
 *        node scripts/sync-ga4-traffic.js 90
 *
 * VÍ SAO CẦN SCRIPT NÀY:
 *  • GA4 Data API có quota (10 property tokens / giờ) ⇒ không gọi mỗi lần
 *    Admin mở trang.
 *  • Script này chạy thủ công (hoặc bằng cron) để nạp số liệu vào MongoDB.
 *  • Upsert theo (ngày, nguồn) ⇒ chạy lại nhiều lần KHÔNG nhân đôi số liệu.
 *
 * KHÔNG ghi dữ liệu vào collection `traffic_visits` (dữ liệu tự ghi của
 * tracker) — chỉ ghi vào `ga4_traffic_daily`.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const ga4Service = require('../src/services/ga4Service');
const ga4SyncService = require('../src/services/ga4SyncService');

async function main() {
  const days = Number(process.argv[2]) || ga4SyncService.DEFAULT_SYNC_DAYS;

  console.log('─'.repeat(64));
  console.log('ĐỒNG BỘ GA4 → MONGODB');
  console.log('─'.repeat(64));
  console.log('Property ID :', process.env.GA4_PROPERTY_ID || '(chưa cấu hình)');
  console.log('Số ngày     :', days);
  console.log('Collection  :', ga4SyncService.COLLECTION_NAME);
  console.log('');

  if (!ga4Service.isConfigured()) {
    console.error('✗ GA4 chưa được cấu hình.');
    console.error('  Cần: GA4_PROPERTY_ID trong backend/.env');
    console.error('  Và: backend/secrets/ga4-service-account.json (hoặc GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY)');
    process.exit(1);
  }

  const result = await ga4SyncService.syncFromGa4({ days });

  console.log('✓ Đồng bộ xong.');
  console.log('  Số bản ghi ghi/cập nhật :', result.synced);
  console.log('  Thời điểm đồng bộ        :', result.lastSyncedAt);
  console.log('');

  // In báo cáo tóm tắt cho từng kỳ để đối chiếu.
  for (const period of ['today', '7d', '30d', 'all']) {
    const report = await ga4SyncService.getSyncedReport(period);
    console.log(`── ${report.periodLabel} (${period}) ──`);
    console.log(`   Tổng sessions: ${report.totals.totalSessions}`);
    for (const s of report.sources) {
      console.log(`   ${s.label.padEnd(20)} ${String(s.sessions).padStart(6)}  ${s.percent}%`);
    }
    console.log('');
  }

  const breakdown = (await ga4SyncService.getSyncedReport('all')).breakdown;
  if (breakdown.length > 0) {
    console.log('── Chi tiết sessionSourceMedium ──');
    for (const row of breakdown) {
      console.log(`   ${row.sourceMedium.padEnd(40)} ${String(row.sessions).padStart(6)}  [${row.source}]`);
    }
    console.log('');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('✗ LỖI:', error.message);
  if (error.code) console.error('  code:', error.code);
  process.exit(1);
});
