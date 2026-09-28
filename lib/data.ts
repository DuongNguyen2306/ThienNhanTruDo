export type RoomType = 'Phòng trọ khép kín' | 'Chung cư mini' | 'Căn hộ dịch vụ' | 'Ký túc xá'
export type ListingStatus = 'draft' | 'pending' | 'active' | 'rejected' | 'inactive'
export type PhotoSource = 'host' | 'manager'

export type Listing = {
  id: string
  title: string
  roomType: RoomType
  address: string
  houseNumber: string
  alley: string
  street: string
  ward: string
  district: string
  city: string
  lat: number
  lng: number
  rent: number
  depositMonths: number
  electricity: number
  electricityType: 'Nhà nước' | 'Kinh doanh'
  water: number
  waterType: 'Theo khối' | 'Đầu người'
  internet: number
  sanitation: number
  parkingBike: number
  parkingCar: number
  managementFee: number
  estimatedUtilities: number
  area: number
  direction: string
  furniture: boolean
  pets: boolean
  availableFrom: string | null
  vacantNow: boolean
  verified: boolean
  vip: boolean
  highTrust: boolean
  status: ListingStatus
  views: number
  rating: number
  reviewCount: number
  image: string
  photos: { src: string; label: string; source: PhotoSource; highTrust?: boolean }[]
  amenities: string[]
  roadWidth: number
  carAccess: boolean
  truckAccess: boolean
  sellerId: string
  rejectReason?: string
  priceAlert?: boolean
  coordMismatch?: boolean
}

export type Seller = {
  id: string
  name: string
  phone: string
  responseRate: number
  trustScore: number
  roomsManaged: number
  verified: boolean
}

export const sellers: Seller[] = [
  { id: 's1', name: 'Minh Anh Realty', phone: '0903 112 334', responseRate: 96, trustScore: 4.8, roomsManaged: 18, verified: true },
  { id: 's2', name: 'Green Nest Homes', phone: '0912 445 778', responseRate: 88, trustScore: 4.5, roomsManaged: 9, verified: true },
  { id: 's3', name: 'The Park View', phone: '0988 221 009', responseRate: 91, trustScore: 4.6, roomsManaged: 12, verified: false },
]

const img = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
]

export const listings: Listing[] = [
  {
    id: 'vr-1052',
    title: 'Căn hộ Lumière Thảo Điền',
    roomType: 'Căn hộ dịch vụ',
    address: '24B Nguyễn Văn Hưởng, Phường Thảo Điền, TP. Thủ Đức, TP.HCM',
    houseNumber: '24B', alley: 'Hẻm 12', street: 'Nguyễn Văn Hưởng', ward: 'Thảo Điền', district: 'Thủ Đức', city: 'TP. Hồ Chí Minh',
    lat: 10.8069, lng: 106.7312, rent: 8500000, depositMonths: 1, electricity: 3800, electricityType: 'Nhà nước',
    water: 100000, waterType: 'Đầu người', internet: 150000, sanitation: 50000, parkingBike: 100000, parkingCar: 800000,
    managementFee: 200000, estimatedUtilities: 650000, area: 32, direction: 'Đông Nam', furniture: true, pets: false,
    availableFrom: null, vacantNow: true, verified: true, vip: true, highTrust: true, status: 'pending', views: 1284, rating: 4.9, reviewCount: 27,
    image: img[0],
    photos: [
      { src: img[0], label: 'Tổng quan phòng', source: 'manager', highTrust: true },
      { src: img[1], label: 'Nhà vệ sinh', source: 'manager', highTrust: true },
      { src: img[2], label: 'Đồng hồ điện/nước', source: 'host' },
      { src: img[3], label: 'Bếp', source: 'host' },
      { src: img[4], label: 'Ban công', source: 'manager', highTrust: true },
    ],
    amenities: ['Máy lạnh', 'Thang máy', 'Giờ giấc tự do', 'PCCC đạt chuẩn', 'Máy giặt'],
    roadWidth: 6, carAccess: true, truckAccess: false, sellerId: 's1',
  },
  {
    id: 'vr-1048',
    title: 'Sunrise Studio Quận 1',
    roomType: 'Chung cư mini',
    address: '18 Nguyễn Thái Bình, Phường Nguyễn Thái Bình, Quận 1, TP.HCM',
    houseNumber: '18', alley: '', street: 'Nguyễn Thái Bình', ward: 'Nguyễn Thái Bình', district: 'Quận 1', city: 'TP. Hồ Chí Minh',
    lat: 10.7701, lng: 106.7004, rent: 12500000, depositMonths: 2, electricity: 3500, electricityType: 'Nhà nước',
    water: 25000, waterType: 'Theo khối', internet: 200000, sanitation: 80000, parkingBike: 150000, parkingCar: 1200000,
    managementFee: 350000, estimatedUtilities: 950000, area: 28, direction: 'Tây Bắc', furniture: true, pets: false,
    availableFrom: null, vacantNow: true, verified: true, vip: true, highTrust: false, status: 'active', views: 2103, rating: 4.7, reviewCount: 41,
    image: img[1],
    photos: [
      { src: img[1], label: 'Tổng quan phòng', source: 'host' },
      { src: img[5], label: 'Nhà vệ sinh', source: 'host' },
    ],
    amenities: ['Máy lạnh', 'Thang máy', 'Nội thất đầy đủ'],
    roadWidth: 8, carAccess: true, truckAccess: true, sellerId: 's1', priceAlert: true, coordMismatch: true,
  },
  {
    id: 'vr-1031',
    title: 'The Marq Residences',
    roomType: 'Căn hộ dịch vụ',
    address: '167A Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP.HCM',
    houseNumber: '167A', alley: '', street: 'Nam Kỳ Khởi Nghĩa', ward: 'Võ Thị Sáu', district: 'Quận 3', city: 'TP. Hồ Chí Minh',
    lat: 10.7829, lng: 106.6958, rent: 18500000, depositMonths: 2, electricity: 3500, electricityType: 'Nhà nước',
    water: 22000, waterType: 'Theo khối', internet: 250000, sanitation: 120000, parkingBike: 200000, parkingCar: 1500000,
    managementFee: 500000, estimatedUtilities: 1200000, area: 48, direction: 'Nam', furniture: true, pets: true,
    availableFrom: null, vacantNow: true, verified: true, vip: true, highTrust: true, status: 'active', views: 890, rating: 4.9, reviewCount: 19,
    image: img[2],
    photos: [{ src: img[2], label: 'Tổng quan phòng', source: 'manager', highTrust: true }],
    amenities: ['Máy lạnh', 'Thang máy', 'Giờ giấc tự do', 'Cho nuôi thú cưng'],
    roadWidth: 12, carAccess: true, truckAccess: true, sellerId: 's1',
  },
  {
    id: 'vr-1022',
    title: 'Thảo Điền Garden Studio',
    roomType: 'Phòng trọ khép kín',
    address: '12 Xuân Thủy, Phường Thảo Điền, TP. Thủ Đức, TP.HCM',
    houseNumber: '12', alley: 'Hẻm 8', street: 'Xuân Thủy', ward: 'Thảo Điền', district: 'Thủ Đức', city: 'TP. Hồ Chí Minh',
    lat: 10.8024, lng: 106.7341, rent: 9000000, depositMonths: 1, electricity: 4000, electricityType: 'Kinh doanh',
    water: 90000, waterType: 'Đầu người', internet: 120000, sanitation: 40000, parkingBike: 80000, parkingCar: 0,
    managementFee: 150000, estimatedUtilities: 700000, area: 25, direction: 'Đông', furniture: true, pets: true,
    availableFrom: '2026-10-15', vacantNow: false, verified: true, vip: false, highTrust: true, status: 'active', views: 654, rating: 4.8, reviewCount: 33,
    image: img[3],
    photos: [{ src: img[3], label: 'Tổng quan phòng', source: 'manager', highTrust: true }],
    amenities: ['Máy lạnh', 'Giờ giấc tự do', 'Cho nuôi thú cưng'],
    roadWidth: 4, carAccess: false, truckAccess: false, sellerId: 's2',
  },
  {
    id: 'vr-1018',
    title: 'Green Nest Bình Thạnh',
    roomType: 'Phòng trọ khép kín',
    address: '45/3 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM',
    houseNumber: '45/3', alley: 'Hẻm 45', street: 'Điện Biên Phủ', ward: 'Phường 15', district: 'Bình Thạnh', city: 'TP. Hồ Chí Minh',
    lat: 10.8012, lng: 106.7103, rent: 4500000, depositMonths: 1, electricity: 4200, electricityType: 'Kinh doanh',
    water: 80000, waterType: 'Đầu người', internet: 100000, sanitation: 30000, parkingBike: 70000, parkingCar: 0,
    managementFee: 100000, estimatedUtilities: 480000, area: 20, direction: 'Tây', furniture: false, pets: false,
    availableFrom: null, vacantNow: true, verified: false, vip: false, highTrust: false, status: 'active', views: 421, rating: 4.3, reviewCount: 12,
    image: img[4],
    photos: [{ src: img[4], label: 'Tổng quan phòng', source: 'host' }],
    amenities: ['Máy lạnh', 'PCCC đạt chuẩn'],
    roadWidth: 3.5, carAccess: false, truckAccess: false, sellerId: 's2',
  },
  {
    id: 'vr-1004',
    title: 'KTX gần Đại học FPT',
    roomType: 'Ký túc xá',
    address: 'Lô E2a-7, Đường D1, Khu CNC, TP. Thủ Đức, TP.HCM',
    houseNumber: 'Lô E2a-7', alley: '', street: 'Đường D1', ward: 'Long Thạnh Mỹ', district: 'Thủ Đức', city: 'TP. Hồ Chí Minh',
    lat: 10.8414, lng: 106.8099, rent: 2200000, depositMonths: 1, electricity: 3500, electricityType: 'Nhà nước',
    water: 60000, waterType: 'Đầu người', internet: 0, sanitation: 20000, parkingBike: 50000, parkingCar: 0,
    managementFee: 50000, estimatedUtilities: 250000, area: 12, direction: 'Nam', furniture: true, pets: false,
    availableFrom: null, vacantNow: true, verified: true, vip: false, highTrust: false, status: 'active', views: 1760, rating: 4.4, reviewCount: 88,
    image: img[5],
    photos: [{ src: img[5], label: 'Tổng quan phòng', source: 'manager' }],
    amenities: ['Wifi miễn phí', 'Giờ giấc tự do', 'PCCC đạt chuẩn'],
    roadWidth: 10, carAccess: true, truckAccess: true, sellerId: 's3',
  },
  {
    id: 'vr-0991',
    title: 'Riverside Home Quận 7',
    roomType: 'Chung cư mini',
    address: '90 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM',
    houseNumber: '90', alley: '', street: 'Nguyễn Văn Linh', ward: 'Tân Phong', district: 'Quận 7', city: 'TP. Hồ Chí Minh',
    lat: 10.7295, lng: 106.7218, rent: 6700000, depositMonths: 1, electricity: 3600, electricityType: 'Nhà nước',
    water: 85000, waterType: 'Đầu người', internet: 130000, sanitation: 40000, parkingBike: 90000, parkingCar: 900000,
    managementFee: 180000, estimatedUtilities: 560000, area: 30, direction: 'Đông Bắc', furniture: true, pets: false,
    availableFrom: null, vacantNow: false, verified: false, vip: false, highTrust: false, status: 'inactive', views: 210, rating: 4.1, reviewCount: 6,
    image: img[0],
    photos: [{ src: img[0], label: 'Tổng quan phòng', source: 'host' }],
    amenities: ['Máy lạnh', 'Thang máy'],
    roadWidth: 16, carAccess: true, truckAccess: true, sellerId: 's3',
  },
  {
    id: 'vr-0980',
    title: 'Phòng trọ gần ngã tư Thủ Đức (nháp)',
    roomType: 'Phòng trọ khép kín',
    address: 'Gần ngã tư Thủ Đức',
    houseNumber: '', alley: '', street: '', ward: 'Linh Chiểu', district: 'Thủ Đức', city: 'TP. Hồ Chí Minh',
    lat: 10.8494, lng: 106.7616, rent: 2800000, depositMonths: 1, electricity: 4500, electricityType: 'Kinh doanh',
    water: 70000, waterType: 'Đầu người', internet: 0, sanitation: 20000, parkingBike: 50000, parkingCar: 0,
    managementFee: 0, estimatedUtilities: 300000, area: 16, direction: 'Bắc', furniture: false, pets: false,
    availableFrom: null, vacantNow: true, verified: false, vip: false, highTrust: false, status: 'draft', views: 0, rating: 0, reviewCount: 0,
    image: img[4],
    photos: [],
    amenities: [],
    roadWidth: 2.5, carAccess: false, truckAccess: false, sellerId: 's1',
  },
  {
    id: 'vr-0972',
    title: 'Studio Tân Phong bị từ chối',
    roomType: 'Chung cư mini',
    address: 'Gần Lotte Mart Q7',
    houseNumber: '', alley: '', street: 'Nguyễn Hữu Thọ', ward: 'Tân Phong', district: 'Quận 7', city: 'TP. Hồ Chí Minh',
    lat: 10.741, lng: 106.701, rent: 1500000, depositMonths: 1, electricity: 0, electricityType: 'Kinh doanh',
    water: 0, waterType: 'Đầu người', internet: 0, sanitation: 0, parkingBike: 0, parkingCar: 0,
    managementFee: 0, estimatedUtilities: 0, area: 18, direction: 'Tây', furniture: true, pets: false,
    availableFrom: null, vacantNow: true, verified: false, vip: false, highTrust: false, status: 'rejected', views: 12, rating: 0, reviewCount: 0,
    image: img[2],
    photos: [{ src: img[2], label: 'Tổng quan phòng', source: 'host' }],
    amenities: ['Máy lạnh'],
    roadWidth: 5, carAccess: true, truckAccess: false, sellerId: 's1',
    rejectReason: 'Ảnh không đúng thực tế — nghi ảnh mạng. Bảng giá chưa rõ ràng (điện/nước để 0đ). Địa chỉ chung chung.',
    priceAlert: true,
    coordMismatch: true,
  },
]

export function totalMonthly(listing: Listing, people = 1) {
  const water = listing.waterType === 'Đầu người' ? listing.water * people : listing.water * 4 * people
  const elec = listing.electricity * (people === 1 ? 80 : 140)
  return listing.rent + listing.internet + listing.sanitation + listing.parkingBike + listing.managementFee + water + elec
}

export function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
}

export const suggestions = [
  'Thảo Điền, Thủ Đức',
  'Quận 1, TP.HCM',
  'Gần Đại học FPT',
  'Gần bitexco',
  'Quận 7 Tân Phong',
  'Bình Thạnh Điện Biên Phủ',
  'Gần chợ Bến Thành',
  'Khu CNC Thủ Đức',
]

export const amenitiesAround = [
  { name: 'Chợ Thảo Điền', type: 'Chợ', x: 28, y: 62 },
  { name: 'Trạm xe buýt 141', type: 'Xe buýt', x: 62, y: 30 },
  { name: 'THCS Thảo Điền', type: 'Trường học', x: 74, y: 58 },
  { name: 'Công ty ABC', type: 'Công ty', x: 40, y: 22 },
]

export const reviews = [
  { id: 'r1', listingId: 'vr-1052', author: 'Nguyễn Hà', score: 5, photoMatch: 5, landlord: 5, security: 4, hygiene: 5, text: 'Ảnh giống thực tế, chủ nhà phản hồi nhanh. Điện nước đúng bảng giá trên web.', date: '12/09/2026', verifiedStay: true },
  { id: 'r2', listingId: 'vr-1052', author: 'Trần Minh', score: 4, photoMatch: 4, landlord: 4, security: 5, hygiene: 4, text: 'Phòng sạch, hẻm ô tô vào được. Chỉ hơi ồn cuối tuần.', date: '02/08/2026', verifiedStay: true },
  { id: 'r3', listingId: 'vr-1022', author: 'Lê Anh', score: 5, photoMatch: 5, landlord: 5, security: 5, hygiene: 4, text: 'Đã ở 6 tháng. Manager kiểm định đúng như mô tả.', date: '20/07/2026', verifiedStay: true },
]

export const appointments = [
  { id: 'ap-01', listingId: 'vr-1052', listingTitle: 'Căn hộ Lumière Thảo Điền', seller: 'Minh Anh Realty', when: '29/09/2026 · 10:00', status: 'Chờ duyệt' as const, phone: '0903 112 334' },
  { id: 'ap-02', listingId: 'vr-1031', listingTitle: 'The Marq Residences', seller: 'Minh Anh Realty', when: '25/09/2026 · 16:30', status: 'Đã chốt' as const, phone: '0903 112 334' },
  { id: 'ap-03', listingId: 'vr-1018', listingTitle: 'Green Nest Bình Thạnh', seller: 'Green Nest Homes', when: '20/09/2026 · 09:00', status: 'Đã hủy' as const, phone: '0912 445 778' },
]

export const sellerLeads = [
  { id: 'ld-01', name: 'Nguyễn Hà', phone: '0918 334 221', listing: 'Căn hộ Lumière Thảo Điền', when: '29/09/2026 · 10:00', status: 'Chờ xác nhận' },
  { id: 'ld-02', name: 'Phạm Vy', phone: '0902 118 776', listing: 'The Marq Residences', when: '30/09/2026 · 14:00', status: 'Đã chấp nhận' },
  { id: 'ld-03', name: 'Đỗ Khoa', phone: '0933 667 120', listing: 'Sunrise Studio Quận 1', when: '01/10/2026 · 09:30', status: 'Đổi giờ' },
  { id: 'ld-04', name: 'Lê Anh', phone: '0977 445 009', listing: 'Căn hộ Lumière Thảo Điền', when: '24/09/2026 · 18:00', status: 'Đã hủy' },
]

export const reports = [
  { id: 'RP-1048', severity: 'Nghiêm trọng', title: 'Địa chỉ không tồn tại', listing: 'Sunrise Studio · Quận 1', reporter: 'Nguyễn Hà', age: '18 phút trước', reason: 'Sai địa chỉ', tone: 'critical' },
  { id: 'RP-1047', severity: 'Cao', title: 'Chủ trọ đòi thêm phí ẩn ngoài web', listing: 'Lumière Apartment · Thảo Điền', reporter: 'Trần Minh', age: '42 phút trước', reason: 'Phí ẩn', tone: 'high' },
  { id: 'RP-1044', severity: 'Cao', title: 'Đến xem phòng thực tế khác ảnh', listing: 'Green Nest · Bình Thạnh', reporter: 'Lê Anh', age: '2 giờ trước', reason: 'Ảnh ảo', tone: 'high' },
  { id: 'RP-1040', severity: 'Trung bình', title: 'Phòng đã cho thuê từ lâu', listing: 'The Park View · Thủ Đức', reporter: 'Phạm Vy', age: '4 giờ trước', reason: 'Hết phòng', tone: 'medium' },
  { id: 'RP-1038', severity: 'Thấp', title: 'Số điện thoại giả', listing: 'Riverside Home · Quận 7', reporter: 'Đỗ Khoa', age: 'Hôm qua', reason: 'SĐT giả', tone: 'low' },
]

export const sellerRequests = [
  { id: 'SR-220', name: 'Hoàng Đức', phone: '0901 223 887', idNumber: '079204001234', docs: 'Giấy tờ nhà + CCCD', area: 'Quận 9', submitted: '27/09/2026', status: 'Chờ duyệt' },
  { id: 'SR-218', name: 'Mai Phương', phone: '0988 334 112', idNumber: '001199008765', docs: 'Hợp đồng ủy quyền quản lý', area: 'Thủ Đức', submitted: '26/09/2026', status: 'Chờ duyệt' },
  { id: 'SR-210', name: 'Trần Quốc', phone: '0912 778 334', idNumber: '036198004321', docs: 'CCCD (thiếu giấy tờ nhà)', area: 'Bình Thạnh', submitted: '22/09/2026', status: 'Yêu cầu bổ sung' },
]

export const platformUsers = [
  { name: 'Nguyễn Hà', email: 'ha.nguyen@email.vn', role: 'Tenant', area: 'Quận 1', status: 'Đang hoạt động', joined: '18/06/2026' },
  { name: 'Minh Anh Realty', email: 'hello@minhanh.vn', role: 'Seller', area: 'Thủ Đức', status: 'Đang hoạt động', joined: '17/06/2026' },
  { name: 'Mai Linh', email: 'mai.linh@verirent.vn', role: 'Manager', area: 'Quận 9', status: 'Đang hoạt động', joined: '16/06/2026' },
  { name: 'Thanh Sơn', email: 'son.tran@verirent.vn', role: 'Manager', area: 'Bình Thạnh', status: 'Đang hoạt động', joined: '15/06/2026' },
  { name: 'Quang Bùi', email: 'quang.bui@email.vn', role: 'Tenant', area: 'Quận 7', status: 'Đã khóa', joined: '12/06/2026' },
  { name: 'Thảo Nguyễn', email: 'thao.nguyen@verirent.vn', role: 'Admin', area: 'Toàn quốc', status: 'Đang hoạt động', joined: '01/01/2026' },
]

export const transactions = [
  { sys: 'VR-98241', vnpay: 'VNPAY-24098241', seller: 'Minh Anh Realty', amount: 12800000, time: '14/06/2026 · 10:42', status: 'Thành công', method: 'VietQR' },
  { sys: 'VR-98238', vnpay: 'VNPAY-24098238', seller: 'Lumière Apartment', amount: 4500000, time: '14/06/2026 · 09:18', status: 'Đã đối soát', method: 'VNPay-QR' },
  { sys: 'VR-98231', vnpay: 'VNPAY-24098231', seller: 'Green Nest Homes', amount: 8900000, time: '13/06/2026 · 16:05', status: 'Timeout', method: 'VietQR' },
  { sys: 'VR-98196', vnpay: 'VNPAY-24098196', seller: 'The Park View', amount: 2400000, time: '13/06/2026 · 11:27', status: 'Thành công', method: 'VNPay-QR' },
  { sys: 'VR-98170', vnpay: 'VNPAY-24098170', seller: 'Riverside Home', amount: 6700000, time: '12/06/2026 · 18:54', status: 'Hoàn tiền', method: 'VietQR' },
]

export const cashflow = [
  { day: '01/09', inflow: 420, refunds: 14 },
  { day: '05/09', inflow: 510, refunds: 18 },
  { day: '09/09', inflow: 680, refunds: 22 },
  { day: '13/09', inflow: 760, refunds: 19 },
  { day: '17/09', inflow: 820, refunds: 25 },
  { day: '21/09', inflow: 940, refunds: 28 },
  { day: '25/09', inflow: 890, refunds: 16 },
  { day: '28/09', inflow: 1010, refunds: 21 },
]

export const auditLogs = [
  { id: 'AL-901', actor: 'Mai Linh (Manager)', action: 'Phê duyệt tin VR-1052', target: 'Căn hộ Lumière Thảo Điền', time: '28/09/2026 · 14:20', type: 'Duyệt tin' },
  { id: 'AL-900', actor: 'Thảo Nguyễn (Admin)', action: 'Đổi quyền User thường → Seller', target: 'Hoàng Đức', time: '28/09/2026 · 11:04', type: 'Phân quyền' },
  { id: 'AL-898', actor: 'Thanh Sơn (Manager)', action: 'Gỡ khiếu nại RP-1031', target: 'Green Nest Homes', time: '27/09/2026 · 16:48', type: 'Khiếu nại' },
  { id: 'AL-895', actor: 'Thảo Nguyễn (Admin)', action: 'Sửa giá gói VIP 2: 299.000 → 319.000', target: 'Cấu hình hệ thống', time: '27/09/2026 · 09:12', type: 'Biểu phí' },
  { id: 'AL-890', actor: 'Mai Linh (Manager)', action: 'Từ chối tin VR-0972', target: 'Studio Tân Phong', time: '26/09/2026 · 18:33', type: 'Duyệt tin' },
  { id: 'AL-882', actor: 'Thảo Nguyễn (Admin)', action: 'Khóa tài khoản VR-8841', target: 'Quang Bùi', time: '25/09/2026 · 13:01', type: 'Bảo mật' },
]

export const packages = [
  { id: 'standard', name: 'Tin thường', price: 99000, desc: 'Dành cho chủ nhà bắt đầu đăng tin', features: ['Địa chỉ & biểu phí minh bạch', 'Hiển thị 30 ngày', 'Vị trí tìm kiếm tiêu chuẩn'] },
  { id: 'vip', name: 'Tin VIP', price: 299000, desc: 'Đẩy lên đầu trang, nổi bật huy hiệu tin cậy', features: ['Tất cả quyền tin thường', 'Ưu tiên vị trí tìm kiếm', 'Ưu tiên yêu cầu hẹn xem', 'Huy hiệu VIP'], popular: true },
  { id: 'verify', name: 'Gói xác minh tận nơi', price: 799000, desc: 'Manager đến chụp và cấp Verified Badge', features: ['Kiểm tra địa chỉ thực địa', 'Chụp ảnh chuyên nghiệp', 'Đối soát đồng hồ điện/nước', 'Báo cáo thẩm định'] },
]

export const roomTypes: RoomType[] = ['Ký túc xá', 'Phòng trọ khép kín', 'Chung cư mini', 'Căn hộ dịch vụ']
export const amenityCatalog = ['Thang máy', 'Máy lạnh', 'Giờ giấc tự do', 'PCCC đạt chuẩn', 'Máy giặt', 'Ban công', 'Bếp', 'Nội thất đầy đủ', 'Cho nuôi thú cưng', 'Wifi miễn phí']

export function getListing(id: string) {
  return listings.find((l) => l.id === id)
}

export function getSeller(id: string) {
  return sellers.find((s) => s.id === id)
}
