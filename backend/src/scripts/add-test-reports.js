/**
 * Script thêm dữ liệu báo cáo vi phạm để test UI-28 và UI-29
 * Chạy: cd backend && node src/scripts/add-test-reports.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Đang thêm dữ liệu báo cáo test...\n');

  // Tìm user tenant để làm reporter
  const users = await prisma.user.findMany({
    where: { role: 'tenant' },
    take: 3,
  });

  // Tìm listing để làm đối tượng bị báo cáo
  const listings = await prisma.listing.findMany({
    take: 5,
  });

  if (users.length === 0) {
    console.log('❌ Không tìm thấy user tenant nào. Hãy tạo user tenant trước.');
    return;
  }

  if (listings.length === 0) {
    console.log('❌ Không tìm thấy listing nào. Hãy tạo listing trước.');
    return;
  }

  // Dữ liệu báo cáo mẫu
  const reportsData = [
    {
      title: 'Tin đăng thông tin không chính xác',
      reason: 'Chủ trọ đăng phòng 25m² nhưng thực tế chỉ có 18m². Tôi đến xem trực tiếp và đo lại được diện tích thực tế là 18m². Đây là thông tin sai lệch nghiêm trọng và tôi cảm thấy bị lừa dối.',
      severity: 'high',
      status: 'pending',
      tone: 'emotional',
    },
    {
      title: 'Hình ảnh không đúng với thực tế',
      reason: 'Căn phòng trong hình có cửa sổ lớn view đẹp, nhưng thực tế căn phòng không có cửa sổ, tối và ẩm ướt. Tôi yêu cầu xem phòng trước khi đặt cọc nhưng chủ trọ từ chối.',
      severity: 'medium',
      status: 'pending',
      tone: 'neutral',
    },
    {
      title: 'Giá thuê cao hơn so với thông tin đăng',
      reason: 'Khi tôi liên hệ hỏi giá, chủ trọ nói giá đăng trên web là giá cũ, phòng hiện tại giá cao hơn 500k/tháng. Đây là hành vi lừa đảo để thu hút khách.',
      severity: 'high',
      status: 'investigating',
      tone: 'urgent',
    },
    {
      title: 'Nghi ngờ lừa đảo đặt cọc',
      reason: 'Chủ trọ yêu cầu đặt cọc trước 1 tháng qua chuyển khoản ngân hàng, nhưng không có hợp đồng. Sau khi chuyển tiền, chủ trọ không phản hồi tin nhắn và không liên lạc được.',
      severity: 'critical',
      status: 'pending',
      tone: 'urgent',
    },
    {
      title: 'Phòng có mùi ẩm mốc nghiêm trọng',
      reason: 'Phòng cho thuê có mùi ẩm mốc rất nặng, tôi nghi ngờ có vấn đề về sức khỏe. Chủ trọ nói đây là "mùi đặc trưng của khu vực" nhưng tôi không đồng ý.',
      severity: 'low',
      status: 'resolved',
      tone: 'neutral',
      resolution: 'Đã liên hệ chủ trọ và yêu cầu cải thiện. Chủ trọ đã đồng ý sơn lại và cải thiện thông gió.',
    },
  ];

  // Xóa các báo cáo test cũ (nếu có)
  await prisma.report.deleteMany({
    where: {
      title: {
        in: reportsData.map(r => r.title)
      }
    }
  });

  // Thêm báo cáo mới
  for (let i = 0; i < reportsData.length; i++) {
    const reportData = reportsData[i];
    const user = users[i % users.length];
    const listing = listings[i % listings.length];

    const report = await prisma.report.create({
      data: {
        title: reportData.title,
        reason: reportData.reason,
        severity: reportData.severity,
        status: reportData.status,
        tone: reportData.tone,
        reporterId: user.id,
        listingId: listing.id,
        resolution: reportData.resolution || null,
        resolvedAt: reportData.status === 'resolved' ? new Date() : null,
      },
      include: {
        reporter: {
          select: { fullName: true, phone: true }
        }
      }
    });

    console.log(`✅ Đã thêm báo cáo #${i + 1}:`);
    console.log(`   - ID: ${report.id}`);
    console.log(`   - Tiêu đề: ${report.title}`);
    console.log(`   - Mức độ: ${report.severity}`);
    console.log(`   - Trạng thái: ${report.status}`);
    console.log(`   - Người gửi: ${report.reporter?.fullName || 'N/A'}`);
    console.log(`   - Listing: ${listing.id.slice(0, 8)}...`);
    console.log('');
  }

  console.log('✅ Hoàn thành! Đã thêm ' + reportsData.length + ' báo cáo test.\n');
  console.log('Bây giờ bạn có thể:');
  console.log('1. Đăng nhập với tài khoản Manager');
  console.log('2. Truy cập http://localhost:3000/manager/reports');
  console.log('3. Click "Xem chi tiết" để vào UI-29\n');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
