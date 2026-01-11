const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin user
  const adminEmail = 'admin@eventmap.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    console.log('Admin user created: admin@eventmap.com / admin123');
  }

  // Create event categories
  const categories = [
    { name: 'Âm nhạc', description: 'Các sự kiện âm nhạc, concert, live show' },
    { name: 'Thể thao', description: 'Các sự kiện thể thao, giải đấu' },
    { name: 'Nghệ thuật', description: 'Triển lãm, gallery, nghệ thuật' },
    { name: 'Hội thảo', description: 'Hội thảo, workshop, seminar' },
    { name: 'Lễ hội', description: 'Lễ hội, festival, sự kiện văn hóa' },
    { name: 'Công nghệ', description: 'Sự kiện công nghệ, IT, startup' },
    { name: 'Giáo dục', description: 'Sự kiện giáo dục, đào tạo' },
    { name: 'Ẩm thực', description: 'Food festival, cooking class' },
    { name: 'Khác', description: 'Các sự kiện khác' },
  ];

  for (const category of categories) {
    await prisma.eventCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  console.log('Event categories created');

  // Create regions (Vietnam provinces/cities)
  const regions = [
    { name: 'Thành phố Hồ Chí Minh', code: 'HCM' },
    { name: 'Hà Nội', code: 'HN' },
    { name: 'Đà Nẵng', code: 'DN' },
    { name: 'Hải Phòng', code: 'HP' },
    { name: 'Cần Thơ', code: 'CT' },
    { name: 'An Giang', code: 'AG' },
    { name: 'Bà Rịa - Vũng Tàu', code: 'BRVT' },
    { name: 'Bắc Giang', code: 'BG' },
    { name: 'Bắc Kạn', code: 'BK' },
    { name: 'Bạc Liêu', code: 'BL' },
    { name: 'Bắc Ninh', code: 'BN' },
    { name: 'Bến Tre', code: 'BT' },
    { name: 'Bình Định', code: 'BD' },
    { name: 'Bình Dương', code: 'BDG' },
    { name: 'Bình Phước', code: 'BP' },
    { name: 'Bình Thuận', code: 'BTH' },
    { name: 'Cà Mau', code: 'CM' },
    { name: 'Cao Bằng', code: 'CB' },
    { name: 'Đắk Lắk', code: 'DL' },
    { name: 'Đắk Nông', code: 'DNO' },
    { name: 'Điện Biên', code: 'DB' },
    { name: 'Đồng Nai', code: 'DN' },
    { name: 'Đồng Tháp', code: 'DT' },
    { name: 'Gia Lai', code: 'GL' },
    { name: 'Hà Giang', code: 'HG' },
    { name: 'Hà Nam', code: 'HNA' },
    { name: 'Hà Tĩnh', code: 'HT' },
    { name: 'Hải Dương', code: 'HD' },
    { name: 'Hậu Giang', code: 'HGI' },
    { name: 'Hòa Bình', code: 'HB' },
    { name: 'Hưng Yên', code: 'HY' },
    { name: 'Khánh Hòa', code: 'KH' },
    { name: 'Kiên Giang', code: 'KG' },
    { name: 'Kon Tum', code: 'KT' },
    { name: 'Lai Châu', code: 'LC' },
    { name: 'Lâm Đồng', code: 'LD' },
    { name: 'Lạng Sơn', code: 'LS' },
    { name: 'Lào Cai', code: 'LO' },
    { name: 'Long An', code: 'LA' },
    { name: 'Nam Định', code: 'ND' },
    { name: 'Nghệ An', code: 'NA' },
    { name: 'Ninh Bình', code: 'NB' },
    { name: 'Ninh Thuận', code: 'NT' },
    { name: 'Phú Thọ', code: 'PT' },
    { name: 'Phú Yên', code: 'PY' },
    { name: 'Quảng Bình', code: 'QB' },
    { name: 'Quảng Nam', code: 'QN' },
    { name: 'Quảng Ngãi', code: 'QNG' },
    { name: 'Quảng Ninh', code: 'QNI' },
    { name: 'Quảng Trị', code: 'QT' },
    { name: 'Sóc Trăng', code: 'ST' },
    { name: 'Sơn La', code: 'SL' },
    { name: 'Tây Ninh', code: 'TN' },
    { name: 'Thái Bình', code: 'TB' },
    { name: 'Thái Nguyên', code: 'TNG' },
    { name: 'Thanh Hóa', code: 'TH' },
    { name: 'Thừa Thiên Huế', code: 'TTH' },
    { name: 'Tiền Giang', code: 'TG' },
    { name: 'Trà Vinh', code: 'TV' },
    { name: 'Tuyên Quang', code: 'TQ' },
    { name: 'Vĩnh Long', code: 'VL' },
    { name: 'Vĩnh Phúc', code: 'VP' },
    { name: 'Yên Bái', code: 'YB' },
  ];

  for (const region of regions) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: {},
      create: region,
    });
  }
  console.log('Regions created');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
