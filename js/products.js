/**
 * VOETEX Streetwear - Mock Products Data
 * ฐานข้อมูลจำลองสินค้าเสื้อผ้าแบรนด์ VOETEX
 */

const PRODUCTS_DATA = [
  {
    id: "VTX-001",
    name: "VOETEX Heavyweight Boxy Tee - 'VOID'",
    subtitle: "เสื้อยืดทรงบ็อกซี่ ผ้าพรีเมียมคอตตอน 260 GSM สกรีนยางนูนหน้าหลัง",
    category: "t-shirts",
    categoryLabel: "เสื้อยืด (T-Shirts)",
    price: 690,
    originalPrice: 1290,
    discount: 46,
    rating: 4.9,
    reviewCount: 342,
    soldCount: 1480,
    isFlashSale: true,
    isMall: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Pitch Black", hex: "#0a0a0a", previewImage: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80" },
      { name: "Bone White", hex: "#f4f4f2", previewImage: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80" },
      { name: "Charcoal Grey", hex: "#333333", previewImage: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["S", "M", "L", "XL", "2XL"],
    stock: 85,
    description: `• ทรง Boxy Oversized ไหล่ตกทันสมัย เข้ากับทุกลุคสตรีท
• ผลิตจากผ้า 100% Comb Cotton Heavyweight หนา 260 GSM เนื้อแน่นแต่นุ่มระบายอากาศดีเยี่ยม
• คอเสื้อทอหนา 1.2 นิ้ว ไม่ย้วยง่ายผ่านการทดสอบซักกว่า 50 ครั้ง
• ลายสกรีน High-density Silkscreen หน้าอกและหลัง คมชัด ไม่แตกหลุดร่อน
• ป้ายทอแท็กซิกเนเจอร์ VOETEX ที่ชายเสื้อด้านซ้าย`,
    sizeGuide: [
      { size: "S", chest: '40"', length: '27"', shoulder: '20"' },
      { size: "M", chest: '44"', length: '28.5"', shoulder: '21.5"' },
      { size: "L", chest: '48"', length: '29.5"', shoulder: '23"' },
      { size: "XL", chest: '52"', length: '30.5"', shoulder: '24.5"' },
      { size: "2XL", chest: '56"', length: '31.5"', shoulder: '26"' }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Tanawat P.",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "2 วันที่แล้ว",
        variation: "Pitch Black, ไซส์ L",
        comment: "เนื้อผ้าดีมากกก หนา นุ่ม ทรงสวยตรงปกเป๊ะ คอเสื้อกระชับดีมาก ใส่แล้วดูหุ่นดี สั่งรอบสองแน่นอนครับ!",
        helpful: 28
      },
      {
        id: 2,
        author: "K. Natthapong S.",
        avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "1 สัปดาห์ที่แล้ว",
        variation: "Bone White, ไซส์ XL",
        comment: "สีขาวสวยมาก ไม่บางจนมองทะลุ งานสกรีนเนี้ยบ สไตล์สตรีทมินิมอล จัดส่งรวดเร็ว ห่อแพ็กเกจจิ้งมาอย่างดี",
        helpful: 15
      }
    ]
  },
  {
    id: "VTX-002",
    name: "VOETEX Monogram Zip-Up Heavy Hoodie",
    subtitle: "เสื้อฮู้ดดี้ซิปหน้าผ้าเฟรนช์เทอร์รี่ 420 GSM บุนุ่ม กันลมกันหนาว",
    category: "hoodies",
    categoryLabel: "เสื้อฮู้ด (Hoodies)",
    price: 1490,
    originalPrice: 2490,
    discount: 40,
    rating: 4.8,
    reviewCount: 198,
    soldCount: 890,
    isFlashSale: true,
    isMall: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Matte Black", hex: "#171717", previewImage: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80" },
      { name: "Heather Ash", hex: "#dcdcdc", previewImage: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["M", "L", "XL", "2XL"],
    stock: 42,
    description: `• ผ้า French Terry Heavyweight 420 GSM นุ่มแน่น น้ำหนักทิ้งตัวสวย
• ซิปเหล็กสองทาง (2-Way Metal YKK Zipper) สามารถรูดเปิดโชว์เสื้อชั้นในได้
• ฮู้ด 2 ชั้น (Double-layered Hood) ทรงตั้งสวยไม่แฟบแบน
• กระเป๋าหน้าจิงโจ้ขนาดใหญ่ พร้อมช่องซ่อนด้านในสำหรับใส่มือถือ
• ปลายแขนและเอวจั๊มยางยืดทอแน่นเป็นพิเศษ`,
    sizeGuide: [
      { size: "M", chest: '46"', length: '27.5"', shoulder: '22"' },
      { size: "L", chest: '50"', length: '28.5"', shoulder: '23.5"' },
      { size: "XL", chest: '54"', length: '29.5"', shoulder: '25"' },
      { size: "2XL", chest: '58"', length: '30.5"', shoulder: '26.5"' }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Arthit K.",
        avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "3 วันที่แล้ว",
        variation: "Matte Black, ไซส์ L",
        comment: "ฮู้ดทรงตั้งสวยมาก ซิปสองทางใช้งานสะดวกสุดๆ คุ้มราคามากครับ",
        helpful: 19
      }
    ]
  },
  {
    id: "VTX-003",
    name: "VOETEX Tactical Multi-Pocket Cargo Pants",
    subtitle: "กางเกงคาร์โก้สตรีทแวร์ทรงขากว้าง พร้อมสายรัดข้อเท้าและกระเป๋าจุใจ",
    category: "pants",
    categoryLabel: "กางเกง (Pants & Cargo)",
    price: 1190,
    originalPrice: 1890,
    discount: 37,
    rating: 4.9,
    reviewCount: 275,
    soldCount: 1120,
    isFlashSale: false,
    isMall: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Stealth Black", hex: "#0f0f0f", previewImage: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80" },
      { name: "Military Shadow", hex: "#2b2b2b", previewImage: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["S (28-30)", "M (31-32)", "L (33-34)", "XL (35-36)", "2XL (37-38)"],
    stock: 55,
    description: `• ผ้า Cotton Ripstop ทนทานต่อการขีดข่วน กันละอองน้ำแบบ Water-repellent
• กระเป๋าใช้งานจริง 8 จุด พร้อมสายคาดยึดสไตล์ Cyberpunk/Techwear
• ปลายขามีเชือกรูด Stopper สามารถปรับเป็นทรงขาปล่อย หรือทรงขารัดข้อจั๊มได้ตามต้องการ
• ขอบเอวยางยืดพร้อมสายรัดหัวเข็มขัดแบบปลดเร็ว Quick-Release Buckle`,
    sizeGuide: [
      { size: "S", chest: '28-30"', length: '39"', shoulder: '42"' },
      { size: "M", chest: '31-32"', length: '40"', shoulder: '44"' },
      { size: "L", chest: '33-34"', length: '41"', shoulder: '46"' },
      { size: "XL", chest: '35-36"', length: '42"', shoulder: '48"' },
      { size: "2XL", chest: '37-38"', length: '43"', shoulder: '50"' }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Chalermchai M.",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "5 วันที่แล้ว",
        variation: "Stealth Black, ไซส์ L (33-34)",
        comment: "กางเกงเท่มากครับ สายรัดกระเป๋าใช้งานได้จริง ปรับปลายขาได้สองแบบ ชอบมาก",
        helpful: 22
      }
    ]
  },
  {
    id: "VTX-004",
    name: "VOETEX Minimalist Oversized Cuban Shirt",
    subtitle: "เสื้อเชิ้ตคอปกคิวบา แขนสั้น ทรงหลวม ผ้าโพลีเรยอนทิ้งตัวพลิ้ว",
    category: "shirts",
    categoryLabel: "เสื้อเชิ้ต (Shirts)",
    price: 790,
    originalPrice: 1390,
    discount: 43,
    rating: 4.7,
    reviewCount: 164,
    soldCount: 760,
    isFlashSale: false,
    isMall: true,
    isBestSeller: false,
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Onyx Black", hex: "#121212", previewImage: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80" },
      { name: "Cream White", hex: "#f8f7f2", previewImage: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 60,
    description: `• ผ้า Poly-Rayon ผสม ผิวสัมผัสเรียบเนียน ยับยาก ระบายอากาศเยี่ยม
• ปกเสื้อแบบ Cuban Collar สไตล์เรโทรโมเดิร์น
• กระดุมปั๊มโลโก้สลักเลเซอร์ VOETEX โทนสีเดียวกับเนื้อผ้า
• แมตช์ง่ายทั้งใส่เดี่ยว หรือใส่คลุมทับเสื้อยืดกล้าม/ยืดขาว`,
    sizeGuide: [
      { size: "S", chest: '42"', length: '28"', shoulder: '19"' },
      { size: "M", chest: '45"', length: '29"', shoulder: '20.5"' },
      { size: "L", chest: '48"', length: '30"', shoulder: '22"' },
      { size: "XL", chest: '52"', length: '31"', shoulder: '23.5"' }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Kittisak R.",
        avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "1 สัปดาห์ที่แล้ว",
        variation: "Cream White, ไซส์ M",
        comment: "เนื้อผ้าดีมาก ไม่ร้อนเลย ใส่ไปคาเฟ่ถ่ายรูปขึ้นกล้องสุดๆ ครับ",
        helpful: 11
      }
    ]
  },
  {
    id: "VTX-005",
    name: "VOETEX Street MA-1 Nylon Bomber Jacket",
    subtitle: "เสื้อแจ็กเก็ตบอมเบอร์ผ้าไนลอนกันน้ำ ซับในบุนวมลายตาราง",
    category: "jackets",
    categoryLabel: "เสื้อแจ็กเก็ต (Jackets)",
    price: 1890,
    originalPrice: 2990,
    discount: 36,
    rating: 4.9,
    reviewCount: 110,
    soldCount: 430,
    isFlashSale: true,
    isMall: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Deep Black", hex: "#0c0c0c", previewImage: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=80" },
      { name: "Silver Grey", hex: "#a8a8a8", previewImage: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["M", "L", "XL"],
    stock: 28,
    description: `• ผ้า Military Grade Ballistic Nylon หนาทน กันละอองฝนและลมหนาว
• มีกระเป๋า Utility Pocket ที่ต้นแขนซ้ายพร้อมริบบิ้นสลัก VOETEX TAG
• ซับในสีดำตัดสลับ เดินเส้นเย็บ Quilted ลายเพชรประณีต
• ซิปกระเป๋าข้างสองจุดมีตัวล็อกแบบ Snap Button`,
    sizeGuide: [
      { size: "M", chest: '48"', length: '26.5"', shoulder: '21"' },
      { size: "L", chest: '51"', length: '27.5"', shoulder: '22.5"' },
      { size: "XL", chest: '54"', length: '28.5"', shoulder: '24"' }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Worawat B.",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "4 วันที่แล้ว",
        variation: "Deep Black, ไซส์ L",
        comment: "ทรงสวยมาก วัสดุดีระดับแบรนด์นอก น้ำหนักกำลังดี ใส่ขับมอเตอร์ไซค์เท่เลย",
        helpful: 14
      }
    ]
  },
  {
    id: "VTX-006",
    name: "VOETEX Industrial Webbing Crossbody Bag",
    subtitle: "กระเป๋าสะพายข้างสตรีทแวร์ กันน้ำ สายถอดปรับระดับได้",
    category: "accessories",
    categoryLabel: "เครื่องประดับ & กระเป๋า",
    price: 590,
    originalPrice: 990,
    discount: 40,
    rating: 4.8,
    reviewCount: 310,
    soldCount: 2150,
    isFlashSale: true,
    isMall: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Black Shadow", hex: "#0e0e0e", previewImage: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80" },
      { name: "Monochrome White", hex: "#e5e5e5", previewImage: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["One Size (Free Size)"],
    stock: 120,
    description: `• ผ้า Cordura 1000D กันน้ำระดับสูง ทนต่อการฉีกขาด
• ช่องเก็บของหลัก 3 ช่อง มีซิปกันน้ำทุกจุด
• ตัวล็อกแม่เหล็กแบบ Fidlock สไตล์เยอรมัน ปลดและล็อกได้ในพริบตา
• สายสะพายสกรีนคำเตือน Typography VOETEX ATELIER`,
    sizeGuide: [
      { size: "Free Size", chest: "กว้าง 28 cm", length: "สูง 18 cm", shoulder: "หนา 8 cm" }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Preecha D.",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "6 วันที่แล้ว",
        variation: "Black Shadow",
        comment: "ใส่ของได้เยอะมาก กระเป๋าตังค์ กุญแจรถ พาวเวอร์แบงค์ จบในใบเดียว เท่มาก",
        helpful: 31
      }
    ]
  },
  {
    id: "VTX-007",
    name: "VOETEX Acid Wash Vintage 'REBEL' Tee",
    subtitle: "เสื้อยืดฟอกลายสนิมสไตล์วินเทจ 90s คอฟิต ผ้านุ่มใส่สบาย",
    category: "t-shirts",
    categoryLabel: "เสื้อยืด (T-Shirts)",
    price: 750,
    originalPrice: 1350,
    discount: 44,
    rating: 4.9,
    reviewCount: 185,
    soldCount: 920,
    isFlashSale: false,
    isMall: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Washed Charcoal", hex: "#2f2f2f", previewImage: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80" },
      { name: "Mineral Grey", hex: "#4a4a4a", previewImage: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["M", "L", "XL", "2XL"],
    stock: 45,
    description: `• ผ่านกรรมวิธี Acid Stone Washed แต่ละตัวจะมีลวดลายฟอกเฉพาะตัวไม่ซ้ำใคร
• ผ้า 100% Ring-Spun Cotton 240 GSM ฟอกนุ่ม ไม่ระคายเคืองผิว
• ทรง Oversized วินเทจสตรีท ไหล่ตกกำลังดี`,
    sizeGuide: [
      { size: "M", chest: '44"', length: '28.5"', shoulder: '21"' },
      { size: "L", chest: '48"', length: '29.5"', shoulder: '22.5"' },
      { size: "XL", chest: '52"', length: '30.5"', shoulder: '24"' },
      { size: "2XL", chest: '56"', length: '31.5"', shoulder: '25.5"' }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Sarun T.",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "3 วันที่แล้ว",
        variation: "Washed Charcoal, ไซส์ L",
        comment: "ลายฟอกสวยมากก ดูพรีเมียมไม่เหมือนงานตามตลาดนัด เนื้อผ้านุ่มมาก",
        helpful: 17
      }
    ]
  },
  {
    id: "VTX-008",
    name: "VOETEX Wide-Leg Parachute Pants",
    subtitle: "กางเกงพาราชูตทรงหลวม ผ้าไมโครไฟเบอร์น้ำหนักเบา สตรีท Y2K",
    category: "pants",
    categoryLabel: "กางเกง (Pants & Cargo)",
    price: 990,
    originalPrice: 1690,
    discount: 41,
    rating: 4.8,
    reviewCount: 220,
    soldCount: 840,
    isFlashSale: false,
    isMall: true,
    isBestSeller: false,
    images: [
      "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Obsidian Black", hex: "#141414", previewImage: "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1000&q=80" },
      { name: "Cloud White", hex: "#fafafa", previewImage: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["S (26-29)", "M (30-32)", "L (33-35)", "XL (36-38)"],
    stock: 50,
    description: `• สไตล์ Y2K Parachute Silhouette ทรงพองเท่ มีดีเทลจับจีบที่หัวเข่า
• ผ้า Microfiber Tech Fabric บางเบา ระบายเหงื่อได้ยอดเยี่ยม แห้งไว
• เอวยางยืดพร้อมสายดึง Stopper ปรับกระชับได้ตามสัดส่วน`,
    sizeGuide: [
      { size: "S", chest: '26-29"', length: '40"', shoulder: '46"' },
      { size: "M", chest: '30-32"', length: '41"', shoulder: '48"' },
      { size: "L", chest: '33-35"', length: '42"', shoulder: '50"' },
      { size: "XL", chest: '36-38"', length: '43"', shoulder: '52"' }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Panuwat E.",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "4 วันที่แล้ว",
        variation: "Obsidian Black, ไซส์ M",
        comment: "ใส่สบายมาก ไม่อึดอัดเลย ขากางเกงพองสวยกำลังดี",
        helpful: 8
      }
    ]
  },
  {
    id: "VTX-009",
    name: "VOETEX Signature Embroidered Beanie",
    subtitle: "หมวกไหมพรมทอแน่น ปักโลโก้โมโนโครมสีดำขาวสุดคลาสสิก",
    category: "accessories",
    categoryLabel: "เครื่องประดับ & กระเป๋า",
    price: 390,
    originalPrice: 690,
    discount: 43,
    rating: 4.9,
    reviewCount: 420,
    soldCount: 3100,
    isFlashSale: true,
    isMall: true,
    isBestSeller: true,
    images: [
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Black Noir", hex: "#000000", previewImage: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1000&q=80" },
      { name: "Pure White", hex: "#ffffff", previewImage: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["One Size (Free Size)"],
    stock: 150,
    description: `• เส้นใย Acrylic 100% ถักทอละเอียด 7-Gauge ยืดหยุ่นคืนรูปได้ดี ไม่คันศีรษะ
• ปักลายโลโก้ VOETEX ด้วยไหมพรีเมียมสีขาว/ดำ คมชัด
• สามารถพับขอบสั้นหรือยาวได้ตามสไตล์การแต่งตัว`,
    sizeGuide: [
      { size: "Free Size", chest: "รอบศีรษะ 54-62 cm", length: "ความสูง 21 cm", shoulder: "-" }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Danuphol W.",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "2 วันที่แล้ว",
        variation: "Black Noir",
        comment: "หมวกใส่สบาย ไม่บีบหัว ทรงสวยมาก ราคาดีสุดๆ",
        helpful: 25
      }
    ]
  },
  {
    id: "VTX-010",
    name: "VOETEX Oversized Raw Denim Trucker Jacket",
    subtitle: "เสื้อแจ็กเก็ตยีนส์ดิบ 14.5 Oz เดินด้ายสีขาวตัดดำ ป้ายหนังแท้",
    category: "jackets",
    categoryLabel: "เสื้อแจ็กเก็ต (Jackets)",
    price: 1990,
    originalPrice: 3200,
    discount: 38,
    rating: 5.0,
    reviewCount: 94,
    soldCount: 310,
    isFlashSale: false,
    isMall: true,
    isBestSeller: false,
    images: [
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80"
    ],
    colors: [
      { name: "Raw Black Denim", hex: "#181818", previewImage: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80" }
    ],
    sizes: ["M", "L", "XL"],
    stock: 25,
    description: `• ผ้ายีนส์ดิบ Cotton 100% น้ำหนัก 14.5 Oz ผ้าแข็งเฟดสวยตามกาลเวลา
• เดินเส้นตะเข็บด้ายสีขาว Contrast สไตล์มินิมอลโมเดิร์น
• กระดุมโลหะรมดำด้าน สลักตรา VOETEX ทุกเม็ด
• ด้านในมีกระเป๋าลับ 2 จุด ซ่อนสัมภาระได้ปลอดภัย`,
    sizeGuide: [
      { size: "M", chest: '48"', length: '26"', shoulder: '21"' },
      { size: "L", chest: '51"', length: '27"', shoulder: '22.5"' },
      { size: "XL", chest: '54"', length: '28"', shoulder: '24"' }
    ],
    reviews: [
      {
        id: 1,
        author: "K. Tossapon J.",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
        rating: 5,
        date: "1 สัปดาห์ที่แล้ว",
        variation: "Raw Black Denim, ไซส์ L",
        comment: "ผ้ายีนส์หนามาก ทรงสวยจริง งานตะเข็บขาวตัดกับผ้ายีนส์ดำเท่สุดๆ คุ้มราคา",
        helpful: 16
      }
    ]
  }
];

// หมวดหมู่สินค้า
const CATEGORIES_DATA = [
  { id: "all", name: "ทั้งหมด", icon: "fa-border-all", count: 10 },
  { id: "t-shirts", name: "เสื้อยืด", icon: "fa-shirt", count: 3 },
  { id: "hoodies", name: "เสื้อฮู้ด", icon: "fa-vest", count: 1 },
  { id: "shirts", name: "เสื้อเชิ้ต", icon: "fa-user-tie", count: 1 },
  { id: "pants", name: "กางเกง & คาร์โก้", icon: "fa-person", count: 2 },
  { id: "jackets", name: "แจ็กเก็ต", icon: "fa-vest-patches", count: 2 },
  { id: "accessories", name: "กระเป๋า & หมวก", icon: "fa-hat-cowboy", count: 2 }
];

// โค้ดส่วนลดของร้านค้า
const VOUCHERS_DATA = [
  {
    code: "VOETEX10",
    name: "ส่วนลด 10% ไม่มีขั้นต่ำ",
    discountPercent: 10,
    minSpend: 0,
    maxDiscount: 500,
    type: "percent",
    description: "ใช้ได้กับสินค้าทุกชิ้นในร้าน"
  },
  {
    code: "FREESHIP",
    name: "โค้ดส่งฟรีทั่วไทย",
    discountAmount: 50,
    minSpend: 500,
    type: "shipping",
    description: "ฟรีค่าจัดส่งเมื่อซื้อครบ 500.-"
  },
  {
    code: "VOETEX100",
    name: "ส่วนลด 100.- เมื่อซื้อครบ 1,200.-",
    discountAmount: 100,
    minSpend: 1200,
    type: "fixed",
    description: "สำหรับคำสั่งซื้อขั้นต่ำ 1,200.-"
  }
];
