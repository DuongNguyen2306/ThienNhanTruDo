/**
 * Website Review — DEMO DATA.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY
 * ───
 * The public "ĐÁNH GIÁ WEBSITE" section showed `0.0 sao` / `0 đánh giá` because
 * the platform rating is only ever fed by REAL reviews, and real reviews
 * require a qualifying completed payment transaction. A fresh development
 * database therefore has nothing to show.
 *
 * This module holds a SEPARATE, purely illustrative data set. It is never
 * written to the database, never counted into the real statistics and never
 * visible to the admin review history.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SAFETY RULES
 * ────────────
 *  1. The demo mode is OFF by default and is FORCED OFF in production.
 *  2. Demo reviews are never persisted — they exist only in memory.
 *  3. Real reviews and demo reviews are reported separately:
 *     • `summary.average` / `summary.totalReviews`  → REAL reviews only.
 *     • `summary.demo.average` / `summary.demo.totalReviews` → demo only.
 *  4. Every demo review is flagged `isDemo: true` so the UI can label it.
 *  5. The demo names are explicitly fictional sample names — they do not
 *     impersonate real accounts, and no real user id is attached to them.
 */

const DEMO_REVIEWERS = [
  { name: 'Minh Anh', initials: 'MA' },
  { name: 'Thu Hà', initials: 'TH' },
  { name: 'Quốc Bảo', initials: 'QB' },
  { name: 'Ngọc Lan', initials: 'NL' },
  { name: 'Gia Hân', initials: 'GH' },
  { name: 'Trọng Nghĩa', initials: 'TN' },
  { name: 'Phương Vy', initials: 'PV' },
  { name: 'Hoàng Long', initials: 'HL' },
  { name: 'Bảo Châu', initials: 'BC' },
  { name: 'Thanh Tùng', initials: 'TT' },
  { name: 'Mỹ Duyên', initials: 'MD' },
  { name: 'Anh Khoa', initials: 'AK' },
];

/**
 * The illustrative reviews.
 *
 * `daysAgo` is turned into an absolute date at read time so the list always
 * shows a believable spread of dates.
 */
const DEMO_REVIEWS = [
  {
    score: 5,
    title: 'Tìm phòng trọ dễ dàng, giao diện rõ ràng',
    content:
      'Website hiển thị thông tin phòng rất đầy đủ: giá thuê, diện tích, tiện ích và ảnh chụp thật. Mình lọc theo quận và mức giá chỉ mất vài giây, sau đó liên hệ chủ nhà ngay trên điện thoại.',
    daysAgo: 2,
  },
  {
    score: 4,
    title: 'Hài lòng, chỉ mong thêm bộ lọc nâng cao',
    content:
      'Trải nghiệm đặt phòng khá mượt, tin đăng có giá và vị trí rõ ràng nên dễ so sánh. Điểm trừ nhỏ là mình muốn lọc thêm theo số tiền cọc và loại hình phòng ngay trên trang chủ.',
    daysAgo: 5,
  },
  {
    score: 5,
    title: 'Phản hồi nhanh từ chủ trọ',
    content:
      'Mình đặt lịch xem phòng qua website và được nhắn xác nhận trong vòng mười lăm phút. Phòng đúng như hình, giá thuê cũng sát với đăng tin, không có chi phí ẩn nào phát sinh.',
    daysAgo: 8,
  },
  {
    score: 4,
    title: 'Tin đăng chuẩn, ít quảng cáo',
    content:
      'Điểm mình thích là không bị chèn quảng cáo chen ngang như một số trang khác. Thông tin tiền điện nước, internet và vệ sinh đều được ghi rõ ở từng tin, giúp mình so sánh nhanh giữa nhiều phòng.',
    daysAgo: 12,
  },
  {
    score: 5,
    title: 'Cất phòng nhanh gọn',
    content:
      'Chuyển tiền cọc xong mình cần hợp đồng đặt cọc. Website hỗ trợ tạo hồ sơ hợp đồng ngay trong tài khoản, tải về máy và ký luôn. Toàn bộ quy trình mất chưa tới một ngày.',
    daysAgo: 17,
  },
  {
    score: 3,
    title: 'Dùng được nhưng bản đồ hơi rối',
    content:
      'Chức năng chính vẫn ổn, tin đăng đầy đủ và dễ tìm. Tuy nhiên lúc mở bản đồ để xem vị trí phòng trọ, mình phải zoom thủ công mới xác định được đường vào, hơi bất tiện trên điện thoại.',
    daysAgo: 22,
  },
  {
    score: 5,
    title: 'Xem phòng đúng như mô tả',
    content:
      'Mình đã xem ba căn phòng ở quận Bình Thạnh trong một buổi sáng. Mỗi tin đăng đều ghi rõ số tiền cọc và phí quản lý, nên không có hiểu lầm nào về chi phí khi ký hợp đồng.',
    daysAgo: 26,
  },
  {
    score: 4,
    title: 'Hỗ trợ nhanh qua tin nhắn',
    content:
      'Khi có câu hỏi về phòng, mình nhắn trực tiếp qua website và nhận được trả lời trong ngày. Trang quản lý tài khoản cũng dễ dùng, giúp mình theo dõi lịch hẹn xem phòng đã đặt.',
    daysAgo: 31,
  },
  {
    score: 5,
    title: 'Nhiều mức giá phù hợp sinh viên',
    content:
      'Mình là sinh viên nên lọc theo giá dưới ba triệu là thấy ngay danh sách. Phần lọc theo khoảng cách tới trường cũng hoạt động ổn, giúp mình tiết kiệm khá nhiều thời gian đi xem phòng.',
    daysAgo: 37,
  },
  {
    score: 4,
    title: 'Hợp đồng và biên nhận rõ ràng',
    content:
      'Sau khi ký, mình tải được hợp đồng và biên nhận cọc ngay trên tài khoản. Phần tải lên ảnh phòng rõ nét, không bị vỡ như một số nơi mình từng dùng.',
    daysAgo: 44,
  },
  {
    score: 5,
    title: 'Giao diện dễ dùng cho người mới',
    content:
      'Bố cục rõ ràng, nút tìm phòng nổi bật, màu chữ dễ đọc. Bố mẹ mình cũng dùng được để đăng tin cho con trai thuê trọ, không cần hướng dẫn nhiều.',
    daysAgo: 52,
  },
  {
    score: 5,
    title: 'Đáng để giới thiệu bạn bè',
    content:
      'Mình đã giới thiệu website cho bạn cùng phòng và cả nhóm trong ký túc xá. Một số bạn tìm được phòng gần trường trong khoảng một tuần, tiết kiệm được khá nhiều công sức.',
    daysAgo: 60,
  },
];

/** Build the demo review objects with concrete dates. */
function buildDemoReviews() {
  const now = Date.now();
  return DEMO_REVIEWS.map((r, i) => {
    const reviewer = DEMO_REVIEWERS[i % DEMO_REVIEWERS.length];
    return {
      id: `demo-review-${String(i + 1).padStart(2, '0')}`,
      score: r.score,
      title: r.title,
      content: r.content,
      createdAt: new Date(now - r.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      reviewerName: reviewer.name,
      reviewerInitials: reviewer.initials,
      reviewerRole: 'demo',
      adminReply: null,
      adminReplyAt: null,
      // The flag the UI uses to render the "Đánh giá mẫu" badge.
      isDemo: true,
    };
  });
}

/** The demo reviews, newest first. */
function getDemoReviews() {
  return buildDemoReviews().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Aggregate of the demo reviews only. */
function getDemoAggregate() {
  const reviews = getDemoReviews();
  const total = reviews.length;
  const sum = reviews.reduce((s, r) => s + (Number(r.score) || 0), 0);
  const rawAverage = total > 0 ? sum / total : 0;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const s = Math.round(Number(r.score));
    if (s >= 1 && s <= 5) distribution[s] += 1;
  }

  return {
    average: Math.round(rawAverage * 10) / 10,
    rawAverage,
    totalReviews: total,
    distribution,
  };
}

module.exports = {
  getDemoReviews,
  getDemoAggregate,
};
