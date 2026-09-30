/**
 * VORTEX Streetwear - Unified Application Core (Web/app.js)
 * รวมระบบจัดการ Authentication, LocalStorage State, Storefront, และ Admin Dashboard
 */

// LocalStorage Keys
const STORAGE_KEYS = {
  USERS: "vortex_users_v1",
  CURRENT_USER: "vortex_current_user_v1",
  PRODUCTS: "vortex_products_v1",
  ORDERS: "vortex_orders_v1",
  CART: "vortex_cart_v1",
  CHATS: "vortex_chats_v1",
  GUEST_SESSION: "vortex_guest_session_v1",
  REVIEWS: "vortex_reviews_v1",
  DELETED_REVIEWS: "vortex_deleted_reviews_v1"
};

// ==========================================================================
// Firebase Cloud Firestore Configuration & Real-Time Sync
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDNXdmDLkZTbiB1cEIeCS17LsP8s1Exkiw",
  authDomain: "vortex-d69e4.firebaseapp.com",
  projectId: "vortex-d69e4",
  storageBucket: "vortex-d69e4.firebasestorage.app",
  messagingSenderId: "327242056746",
  appId: "1:327242056746:web:63d78fe9d39c4477e7af53",
  measurementId: "G-7RGF0WXCMP"
};

let db = null;
try {
  if (typeof firebase !== "undefined") {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log("🔥 VORTEX Connected to Firebase Cloud Firestore successfully!");
  }
} catch (e) {
  console.warn("Firebase initialization warning:", e);
}

let _firestoreSyncInitialized = false;
function initFirestoreSync() {
  if (_firestoreSyncInitialized) return;
  if (!db) {
    if (typeof firebase !== "undefined") {
      try {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
      } catch (e) {}
    }
    if (!db) return;
  }

  _firestoreSyncInitialized = true;
  console.log("🔥 Initializing Firestore Real-Time Synchronization...");

  // 1. Sync Products Real-Time
  db.collection("products").onSnapshot((snapshot) => {
    if (!snapshot.empty) {
      const firestoreProducts = [];
      snapshot.forEach(doc => {
        firestoreProducts.push({ id: doc.id, ...doc.data() });
      });

      firestoreProducts.sort((a, b) => {
        const numA = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
        if (numA > 8 || numB > 8) return numB - numA;
        return numA - numB;
      });

      _inMemoryProductsCache = firestoreProducts;
      state.products = firestoreProducts;

      // บันทึก ID ล่าสุดลง seq
      let maxNum = 0;
      firestoreProducts.forEach(p => {
        const match = String(p.id).match(/VTX-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      if (maxNum > 0) {
        try { localStorage.setItem("vortex_product_seq_v1", String(maxNum)); } catch (e) {}
      }

      saveAllProductsToIDB(firestoreProducts).catch(() => {});
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(firestoreProducts.map(p => ({
          ...p,
          images: p.images ? p.images.map(img => (typeof img === "string" && img.startsWith("data:") ? "__idb__" : img)) : []
        }))));
      } catch (e) {}

      if (typeof renderProducts === "function" && document.getElementById("productsGrid")) {
        applyFiltersAndRender();
      }
      if (typeof renderAdminProductsTable === "function" && document.getElementById("adminProductsTableBody")) {
        renderAdminProductsTable();
        renderAdminStats();
      }
    }
  }, (err) => {
    console.warn("Firestore products sync error:", err);
  });

  // 2. Sync Orders Real-Time
  db.collection("orders").onSnapshot((snapshot) => {
    if (!snapshot.empty) {
      const firestoreOrders = [];
      snapshot.forEach(doc => {
        firestoreOrders.push({ orderId: doc.id, ...doc.data() });
      });

      firestoreOrders.sort((a, b) => (b.orderId || "").localeCompare(a.orderId || ""));
      state.orders = firestoreOrders;

      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(firestoreOrders));
      } catch (e) {}

      if (typeof renderAdminOrdersTable === "function" && document.getElementById("adminOrdersTableBody")) {
        renderAdminOrdersTable();
        renderAdminStats();
      }
    }
  }, (err) => {
    console.warn("Firestore orders sync error:", err);
  });

  // 3. Sync Users Real-Time
  db.collection("users").onSnapshot((snapshot) => {
    if (!snapshot.empty) {
      const firestoreUsers = [];
      snapshot.forEach(doc => {
        firestoreUsers.push({ id: doc.id, ...doc.data() });
      });

      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(firestoreUsers));
      } catch (e) {}

      if (typeof renderAdminUsersTable === "function" && document.getElementById("adminUsersTableBody")) {
        renderAdminUsersTable();
        renderAdminStats();
      }
    }
  }, (err) => {
    console.warn("Firestore users sync error:", err);
  });

  // 4. Sync Reviews Real-Time
  db.collection("reviews").onSnapshot((snapshot) => {
    if (!snapshot.empty) {
      const firestoreReviews = [];
      const deletedIds = getDeletedReviewIds();
      snapshot.forEach(doc => {
        const rev = { id: doc.id, ...doc.data() };
        if (!deletedIds.includes(String(rev.id).trim())) {
          firestoreReviews.push(rev);
        }
      });

      firestoreReviews.sort((a, b) => {
        const numA = parseInt(String(a.id).replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(String(b.id).replace(/\D/g, ""), 10) || 0;
        if (numA > 4 || numB > 4) return numB - numA;
        return numA - numB;
      });

      state.reviews = firestoreReviews;
      try {
        localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(firestoreReviews));
      } catch (e) {}

      if (typeof renderReviews === "function" && document.getElementById("reviewsGrid")) {
        renderReviews();
      }
      if (typeof renderAdminReviewsTable === "function" && document.getElementById("adminReviewsTableBody")) {
        renderAdminReviewsTable();
        renderAdminStats();
      }
    }
  }, (err) => {
    console.warn("Firestore reviews sync error:", err);
  });

  // 5. Sync Chats Real-Time
  db.collection("chats").onSnapshot((snapshot) => {
    const chats = {};
    snapshot.forEach(doc => {
      chats[doc.id] = doc.data().messages || [];
    });

    try {
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
    } catch (e) {}

    if (typeof renderCustomerChatMessages === "function" && state.isCustomerChatOpen) {
      renderCustomerChatMessages();
    }
    if (typeof renderAdminChatCustomerList === "function" && document.getElementById("adminChatCustomerList")) {
      renderAdminChatCustomerList();
      if (state.activeAdminChatCustomerId) {
        renderAdminChatMessages(state.activeAdminChatCustomerId);
      }
    }
  }, (err) => {
    console.warn("Firestore chats sync error:", err);
  });
}

// Initial Seed Data (เริ่มต้นใช้งานเมื่อเปิดเว็บครั้งแรก)
const SEED_USERS = [
  {
    id: "USR-ADMIN",
    name: "Admin VORTEX (ผู้ดูแลระบบ)",
    email: "tawanwat",
    password: "59955995",
    phone: "089-999-9999",
    role: "admin",
    createdAt: "2026-01-01"
  },
  {
    id: "USR-001",
    name: "สมชาย ใจสตรีท",
    email: "user@vortex.com",
    password: "user123",
    phone: "081-234-5678",
    role: "customer",
    createdAt: "2026-01-15"
  }
];

const SEED_PRODUCTS = [
  {
    "id": "VTX-001",
    "name": "VORTEX Heavyweight Boxy Tee - 'VOID'",
    "subtitle": "เสื้อยืดทรงบ็อกซี่ ผ้าพรีเมียมคอตตอน 260 GSM สกรีนยางนูนหน้าหลัง",
    "category": "t-shirts",
    "categoryLabel": "เสื้อยืด (T-Shirts)",
    "price": 690,
    "originalPrice": 1290,
    "discount": 46,
    "rating": 4.9,
    "reviewCount": 342,
    "soldCount": 1480,
    "isFlashSale": true,
    "isMall": true,
    "isBestSeller": true,
    "images": [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80"
    ],
    "colors": [
      {
        "name": "Pitch Black",
        "hex": "#0a0a0a",
        "previewImage": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80"
      },
      {
        "name": "Bone White",
        "hex": "#f4f4f2",
        "previewImage": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80"
      },
      {
        "name": "Charcoal Grey",
        "hex": "#333333",
        "previewImage": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80"
      }
    ],
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL"
    ],
    "stock": 85,
    "description": "• ทรง Boxy Oversized ไหล่ตกทันสมัย เข้ากับทุกลุคสตรีท\n• ผลิตจากผ้า 100% Comb Cotton Heavyweight หนา 260 GSM เนื้อแน่นแต่นุ่มระบายอากาศดีเยี่ยม\n• คอเสื้อทอหนา 1.2 นิ้ว ไม่ย้วยง่ายผ่านการทดสอบซักกว่า 50 ครั้ง\n• ลายสกรีน High-density Silkscreen หน้าอกและหลัง คมชัด ไม่แตกหลุดร่อน\n• ป้ายทอแท็กซิกเนเจอร์ VORTEX ที่ชายเสื้อด้านซ้าย",
    "sizeGuide": [
      {
        "size": "S",
        "chest": "40\"",
        "length": "27\"",
        "shoulder": "20\""
      },
      {
        "size": "M",
        "chest": "44\"",
        "length": "28.5\"",
        "shoulder": "21.5\""
      },
      {
        "size": "L",
        "chest": "48\"",
        "length": "29.5\"",
        "shoulder": "23\""
      },
      {
        "size": "XL",
        "chest": "52\"",
        "length": "30.5\"",
        "shoulder": "24.5\""
      },
      {
        "size": "2XL",
        "chest": "56\"",
        "length": "31.5\"",
        "shoulder": "26\""
      }
    ],
    "reviews": [
      {
        "id": 1,
        "author": "K. Tanawat P.",
        "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
        "rating": 5,
        "date": "2 วันที่แล้ว",
        "variation": "Pitch Black, ไซส์ L",
        "comment": "เนื้อผ้าดีมากกก หนา นุ่ม ทรงสวยตรงปกเป๊ะ คอเสื้อกระชับดีมาก ใส่แล้วดูหุ่นดี สั่งรอบสองแน่นอนครับ!",
        "helpful": 28
      },
      {
        "id": 2,
        "author": "K. Natthapong S.",
        "avatar": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80",
        "rating": 5,
        "date": "1 สัปดาห์ที่แล้ว",
        "variation": "Bone White, ไซส์ XL",
        "comment": "สีขาวสวยมาก ไม่บางจนมองทะลุ งานสกรีนเนี้ยบ สไตล์สตรีทมินิมอล จัดส่งรวดเร็ว ห่อแพ็กเกจจิ้งมาอย่างดี",
        "helpful": 15
      }
    ]
  },
  {
    "id": "VTX-002",
    "name": "VORTEX Monogram Zip-Up Heavy Hoodie",
    "subtitle": "เสื้อฮู้ดดี้ซิปหน้าผ้าเฟรนช์เทอร์รี่ 420 GSM บุนุ่ม กันลมกันหนาว",
    "category": "hoodies",
    "categoryLabel": "เสื้อฮู้ด (Hoodies)",
    "price": 1490,
    "originalPrice": 2490,
    "discount": 40,
    "rating": 4.8,
    "reviewCount": 198,
    "soldCount": 890,
    "isFlashSale": true,
    "isMall": true,
    "isBestSeller": true,
    "images": [
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=80"
    ],
    "colors": [
      {
        "name": "Matte Black",
        "hex": "#171717",
        "previewImage": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80"
      },
      {
        "name": "Heather Ash",
        "hex": "#dcdcdc",
        "previewImage": "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=80"
      }
    ],
    "sizes": [
      "M",
      "L",
      "XL",
      "2XL"
    ],
    "stock": 42,
    "description": "• ผ้า French Terry Heavyweight 420 GSM นุ่มแน่น น้ำหนักทิ้งตัวสวย\n• ซิปเหล็กสองทาง (2-Way Metal YKK Zipper) สามารถรูดเปิดโชว์เสื้อชั้นในได้\n• ฮู้ด 2 ชั้น (Double-layered Hood) ทรงตั้งสวยไม่แฟบแบน\n• กระเป๋าหน้าจิงโจ้ขนาดใหญ่ พร้อมช่องซ่อนด้านในสำหรับใส่มือถือ\n• ปลายแขนและเอวจั๊มยางยืดทอแน่นเป็นพิเศษ",
    "sizeGuide": [
      {
        "size": "M",
        "chest": "46\"",
        "length": "27.5\"",
        "shoulder": "22\""
      },
      {
        "size": "L",
        "chest": "50\"",
        "length": "28.5\"",
        "shoulder": "23.5\""
      },
      {
        "size": "XL",
        "chest": "54\"",
        "length": "29.5\"",
        "shoulder": "25\""
      },
      {
        "size": "2XL",
        "chest": "58\"",
        "length": "30.5\"",
        "shoulder": "26.5\""
      }
    ],
    "reviews": [
      {
        "id": 1,
        "author": "K. Arthit K.",
        "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80",
        "rating": 5,
        "date": "3 วันที่แล้ว",
        "variation": "Matte Black, ไซส์ L",
        "comment": "ฮู้ดทรงตั้งสวยมาก ซิปสองทางใช้งานสะดวกสุดๆ คุ้มราคามากครับ",
        "helpful": 19
      }
    ]
  },
  {
    "id": "VTX-003",
    "name": "VORTEX Tactical Multi-Pocket Cargo Pants",
    "subtitle": "กางเกงคาร์โก้สตรีทแวร์ทรงขากว้าง พร้อมสายรัดข้อเท้าและกระเป๋าจุใจ",
    "category": "pants",
    "categoryLabel": "กางเกง (Pants & Cargo)",
    "price": 1190,
    "originalPrice": 1890,
    "discount": 37,
    "rating": 4.9,
    "reviewCount": 275,
    "soldCount": 1120,
    "isFlashSale": false,
    "isMall": true,
    "isBestSeller": true,
    "images": [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1000&q=80"
    ],
    "colors": [
      {
        "name": "Stealth Black",
        "hex": "#0f0f0f",
        "previewImage": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80"
      },
      {
        "name": "Military Shadow",
        "hex": "#2b2b2b",
        "previewImage": "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1000&q=80"
      }
    ],
    "sizes": [
      "S (28-30)",
      "M (31-32)",
      "L (33-34)",
      "XL (35-36)",
      "2XL (37-38)"
    ],
    "stock": 55,
    "description": "• ผ้า Cotton Ripstop ทนทานต่อการขีดข่วน กันละอองน้ำแบบ Water-repellent\n• กระเป๋าใช้งานจริง 8 จุด พร้อมสายคาดยึดสไตล์ Cyberpunk/Techwear\n• ปลายขามีเชือกรูด Stopper สามารถปรับเป็นทรงขาปล่อย หรือทรงขารัดข้อจั๊มได้ตามต้องการ\n• ขอบเอวยางยืดพร้อมสายรัดหัวเข็มขัดแบบปลดเร็ว Quick-Release Buckle",
    "sizeGuide": [
      {
        "size": "S",
        "chest": "28-30\"",
        "length": "39\"",
        "shoulder": "42\""
      },
      {
        "size": "M",
        "chest": "31-32\"",
        "length": "40\"",
        "shoulder": "44\""
      },
      {
        "size": "L",
        "chest": "33-34\"",
        "length": "41\"",
        "shoulder": "46\""
      },
      {
        "size": "XL",
        "chest": "35-36\"",
        "length": "42\"",
        "shoulder": "48\""
      },
      {
        "size": "2XL",
        "chest": "37-38\"",
        "length": "43\"",
        "shoulder": "50\""
      }
    ],
    "reviews": [
      {
        "id": 1,
        "author": "K. Chalermchai M.",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
        "rating": 5,
        "date": "5 วันที่แล้ว",
        "variation": "Stealth Black, ไซส์ L (33-34)",
        "comment": "กางเกงเท่มากครับ สายรัดกระเป๋าใช้งานได้จริง ปรับปลายขาได้สองแบบ ชอบมาก",
        "helpful": 22
      }
    ]
  },
  {
    "id": "VTX-004",
    "name": "VORTEX Minimalist Oversized Cuban Shirt",
    "subtitle": "เสื้อเชิ้ตคอปกคิวบา แขนสั้น ทรงหลวม ผ้าโพลีเรยอนทิ้งตัวพลิ้ว",
    "category": "shirts",
    "categoryLabel": "เสื้อเชิ้ต (Shirts)",
    "price": 790,
    "originalPrice": 1390,
    "discount": 43,
    "rating": 4.7,
    "reviewCount": 164,
    "soldCount": 760,
    "isFlashSale": false,
    "isMall": true,
    "isBestSeller": false,
    "images": [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80"
    ],
    "colors": [
      {
        "name": "Onyx Black",
        "hex": "#121212",
        "previewImage": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80"
      },
      {
        "name": "Cream White",
        "hex": "#f8f7f2",
        "previewImage": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80"
      }
    ],
    "sizes": [
      "S",
      "M",
      "L",
      "XL"
    ],
    "stock": 60,
    "description": "• ผ้า Poly-Rayon ผสม ผิวสัมผัสเรียบเนียน ยับยาก ระบายอากาศเยี่ยม\n• ปกเสื้อแบบ Cuban Collar สไตล์เรโทรโมเดิร์น\n• กระดุมปั๊มโลโก้สลักเลเซอร์ VORTEX โทนสีเดียวกับเนื้อผ้า\n• แมตช์ง่ายทั้งใส่เดี่ยว หรือใส่คลุมทับเสื้อยืดกล้าม/ยืดขาว",
    "sizeGuide": [
      {
        "size": "S",
        "chest": "42\"",
        "length": "28\"",
        "shoulder": "19\""
      },
      {
        "size": "M",
        "chest": "45\"",
        "length": "29\"",
        "shoulder": "20.5\""
      },
      {
        "size": "L",
        "chest": "48\"",
        "length": "30\"",
        "shoulder": "22\""
      },
      {
        "size": "XL",
        "chest": "52\"",
        "length": "31\"",
        "shoulder": "23.5\""
      }
    ],
    "reviews": [
      {
        "id": 1,
        "author": "K. Kittisak R.",
        "avatar": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&q=80",
        "rating": 5,
        "date": "1 สัปดาห์ที่แล้ว",
        "variation": "Cream White, ไซส์ M",
        "comment": "เนื้อผ้าดีมาก ไม่ร้อนเลย ใส่ไปคาเฟ่ถ่ายรูปขึ้นกล้องสุดๆ ครับ",
        "helpful": 11
      }
    ]
  },
  {
    "id": "VTX-005",
    "name": "VORTEX Street MA-1 Nylon Bomber Jacket",
    "subtitle": "เสื้อแจ็กเก็ตบอมเบอร์ผ้าไนลอนกันน้ำ ซับในบุนวมลายตาราง",
    "category": "jackets",
    "categoryLabel": "เสื้อแจ็กเก็ต (Jackets)",
    "price": 1890,
    "originalPrice": 2990,
    "discount": 36,
    "rating": 4.9,
    "reviewCount": 110,
    "soldCount": 430,
    "isFlashSale": true,
    "isMall": true,
    "isBestSeller": true,
    "images": [
      "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80"
    ],
    "colors": [
      {
        "name": "Deep Black",
        "hex": "#0c0c0c",
        "previewImage": "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=80"
      },
      {
        "name": "Silver Grey",
        "hex": "#a8a8a8",
        "previewImage": "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80"
      }
    ],
    "sizes": [
      "M",
      "L",
      "XL"
    ],
    "stock": 28,
    "description": "• ผ้า Military Grade Ballistic Nylon หนาทน กันละอองฝนและลมหนาว\n• มีกระเป๋า Utility Pocket ที่ต้นแขนซ้ายพร้อมริบบิ้นสลัก VORTEX TAG\n• ซับในสีดำตัดสลับ เดินเส้นเย็บ Quilted ลายเพชรประณีต\n• ซิปกระเป๋าข้างสองจุดมีตัวล็อกแบบ Snap Button",
    "sizeGuide": [
      {
        "size": "M",
        "chest": "48\"",
        "length": "26.5\"",
        "shoulder": "21\""
      },
      {
        "size": "L",
        "chest": "51\"",
        "length": "27.5\"",
        "shoulder": "22.5\""
      },
      {
        "size": "XL",
        "chest": "54\"",
        "length": "28.5\"",
        "shoulder": "24\""
      }
    ],
    "reviews": [
      {
        "id": 1,
        "author": "K. Worawat B.",
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
        "rating": 5,
        "date": "4 วันที่แล้ว",
        "variation": "Deep Black, ไซส์ L",
        "comment": "ทรงสวยมาก วัสดุดีระดับแบรนด์นอก น้ำหนักกำลังดี ใส่ขับมอเตอร์ไซค์เท่เลย",
        "helpful": 14
      }
    ]
  },
  {
    "id": "VTX-006",
    "name": "VORTEX Industrial Webbing Crossbody Bag",
    "subtitle": "กระเป๋าสะพายข้างสตรีทแวร์ กันน้ำ สายถอดปรับระดับได้",
    "category": "accessories",
    "categoryLabel": "เครื่องประดับ & กระเป๋า",
    "price": 590,
    "originalPrice": 990,
    "discount": 40,
    "rating": 4.8,
    "reviewCount": 310,
    "soldCount": 2150,
    "isFlashSale": true,
    "isMall": true,
    "isBestSeller": true,
    "images": [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80"
    ],
    "colors": [
      {
        "name": "Black Shadow",
        "hex": "#0e0e0e",
        "previewImage": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80"
      },
      {
        "name": "Monochrome White",
        "hex": "#e5e5e5",
        "previewImage": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80"
      }
    ],
    "sizes": [
      "One Size (Free Size)"
    ],
    "stock": 120,
    "description": "• ผ้า Cordura 1000D กันน้ำระดับสูง ทนต่อการฉีกขาด\n• ช่องเก็บของหลัก 3 ช่อง มีซิปกันน้ำทุกจุด\n• ตัวล็อกแม่เหล็กแบบ Fidlock สไตล์เยอรมัน ปลดและล็อกได้ในพริบตา\n• สายสะพายสกรีนคำเตือน Typography VORTEX ATELIER",
    "sizeGuide": [
      {
        "size": "Free Size",
        "chest": "กว้าง 28 cm",
        "length": "สูง 18 cm",
        "shoulder": "หนา 8 cm"
      }
    ],
    "reviews": [
      {
        "id": 1,
        "author": "K. Preecha D.",
        "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80",
        "rating": 5,
        "date": "6 วันที่แล้ว",
        "variation": "Black Shadow",
        "comment": "ใส่ของได้เยอะมาก กระเป๋าตังค์ กุญแจรถ พาวเวอร์แบงค์ จบในใบเดียว เท่มาก",
        "helpful": 31
      }
    ]
  },
  {
    "id": "VTX-007",
    "name": "VORTEX Core Retro Sneakers",
    "subtitle": "รองเท้าสนีกเกอร์สไตล์เรโทรสตรีท พื้นยางหนาทนทาน",
    "category": "shoes",
    "categoryLabel": "รองเท้า (Shoes)",
    "price": 2490,
    "originalPrice": 3290,
    "discount": 24,
    "rating": 4.8,
    "reviewCount": 154,
    "soldCount": 630,
    "isFlashSale": false,
    "isMall": true,
    "isBestSeller": true,
    "images": [
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80"
    ],
    "colors": [
      {
        "name": "Vintage White",
        "hex": "#f0f0f0",
        "previewImage": "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80"
      }
    ],
    "sizes": [
      "40",
      "41",
      "42",
      "43",
      "44",
      "45"
    ],
    "stock": 45,
    "description": "• วัสดุหนัง PU เกรดพรีเมียม สัมผัสนุ่ม ทำความสะอาดง่าย\n• พื้นรองเท้าผลิตจากยางสังเคราะห์ทนทาน ยึดเกาะพื้นผิวได้ดีเยี่ยม",
    "sizeGuide": [
      {
        "size": "40",
        "chest": "25 cm",
        "length": "-",
        "shoulder": "-"
      },
      {
        "size": "41",
        "chest": "26 cm",
        "length": "-",
        "shoulder": "-"
      },
      {
        "size": "42",
        "chest": "26.5 cm",
        "length": "-",
        "shoulder": "-"
      },
      {
        "size": "43",
        "chest": "27.5 cm",
        "length": "-",
        "shoulder": "-"
      },
      {
        "size": "44",
        "chest": "28 cm",
        "length": "-",
        "shoulder": "-"
      }
    ],
    "reviews": [
      {
        "id": 1,
        "author": "K. Nattapong T.",
        "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80",
        "rating": 5,
        "date": "2 สัปดาห์ที่แล้ว",
        "variation": "Vintage White, ไซส์ 42",
        "comment": "ใส่สบายมากครับ เดินทั้งวันไม่ปวดเท้า ดีไซน์สวยเข้ากับทุกลุค",
        "helpful": 15
      }
    ]
  },
  {
    "id": "VTX-008",
    "name": "VORTEX Polar Tech Fleece Winter Jacket",
    "subtitle": "เสื้อแจ็กเก็ตฟรีซกันหนาว ทรงหลวม อบอุ่น นุ่มเบา สไตล์เอาท์ดอร์สตรีท",
    "category": "winter",
    "categoryLabel": "เสื้อกันหนาว (Winter)",
    "price": 1690,
    "originalPrice": 2890,
    "discount": 41,
    "rating": 4.9,
    "reviewCount": 168,
    "soldCount": 520,
    "isFlashSale": true,
    "isMall": true,
    "isBestSeller": true,
    "images": [
      "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1000&q=80"
    ],
    "colors": [
      {
        "name": "Cream Oatmeal",
        "hex": "#e8e5dc",
        "previewImage": "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1000&q=80"
      },
      {
        "name": "Deep Charcoal",
        "hex": "#2b2b2b",
        "previewImage": "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1000&q=80"
      }
    ],
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL"
    ],
    "stock": 38,
    "description": "• ผลิตจากผ้า Polar Fleece คุณภาพสูง หนา 320 GSM กักเก็บความอบอุ่นได้ดีเยี่ยม\n• ซับในตาข่ายระบายอากาศ ไม่อับชื้น\n• ซิปหน้าอกพร้อมกระเป๋าซ่อนสำหรับใส่อุปกรณ์พกพา",
    "sizeGuide": [
      {
        "size": "S",
        "chest": "42\"",
        "length": "27\"",
        "shoulder": "21\""
      },
      {
        "size": "M",
        "chest": "46\"",
        "length": "28\"",
        "shoulder": "22\""
      },
      {
        "size": "L",
        "chest": "50\"",
        "length": "29\"",
        "shoulder": "23\""
      },
      {
        "size": "XL",
        "chest": "54\"",
        "length": "30\"",
        "shoulder": "24\""
      }
    ],
    "reviews": [
      {
        "id": 1,
        "author": "K. Arthit C.",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
        "rating": 5,
        "date": "5 วันที่แล้ว",
        "variation": "Cream Oatmeal, ไซส์ L",
        "comment": "อุ่นมากกก ผ้าหนานุ่ม ลุคเกาหลีสตรีทจัดๆ แนะนำเลยครับ",
        "helpful": 22
      }
    ]
  }
];

const SEED_ORDERS = [
  {
    orderId: "VTX-20260916-1001",
    date: "16/09/2026 10:15",
    customerId: "USR-001",
    customerName: "สมชาย ใจสตรีท",
    customerEmail: "user@vortex.com",
    customerPhone: "081-234-5678",
    customerAddress: "456/78 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา, กรุงเทพมหานคร 10110",
    items: [
      { productId: "VTX-001", name: "VORTEX Heavyweight Boxy Tee - 'VOID'", price: 690, quantity: 1, size: "L", color: "Pitch Black" }
    ],
    subtotal: 690,
    shippingCost: 40,
    discount: 0,
    grandTotal: 730,
    shippingMethod: "Standard Delivery",
    paymentMethod: "QR PromptPay",
    status: "กำลังเตรียมจัดส่ง",
    courier: "SPX Express",
    trackingNumber: "SPX-VTX-982341"
  },
  {
    orderId: "VTX-20260916-1002",
    date: "16/09/2026 11:30",
    customerId: "USR-001",
    customerName: "สมชาย ใจสตรีท",
    customerEmail: "user@vortex.com",
    customerPhone: "081-234-5678",
    customerAddress: "456/78 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา, กรุงเทพมหานคร 10110",
    items: [
      { productId: "VTX-002", name: "VORTEX Monogram Zip-Up Heavy Hoodie", price: 1490, quantity: 1, size: "XL", color: "Matte Black" }
    ],
    subtotal: 1490,
    shippingCost: 0,
    discount: 149,
    grandTotal: 1341,
    shippingMethod: "VOETEX Instant Express",
    paymentMethod: "บัตรเครดิต/เดบิต",
    status: "รอชำระเงิน",
    courier: "",
    trackingNumber: ""
  }
];

const CATEGORIES_DATA = [
  { id: "all", name: "ทั้งหมด", icon: "fa-border-all" },
  { id: "winter", name: "เสื้อกันหนาว", icon: "fa-snowflake" },
  { id: "t-shirts", name: "เสื้อยืด", icon: "fa-shirt" },
  { id: "hoodies", name: "เสื้อฮู้ด", icon: "fa-vest" },
  { id: "jackets", name: "แจ็กเก็ต", icon: "fa-vest-patches" },
  { id: "shirts", name: "เสื้อเชิ้ต", icon: "fa-user-tie" },
  { id: "pants", name: "กางเกง & คาร์โก้", icon: "fa-person" },
  { id: "accessories", name: "กระเป๋า & หมวก", icon: "fa-hat-cowboy" },
  { id: "shoes", name: "รองเท้า", icon: "fa-shoe-prints" }
];

const VOUCHERS_DATA = [
  { code: "VORTEX10", name: "ลด 10% ไม่มีขั้นต่ำ", discountPercent: 10, minSpend: 0, maxDiscount: 500, type: "percent" },
  { code: "FREESHIP", name: "ฟรีค่าจัดส่งทุกออเดอร์ (ไม่มีค่าจัดส่ง)", discountAmount: 0, minSpend: 0, type: "shipping" },
  { code: "VORTEX100", name: "ส่วนลด 100.- เมื่อซื้อครบ 1,200.-", discountAmount: 100, minSpend: 1200, type: "fixed" }
];

const SEED_REVIEWS = [
  {
    id: "REV-001",
    name: "k.ฟ้าใส สตรีทเลิฟเวอร์",
    role: "Verified Buyer",
    rating: 5,
    productName: "เสื้อกันหนาว Nike & แจ็กเก็ต Uniqo",
    comment: "ได้รับเสื้อแล้วนะคะ เสื้อสวยมากกก คัตติ้งดีเกินราคา ผ้านุ่มใส่สบายมาก สั่งรอบที่สองแล้ว แอดมินบริการดีน่ารัก ตอบไว ไว้มาอุดหนุนใหม่แน่นอนค่ะ ❤️",
    image: "images/reviews/review_vortex_1.png",
    date: "28 ก.ย. 2026",
    likes: 24,
    avatarBg: "#111111"
  },
  {
    id: "REV-002",
    name: "คุณณภัทร BKK",
    role: "Verified Buyer",
    rating: 5,
    productName: "VORTEX Heavyweight Boxy Tee - 'VOID'",
    comment: "เสื้อทรง Boxy สวยจริง ไหล่ตกกำลังเท่ ลายสกรีนนูนคมชัดมาก คอเสื้อหนาไม่มีย้วย คุ้มค่าเกินราคาครับ จัดส่งวันเดียวถึง",
    image: "images/เสื้อผ้า/S__22102020_0.jpg",
    date: "29 ก.ย. 2026",
    likes: 18,
    avatarBg: "#2563eb"
  },
  {
    id: "REV-003",
    name: "น้องพราว Streetwear",
    role: "Verified Buyer",
    rating: 5,
    productName: "เสื้อกันหนาว JYS",
    comment: "เสื้อกันหนาวสภาพสวยเหมือนใหม่เลยค่ะ จัดส่งไวมาก แพ็กใส่ถุงแบรนด์ VORTEX มาอย่างดี ประทับใจมาก แนะนำเพื่อนมาสั่งต่อแล้วค่า",
    image: "images/เสื้อผ้า/S__22102021_0.jpg",
    date: "30 ก.ย. 2026",
    likes: 15,
    avatarBg: "#ec4899"
  },
  {
    id: "REV-004",
    name: "Nutthapol S.",
    role: "Verified Buyer",
    rating: 5,
    productName: "เสื้อกันหนาว Lee",
    comment: "เนื้อผ้าดีมาก ทรงสวยเป๊ะ ใส่เที่ยวคาเฟ่แล้วเพื่อนทักทุกคน บริการประทับใจ แอดมินให้คำแนะนำไซส์เป๊ะมากครับ",
    image: "images/เสื้อผ้า/S__22102022_0.jpg",
    date: "30 ก.ย. 2026",
    likes: 12,
    avatarBg: "#059669"
  }
];

/* ==========================================================================
   State & Storage Initializer
   ========================================================================== */
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
  } else {
    try {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
      const hasAdmin = users.some(u => u.role === "admin");
      if (!hasAdmin) {
        users.unshift(SEED_USERS[0]);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    } catch (e) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    }
  }

  // Products Init: เก็บ SEED_PRODUCTS เฉพาะกรณีเปิดเว็บครั้งแรกและยังไม่มีข้อมูลในระบบ
  if (localStorage.getItem(STORAGE_KEYS.PRODUCTS) === null) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_PRODUCTS));
    } catch (e) {}
  }
  if (localStorage.getItem(STORAGE_KEYS.ORDERS) === null) {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(SEED_ORDERS));
    } catch (e) {}
  }
  if (localStorage.getItem(STORAGE_KEYS.CART) === null) {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify([]));
    } catch (e) {}
  }
  if (localStorage.getItem(STORAGE_KEYS.CHATS) === null) {
    try {
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify({}));
    } catch (e) {}
  }
  if (localStorage.getItem(STORAGE_KEYS.REVIEWS) === null) {
    try {
      const deletedIds = getDeletedReviewIds();
      const initialReviews = SEED_REVIEWS.filter(r => r && !deletedIds.includes(String(r.id).trim()));
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(initialReviews));
    } catch (e) {}
  }

  // โหลดแคชในหน่วยความจำและเริ่มซิงก์กับ IndexedDB ทันที
  // ถ้า LocalStorage มีแต่ placeholder → ข้าม pre-load รอ IDB แทน
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      const hasIdbPlaceholder = Array.isArray(parsed) && parsed.some(p =>
        p.images && p.images.some && p.images.some(img => img === '__idb__')
      );
      if (!hasIdbPlaceholder) {
        getStoredProducts(); // โหลด cache จาก LocalStorage เฉพาะกรณีไม่มี placeholder
      }
    } else {
      getStoredProducts();
    }
  } catch (e) {
    getStoredProducts();
  }
  syncProductsFromIDB(); // IDB จะ override เสมอเมื่อมีข้อมูล
  initFirestoreSync();   // เริ่มต้นซิงก์ข้อมูลสองทิศทางกับ Cloud Firestore เสมอ
}

// Global App State
const state = {
  currentUser: null,
  products: [],
  filteredProducts: [],
  cart: [],
  orders: [],
  activeAdminChatCustomerId: null,
  isCustomerChatOpen: false,
  selectedCategory: "all",
  searchKeyword: "",
  sortBy: "popular",
  appliedVoucher: null,
  activeBannerIndex: 0,
  currentDetailProduct: null,
  selectedDetailColor: null,
  selectedDetailSize: null,
  detailQuantity: 1,
  selectedPaymentMethod: "promptpay",
  selectedShippingMethod: "standard",
  uploadedSlip: null,
  reviews: [],
  selectedReviewRating: 5,
  reviewUploadedImage: null,
  activeReviewFilter: "all"
};

/* ==========================================================================
   AUTHENTICATION MODULE
   ========================================================================== */
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || SEED_USERS;
  } catch (e) {
    return SEED_USERS;
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) || null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
  state.currentUser = user;
}

function logout() {
  setCurrentUser(null);
  showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 500);
}

function registerUser(name, email, password, phone) {
  const users = getUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return { success: false, message: "อีเมลนี้มีในระบบแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น" };
  }

  const newUser = {
    id: "USR-" + Date.now(),
    name,
    email: email.toLowerCase(),
    password,
    phone: phone || "-",
    role: "customer",
    createdAt: new Date().toISOString().split("T")[0]
  };

  users.push(newUser);
  saveUsers(users);
  if (db) {
    db.collection("users").doc(newUser.id).set(newUser).catch(err => {
      console.error("Firestore registerUser error:", err);
    });
  }
  setCurrentUser(newUser);
  return { success: true, user: newUser };
}

function addUser(userData) {
  const users = getUsers();
  const cleanEmail = String(userData.email || "").toLowerCase().trim();
  
  // ตรวจสอบอีเมลหรือชื่อผู้ใช้ซ้ำ
  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, message: "อีเมลหรือชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว" };
  }

  const newUser = {
    id: "USR-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100),
    name: userData.name.trim(),
    email: cleanEmail,
    password: userData.password ? String(userData.password).trim() : "123456",
    phone: userData.phone ? String(userData.phone).trim() : "-",
    role: userData.role || "customer",
    createdAt: new Date().toISOString().split("T")[0]
  };

  users.push(newUser);
  saveUsers(users);
  if (db) {
    db.collection("users").doc(newUser.id).set(newUser).catch(err => {
      console.error("Firestore addUser error:", err);
    });
  }
  return { success: true, user: newUser };
}

function updateUser(userId, updatedData) {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) {
    return { success: false, message: "ไม่พบข้อมูลสมาชิกในระบบ" };
  }

  const cleanEmail = String(updatedData.email || "").toLowerCase().trim();
  // เช็คอีเมลซ้ำกับสมาชิกรายอื่น
  const emailDuplicate = users.find(u => u.id !== userId && u.email.toLowerCase() === cleanEmail);
  if (emailDuplicate) {
    return { success: false, message: "อีเมลหรือชื่อผู้ใช้นี้ถูกใช้งานแล้วโดยสมาชิกรายอื่น" };
  }

  users[index].name = updatedData.name.trim();
  users[index].email = cleanEmail;
  if (updatedData.phone !== undefined) {
    users[index].phone = String(updatedData.phone).trim() || "-";
  }
  if (updatedData.role) {
    users[index].role = updatedData.role;
  }
  if (updatedData.password && String(updatedData.password).trim() !== "") {
    users[index].password = String(updatedData.password).trim();
  }

  saveUsers(users);
  if (db) {
    db.collection("users").doc(userId).set(users[index]).catch(err => {
      console.error("Firestore updateUser error:", err);
    });
  }

  // หากเป็นผู้ใช้ปัจจุบันที่กำลังล็อกอินอยู่ ให้อัปเดต currentUser ด้วย
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    const updatedCurrent = { ...currentUser, ...users[index] };
    setCurrentUser(updatedCurrent);
    const adminNameEl = document.getElementById("adminUserName");
    if (adminNameEl) adminNameEl.innerText = updatedCurrent.name;
  }

  return { success: true, user: users[index] };
}

function deleteUser(userId) {
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    return { success: false, message: "ไม่สามารถลบบัญชีผู้ดูแลระบบที่กำลังเข้าสู่ระบบอยู่ได้" };
  }

  let users = getUsers();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { success: false, message: "ไม่พบข้อมูลสมาชิกในระบบ" };
  }

  users = users.filter(u => u.id !== userId);
  saveUsers(users);
  if (db) {
    db.collection("users").doc(userId).delete().catch(err => {
      console.error("Firestore deleteUser error:", err);
    });
  }
  return { success: true };
}

function loginUser(email, password) {
  const cleanEmail = String(email || "").toLowerCase().trim();
  const cleanPass = String(password || "").trim();

  const users = getUsers();
  // ตรวจสอบกับข้อมูลสมาชิกในระบบ
  const user = users.find(
    u => u.email.toLowerCase() === cleanEmail && String(u.password).trim() === cleanPass
  );

  if (user) {
    setCurrentUser(user);
    return { success: true, user };
  }

  // กรณีฉุกเฉิน: หากยังไม่มีบัญชีแอดมินในระบบ ให้สร้างและเข้าสู่ระบบด้วยค่าเริ่มต้น tawanwat / 59955995
  const hasAdmin = users.some(u => u.role === "admin");
  if (!hasAdmin && cleanEmail === "tawanwat" && cleanPass === "59955995") {
    const adminUser = {
      id: "USR-ADMIN",
      name: "Admin VORTEX (ผู้ดูแลระบบ)",
      email: "tawanwat",
      password: "59955995",
      phone: "089-999-9999",
      role: "admin",
      createdAt: "2026-01-01"
    };
    users.unshift(adminUser);
    saveUsers(users);
    setCurrentUser(adminUser);
    return { success: true, user: adminUser };
  }

  return { success: false, message: "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง" };
}

/**
 * ฟังก์ชันป้องกัน: บังคับให้เข้าสู่ระบบก่อนทำรายการ
 */
function requireAuth(callback, redirectUrl = "cart") {
  const user = getCurrentUser();
  if (user) {
    if (callback) callback(user);
    return true;
  } else {
    showAuthRequiredModal(redirectUrl);
    return false;
  }
}

function showAuthRequiredModal(redirectUrl = "cart") {
  const existingModal = document.getElementById("authRequiredModal");
  if (existingModal) {
    existingModal.classList.add("open");
    return;
  }

  const modalHtml = `
    <div id="authRequiredModal" class="modal-backdrop open fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="modal-content-box bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 text-center border border-neutral-200">
        <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-2xl text-black mx-auto mb-4 border border-neutral-200">
          <i class="fa-solid fa-lock"></i>
        </div>
        <span class="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">MEMBER REQUIRED</span>
        <h3 class="text-lg font-black text-gray-900 mt-2">กรุณาเข้าสู่ระบบก่อนสั่งซื้อ</h3>
        <p class="text-xs text-gray-500 mt-1 mb-6 leading-relaxed">
          ท่านต้องเข้าสู่ระบบหรือสมัครสมาชิกก่อนทำการสั่งซื้อสินค้าหรือหยิบสินค้าลงตะกร้า เพื่อให้สามารถติดตามพัสดุและบันทึกคำสั่งซื้อได้
        </p>
        <div class="flex flex-col gap-2.5">
          <a href="login.html?redirect=${encodeURIComponent(redirectUrl)}" class="w-full py-3 bg-black hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition shadow">
            <i class="fa-solid fa-arrow-right-to-bracket mr-1"></i> เข้าสู่ระบบ / สมัครสมาชิก
          </a>
          <button onclick="document.getElementById('authRequiredModal').classList.remove('open')" class="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-gray-700 font-semibold text-xs rounded-xl transition">
            ดูสินค้าต่อ
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

/* ==========================================================================
   IMAGE PRE-PROCESSING & COMPRESSION MODULE (Client-Side Canvas)
   รองรับไฟล์ภาพถ่ายจากกล้องมือถือทุกขนาด (10MB, 20MB, 50MB+) ย่อและบีบอัดให้อัตโนมัติ
   ========================================================================== */
function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.70) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("ไม่พบไฟล์รูปภาพ"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("ไม่สามารถโหลดและประมวลผลรูปภาพได้"));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // คำนวณอัตราส่วนเพื่อคงสัดส่วนเดิมไว้
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");

        // ล้างพื้นหลังให้เป็นสีขาว ป้องกันภาพ PNG พื้นหลังใสกลายเป็นสีดำ
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // คุณภาพการย่อภาพที่ดีที่สุด
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        } catch (err) {
          // Fallback ในกรณีฉุกเฉิน
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * ปรับ path รูปภาพให้อยู่ในโฟลเดอร์ images/ หรือ images/เสื้อผ้า/ โดยอัตโนมัติ
 * ป้องกันปัญหารูปภาพกระจายอยู่นอกโฟลเดอร์ หรือใส่ชื่อไฟล์แล้วหาไม่เจอ
 */
function normalizeImagePath(inputPath) {
  if (!inputPath || typeof inputPath !== "string") return "";
  let p = inputPath.trim();
  if (!p) return "";

  // placeholder สำหรับรูปที่อยู่ใน IDB (จะถูก replace เมื่อ IDB sync เสร็จ)
  if (p === '__idb__') return "";

  // ถ้าเป็น URL ภายนอก หรือ base64 dataURL / blob ให้คงไว้ตามเดิม
  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:") || p.startsWith("blob:")) {
    return p;
  }

  // ลบ ./ หรือ / ด้านหน้าออก
  p = p.replace(/^(\.\/|\/)+/, "");

  // ถ้าขึ้นต้นด้วย images/ แล้ว
  if (p.startsWith("images/")) {
    return p;
  }

  // ถ้าขึ้นต้นด้วยโฟลเดอร์ย่อย เช่น เสื้อผ้า/ icons/ slips/ หรือ reviews/ ให้เติม images/ ข้างหน้า
  if (p.startsWith("เสื้อผ้า/") || p.startsWith("icons/") || p.startsWith("slips/") || p.startsWith("reviews/")) {
    return "images/" + p;
  }

  // ถ้าเป็นไฟล์รูปเสื้อผ้า (ขึ้นต้นด้วย S__) ให้ชี้เข้า images/เสื้อผ้า/
  if (p.startsWith("S__")) {
    return "images/เสื้อผ้า/" + p;
  }

  // กรณีอื่นๆ ให้ชี้เข้า images/
  return "images/" + p;
}


/* ==========================================================================
   INDEXEDDB UNLIMITED STORAGE ADAPTER (VortexIDB)
   แก้ปัญหา LocalStorage 5MB Quota Exceeded รองรับการเพิ่มสินค้าและรูปภาพไม่จำกัด
   ========================================================================== */
const VORTEX_IDB_NAME = "vortex_store_db_v2"; // v2: รีเซ็ต database ใหม่สะอาด (ล้างสินค้าเก่าจาก Firestore sync)
const VORTEX_IDB_VERSION = 1;
const VORTEX_IDB_STORE = "products";

let _inMemoryProductsCache = null;
let _idbInstance = null;

function openVortexIDB() {
  if (_idbInstance) return Promise.resolve(_idbInstance);
  return new Promise((resolve) => {
    try {
      if (!window.indexedDB) {
        console.warn("IndexedDB not supported in this environment, using LocalStorage fallback.");
        return resolve(null);
      }
      const request = window.indexedDB.open(VORTEX_IDB_NAME, VORTEX_IDB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(VORTEX_IDB_STORE)) {
          db.createObjectStore(VORTEX_IDB_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = (e) => {
        _idbInstance = e.target.result;
        resolve(_idbInstance);
      };
      request.onerror = (e) => {
        console.warn("Could not open IndexedDB:", e);
        resolve(null);
      };
    } catch (err) {
      console.warn("IndexedDB initialization error:", err);
      resolve(null);
    }
  });
}

async function getAllProductsFromIDB() {
  const db = await openVortexIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(VORTEX_IDB_STORE, "readonly");
      const store = tx.objectStore(VORTEX_IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
}

async function saveAllProductsToIDB(products) {
  const db = await openVortexIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(VORTEX_IDB_STORE, "readwrite");
      const store = tx.objectStore(VORTEX_IDB_STORE);
      store.clear();
      if (Array.isArray(products)) {
        products.forEach(p => {
          if (p && p.id) store.put(p);
        });
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = (err) => {
        console.warn("IndexedDB transaction error:", err);
        resolve(false);
      };
    } catch (err) {
      console.warn("IndexedDB write error:", err);
      resolve(false);
    }
  });
}

async function deleteProductFromIDB(id) {
  const db = await openVortexIDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(VORTEX_IDB_STORE, "readwrite");
      const store = tx.objectStore(VORTEX_IDB_STORE);
      store.delete(String(id).trim());
      tx.oncomplete = () => resolve(true);
      tx.onerror = (err) => {
        console.warn("IndexedDB delete error:", err);
        resolve(false);
      };
    } catch (err) {
      console.warn("IndexedDB delete exception:", err);
      resolve(false);
    }
  });
}

let _hasSyncedFromIDB = false;

async function syncProductsFromIDB() {
  if (_hasSyncedFromIDB) return;
  try {
    const idbProducts = await getAllProductsFromIDB();
    if (idbProducts && Array.isArray(idbProducts) && idbProducts.length > 0) {
      // ✅ IDB เป็น Primary Storage เสมอ — override cache และ state ทุกครั้ง
      // เพราะ LocalStorage อาจ compact รูปภาพทิ้ง (quota exceeded)
      _inMemoryProductsCache = idbProducts;
      state.products = idbProducts;

      let maxNum = 0;
      idbProducts.forEach(p => {
        const match = String(p.id).match(/VTX-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });
      if (maxNum > 0) {
        try { localStorage.setItem("vortex_product_seq_v1", String(maxNum)); } catch (e) {}
      }

      if (typeof renderProducts === "function" && document.getElementById("productsGrid")) {
        applyFiltersAndRender();
      }
      if (typeof renderAdminProductsTable === "function" && document.getElementById("adminProductsTableBody")) {
        renderAdminProductsTable();
        renderAdminStats();
      }
    } else if (idbProducts && idbProducts.length === 0) {
      // IDB ว่างเปล่า — ดึงจาก LocalStorage / Seed แล้วบันทึกกลับเข้า IDB
      const current = getStoredProducts();
      await saveAllProductsToIDB(current);
    }
    _hasSyncedFromIDB = true;
  } catch (err) {
    console.warn("Error syncing products from IndexedDB:", err);
  }
}

/* ==========================================================================
   PRODUCT CRUD MODULE (IndexedDB Unlimited Storage & Memory Sync)
   ========================================================================== */
function getStoredProducts() {
  if (_inMemoryProductsCache !== null && Array.isArray(_inMemoryProductsCache)) {
    return _inMemoryProductsCache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        _inMemoryProductsCache = parsed;
        return _inMemoryProductsCache;
      }
    }
  } catch (e) {
    console.error("Error reading stored products:", e);
  }

  _inMemoryProductsCache = (state.products && Array.isArray(state.products)) ? state.products : [...SEED_PRODUCTS];
  return _inMemoryProductsCache;
}

function saveStoredProducts(products) {
  _inMemoryProductsCache = Array.isArray(products) ? [...products] : [];
  state.products = _inMemoryProductsCache;

  // 1. บันทึกลง IndexedDB เต็มรูปแบบ (Primary Storage — รูปภาพ base64 ปลอดภัยที่นี่)
  saveAllProductsToIDB(_inMemoryProductsCache).catch(err => {
    console.warn("IndexedDB sync warning:", err);
  });

  // 2. บันทึกลง LocalStorage เฉพาะ metadata (ไม่รวม base64) เพื่อใช้โหลดเร็วครั้งแรก
  // รูปภาพจริงจะถูกดึงจาก IndexedDB ใน syncProductsFromIDB() ทุกครั้งที่เปิดหน้า
  try {
    const metaIndex = _inMemoryProductsCache.map(p => {
      const imgs = (p.images && p.images.length > 0) ? p.images.map(img => {
        // เก็บ path ไฟล์ปกติไว้ได้ แต่ถ้าเป็น base64 ให้เก็บแค่ placeholder
        if (typeof img === 'string' && img.startsWith('data:')) {
          return '__idb__'; // placeholder บอกว่ารูปนี้อยู่ใน IDB
        }
        return img;
      }) : [];
      return { ...p, images: imgs };
    });
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(metaIndex));
  } catch (e) {
    // LocalStorage เต็มสุดๆ — ลอง metadata เบาที่สุด
    try {
      const ultraLight = _inMemoryProductsCache.map(p => ({
        id: p.id, name: p.name, category: p.category, categoryLabel: p.categoryLabel,
        price: p.price, originalPrice: p.originalPrice, stock: p.stock,
        sizes: p.sizes, images: (p.images && p.images[0] && !p.images[0].startsWith('data:')) ? [p.images[0]] : ['__idb__']
      }));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(ultraLight));
    } catch (err2) {
      console.warn("LocalStorage exhausted. All data is safely stored in IndexedDB.", err2);
    }
  }
}


function addProduct(data) {
  const products = getStoredProducts();
  let maxNum = 0;

  // ตรวจสอบทั้ง SEED_PRODUCTS, สินค้าปัจจุบันในระบบ และตัวนับ Sequence
  const storedSeq = parseInt(localStorage.getItem("vortex_product_seq_v1") || "0", 10);
  if (!isNaN(storedSeq) && storedSeq > maxNum) maxNum = storedSeq;

  SEED_PRODUCTS.forEach(p => {
    const match = String(p.id).match(/VTX-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  products.forEach(p => {
    const match = String(p.id).match(/VTX-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  try {
    localStorage.setItem("vortex_product_seq_v1", String(nextNum));
  } catch (e) {}

  const id = "VTX-" + String(nextNum).padStart(3, "0");
  const rawImgs = data.images && data.images.length > 0
    ? data.images
    : [data.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80"];
  const imgs = rawImgs.map(normalizeImagePath);
  
  const catLabel = CATEGORIES_DATA.find(c => c.id === data.category)?.name || "สินค้าทั่วไป";
  const newProduct = {
    id,
    name: data.name,
    subtitle: data.subtitle || data.name,
    category: data.category || "t-shirts",
    categoryLabel: catLabel,
    price: Number(data.price),
    originalPrice: Number(data.originalPrice) || Number(data.price),
    discount: data.originalPrice > data.price ? Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100) : 0,
    rating: 5.0,
    reviewCount: 0,
    soldCount: 0,
    isFlashSale: !!data.isFlashSale,
    isMall: true,
    isBestSeller: false,
    images: imgs,
    colors: [
      { name: "Black", hex: "#0a0a0a", previewImage: imgs[0] }
    ],
    sizes: data.sizes && data.sizes.length > 0 ? data.sizes : ["S", "M", "L", "XL", "2XL"],
    stock: Number(data.stock) !== undefined ? Number(data.stock) : 50,
    description: data.description || "• ผลิตจากวัตถุดิบคุณภาพพรีเมียม ดีไซน์สตรีทแวร์ VORTEX\n• สวมใส่สบาย ทรงสวย ทนทาน",
    sizeGuide: [
      { size: "S", chest: '40"', length: '27"', shoulder: '20"' },
      { size: "M", chest: '44"', length: '28.5"', shoulder: '21.5"' },
      { size: "L", chest: '48"', length: '29.5"', shoulder: '23"' },
      { size: "XL", chest: '52"', length: '30.5"', shoulder: '24.5"' },
      { size: "2XL", chest: '56"', length: '31.5"', shoulder: '26"' }
    ],
    reviews: []
  };

  products.unshift(newProduct);
  saveStoredProducts(products);
  if (db) {
    db.collection("products").doc(newProduct.id).set(newProduct).catch(err => {
      console.error("Firestore addProduct error:", err);
    });
  }
  return newProduct;
}

function updateProduct(id, data) {
  const products = getStoredProducts();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;

  const prev = products[index];
  const catLabel = CATEGORIES_DATA.find(c => c.id === (data.category || prev.category))?.name || "สินค้าทั่วไป";
  const updated = {
    ...prev,
    name: data.name || prev.name,
    subtitle: data.subtitle || data.name || prev.subtitle,
    category: data.category || prev.category,
    categoryLabel: catLabel,
    price: Number(data.price) || prev.price,
    originalPrice: Number(data.originalPrice) || prev.originalPrice,
    stock: Number(data.stock) !== undefined ? Number(data.stock) : prev.stock,
    sizes: data.sizes && data.sizes.length > 0 ? data.sizes : prev.sizes,
    description: data.description !== undefined ? data.description : prev.description
  };

  if (data.images && data.images.length > 0) {
    updated.images = data.images.map(normalizeImagePath);
    if (updated.colors && updated.colors[0]) {
      updated.colors[0].previewImage = updated.images[0];
    }
  } else if (data.imageUrl) {
    const normUrl = normalizeImagePath(data.imageUrl);
    updated.images = [normUrl];
    if (updated.colors && updated.colors[0]) {
      updated.colors[0].previewImage = normUrl;
    }
  }

  if (updated.originalPrice > updated.price) {
    updated.discount = Math.round(((updated.originalPrice - updated.price) / updated.originalPrice) * 100);
  } else {
    updated.discount = 0;
  }

  products[index] = updated;
  saveStoredProducts(products);
  if (db) {
    db.collection("products").doc(id).set(updated).catch(err => {
      console.error("Firestore updateProduct error:", err);
    });
  }
  return updated;
}

async function deleteProduct(id) {
  try {
    const cleanId = String(id).trim();
    let products = getStoredProducts();
    products = products.filter(p => String(p.id).trim() !== cleanId);
    
    // 1. อัปเดต Memory และ Global State ทันที
    _inMemoryProductsCache = products;
    state.products = products;
    
    // 2. บันทึกลง LocalStorage
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.warn("LocalStorage save error in deleteProduct:", e);
    }

    // 3. ลบตรงตัวออกจาก IndexedDB และซิงก์รายการที่เหลือ
    await deleteProductFromIDB(cleanId);
    await saveAllProductsToIDB(products);

    // 4. ลบออกจาก Cloud Firestore
    if (db) {
      db.collection("products").doc(cleanId).delete().catch(err => {
        console.error("Firestore deleteProduct error:", err);
      });
    }
    return true;
  } catch (e) {
    console.error("Error deleting product:", e);
    return false;
  }
}

/* ==========================================================================
   ORDER & SHIPMENT MANAGEMENT MODULE
   ========================================================================== */
function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return raw ? JSON.parse(raw) : SEED_ORDERS;
  } catch (e) {
    console.error("Error reading stored orders:", e);
    return state.orders && state.orders.length > 0 ? state.orders : SEED_ORDERS;
  }
}

function saveStoredOrders(orders) {
  state.orders = orders;
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.warn("LocalStorage Quota Exceeded in saveStoredOrders, trimming slip images:", e);
    // หากเกิด QuotaExceededError ให้ตัดรูปสลิปของคำสั่งซื้อที่เก่ากว่า 5 รายการล่าสุดออก เพื่อเซฟพื้นที่
    try {
      const trimmedOrders = orders.slice(0, 50).map((o, idx) => {
        if (idx >= 5 && o.slipImage && o.slipImage.length > 500) {
          return { ...o, slipImage: "[รูปสลิปถูกบีบอัดในประวัติแล้ว]" };
        }
        return o;
      });
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(trimmedOrders));
    } catch (err2) {
      console.error("Critical error saving orders to localStorage:", err2);
    }
  }
}

function createOrder(orderPayload) {
  const orders = getStoredOrders();
  orders.unshift(orderPayload);
  saveStoredOrders(orders);
  if (db) {
    db.collection("orders").doc(orderPayload.orderId).set(orderPayload).catch(err => {
      console.error("Firestore createOrder error:", err);
    });
  }
  return orderPayload;
}

function updateOrderStatus(orderId, newStatus) {
  const orders = getStoredOrders();
  const order = orders.find(o => o.orderId === orderId);
  if (order) {
    order.status = newStatus;
    saveStoredOrders(orders);
    if (db) {
      db.collection("orders").doc(orderId).update({ status: newStatus }).catch(err => {
        console.error("Firestore updateOrderStatus error:", err);
      });
    }
    return true;
  }
  return false;
}

function updateOrderTracking(orderId, trackingNumber, courier) {
  const orders = getStoredOrders();
  const order = orders.find(o => o.orderId === orderId);
  if (order) {
    order.trackingNumber = trackingNumber;
    if (courier) order.courier = courier;
    if (trackingNumber && order.status !== "จัดส่งแล้ว") {
      order.status = "จัดส่งแล้ว";
    }
    saveStoredOrders(orders);
    if (db) {
      db.collection("orders").doc(orderId).update({
        trackingNumber: trackingNumber,
        courier: courier || "",
        status: order.status
      }).catch(err => {
        console.error("Firestore updateOrderTracking error:", err);
      });
    }
    return true;
  }
  return false;
}

function deleteOrder(orderId) {
  let orders = getStoredOrders();
  orders = orders.filter(o => o.orderId !== orderId);
  saveStoredOrders(orders);
  if (db) {
    db.collection("orders").doc(orderId).delete().catch(err => {
      console.error("Firestore deleteOrder error:", err);
    });
  }
  return true;
}

/* ==========================================================================
   CART SYSTEM (LocalStorage)
   ========================================================================== */
function loadCart() {
  try {
    state.cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART)) || [];
  } catch (e) {
    state.cart = [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(state.cart));
  updateCartBadge();
}

function updateCartBadge() {
  const badges = document.querySelectorAll(".cart-count-badge");
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  badges.forEach(badge => {
    badge.innerText = totalItems;
    badge.classList.toggle("hidden", totalItems === 0);
  });
}

/* ==========================================================================
   STOREFRONT CONTROLLER (index.html)
   ========================================================================== */
function initStorefront() {
  initStorage(); // โหลด cache + เริ่ม IDB sync (IDB จะ override state.products เมื่อเสร็จ)
  state.currentUser = getCurrentUser();
  // ใช้ _inMemoryProductsCache ที่โหลดจาก initStorage (จะถูก override โดย IDB sync ทีหลัง)
  state.products = _inMemoryProductsCache || [];
  state.orders = getStoredOrders();
  loadCart();

  updateHeaderAuthUI();
  initBannerCarousel();
  initFlashSaleTimer();
  renderCategories();
  applyFiltersAndRender();
  updateCartBadge();
  setupStorefrontEvents();
  renderVoucherList();
  initScrollReveal();
  initBackToTop();
  initCustomerChat();
  initReviews();
}

function updateHeaderAuthUI() {
  const authContainer = document.getElementById("headerAuthSection");
  if (!authContainer) return;

  const user = state.currentUser;
  if (user) {
    authContainer.innerHTML = `
      <div class="flex items-center gap-2.5">
        <button onclick="openMyOrdersModal()" class="text-xs font-semibold text-gray-700 hover:text-black transition hidden sm:inline flex items-center gap-1">
          <i class="fa-solid fa-box-archive text-[11px]"></i> ออเดอร์ของฉัน
        </button>
        <div class="relative group" id="userMenuContainer">
          <button type="button" onclick="toggleUserDropdown(event)" class="flex items-center gap-2 py-1 px-2.5 rounded-xl hover:bg-neutral-100 transition cursor-pointer select-none">
            <div class="w-7 h-7 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              ${user.name.charAt(0).toUpperCase()}
            </div>
            <span class="text-xs font-bold text-gray-900 hidden sm:inline">${user.name}</span>
            <i class="fa-solid fa-chevron-down text-[10px] text-gray-400 group-hover:text-black transition"></i>
          </button>
          <!-- กล่องครอบ Dropdown มี pt-1.5 เป็นสะพานเชื่อมเมาส์ (Hover Bridge) ทำให้เมาส์ไม่หลุดเวลาเลื่อนลงมากดปุ่ม -->
          <div id="userDropdownMenu" class="absolute right-0 top-full pt-1.5 w-52 hidden group-hover:block z-50 transition-all duration-150">
            <div class="bg-white rounded-2xl shadow-2xl border border-neutral-200 p-2 overflow-hidden">
              <div class="px-3 py-2 border-b border-neutral-100 text-[11px] bg-neutral-50 rounded-xl mb-1">
                <div class="font-bold text-gray-900 truncate">${user.name}</div>
                <div class="text-gray-400 truncate text-[10px]">${user.email}</div>
                <span class="inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-black text-white' : 'bg-neutral-200 text-gray-700'}">${user.role}</span>
              </div>
              <button type="button" onclick="openMyOrdersModal(); closeUserDropdown();" class="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-neutral-100 hover:text-black rounded-xl flex items-center gap-2.5 transition">
                <i class="fa-solid fa-clock-rotate-left text-gray-400 text-xs"></i>
                <span>ประวัติคำสั่งซื้อ</span>
              </button>
              ${user.role === 'admin' ? `
                <a href="admin.html" class="block w-full text-left px-3 py-2 text-xs text-black font-bold hover:bg-neutral-100 rounded-xl flex items-center gap-2.5 transition">
                  <i class="fa-solid fa-sliders text-xs"></i>
                  <span>ระบบหลังบ้าน</span>
                </a>
              ` : ''}
              <div class="my-1 border-t border-neutral-100"></div>
              <button type="button" onclick="logout()" class="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl flex items-center gap-2.5 transition font-semibold">
                <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    authContainer.innerHTML = `
      <div class="flex items-center gap-2">
        <a href="login.html" class="px-3.5 py-1.5 border border-black hover:bg-black hover:text-white text-black text-xs font-bold rounded-lg transition">
          เข้าสู่ระบบ
        </a>
        <a href="login.html?tab=register" class="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-lg transition shadow-xs hidden sm:inline">
          สมัครสมาชิก
        </a>
      </div>
    `;
  }
}

function toggleUserDropdown(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const dropdown = document.getElementById("userDropdownMenu");
  if (dropdown) {
    dropdown.classList.toggle("open-dropdown");
  }
}

function closeUserDropdown() {
  const dropdown = document.getElementById("userDropdownMenu");
  if (dropdown) {
    dropdown.classList.remove("open-dropdown");
  }
}

window.toggleUserDropdown = toggleUserDropdown;
window.closeUserDropdown = closeUserDropdown;

// ปิด Dropdown อัตโนมัติเมื่อคลิกพื้นที่อื่นภายนอก
document.addEventListener("click", (e) => {
  const container = document.getElementById("userMenuContainer");
  if (container && !container.contains(e.target)) {
    closeUserDropdown();
  }
});

function setupStorefrontEvents() {
  // Search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchKeyword = e.target.value.trim().toLowerCase();
      applyFiltersAndRender();
    });
  }

  // Sort
  const sortTabs = document.querySelectorAll(".sort-tab-btn");
  sortTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      sortTabs.forEach((b) => b.classList.remove("active", "bg-black", "text-white"));
      sortTabs.forEach((b) => b.classList.add("bg-white", "text-gray-700", "border-gray-200"));
      
      btn.classList.add("active", "bg-black", "text-white");
      btn.classList.remove("bg-white", "text-gray-700", "border-gray-200");
      
      state.sortBy = btn.getAttribute("data-sort");
      applyFiltersAndRender();
    });
  });

  // Cart Trigger
  document.querySelectorAll(".cart-trigger-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // ไม่ล็อกอินก็เปิดดูตะกร้าได้ แต่ถ้ากดสั่งซื้อจะถูกบังคับล็อกอิน
      openCartDrawer();
    });
  });

  const closeCartBtn = document.getElementById("closeCartBtn");
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);

  const cartBackdrop = document.getElementById("cartBackdrop");
  if (cartBackdrop) {
    cartBackdrop.addEventListener("click", (e) => {
      if (e.target === cartBackdrop) closeCartDrawer();
    });
  }

  const productModalBackdrop = document.getElementById("productDetailModal");
  if (productModalBackdrop) {
    productModalBackdrop.addEventListener("click", (e) => {
      if (e.target === productModalBackdrop) closeProductDetailModal();
    });
  }

  const reviewModalBackdrop = document.getElementById("reviewModal");
  if (reviewModalBackdrop) {
    reviewModalBackdrop.addEventListener("click", (e) => {
      if (e.target === reviewModalBackdrop) closeReviewModal();
    });
  }
}

/* ==========================================================================
   Storefront Product Listing & Details
   ========================================================================== */
function applyFiltersAndRender() {
  state.products = getStoredProducts();
  let result = [...state.products];

  if (state.selectedCategory !== "all") {
    if (state.selectedCategory === "winter") {
      result = result.filter(p => 
        p.category === "winter" || 
        p.category === "hoodies" || 
        p.category === "jackets" ||
        (p.name && (p.name.includes("กันหนาว") || p.name.toLowerCase().includes("hoodie") || p.name.toLowerCase().includes("jacket") || p.name.toLowerCase().includes("fleece"))) ||
        (p.subtitle && p.subtitle.includes("กันหนาว"))
      );
    } else {
      result = result.filter(p => p.category === state.selectedCategory);
    }
  }

  if (state.searchKeyword) {
    result = result.filter(p => 
      (p.name && p.name.toLowerCase().includes(state.searchKeyword)) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(state.searchKeyword)) ||
      (p.categoryLabel && p.categoryLabel.toLowerCase().includes(state.searchKeyword))
    );
  }

  if (state.sortBy === "price-asc") {
    result.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (state.sortBy === "price-desc") {
    result.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (state.sortBy === "latest") {
    result.sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")));
  } else {
    // ยอดนิยม / สินค้าขายดี
    result.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
  }

  state.filteredProducts = result;
  renderProducts();

  const countEl = document.getElementById("productCountText");
  if (countEl) countEl.innerText = `พบสินค้า ${result.length} รายการ`;
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (!state.filteredProducts || state.filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-3xl text-gray-400 mb-3">
          <i class="fa-solid fa-shirt"></i>
        </div>
        <h3 class="text-sm font-bold text-gray-800">ไม่พบสินค้าที่คุณค้นหา</h3>
        <p class="text-xs text-gray-500 mt-1">ลองค้นหาด้วยคำอื่น หรือคลิกดูสินค้าทั้งหมด</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.filteredProducts.map(p => {
    const isOutOfStock = Number(p.stock) <= 0;
    const imgUrl = normalizeImagePath((p.images && p.images[0]) || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80');
    const catDisplay = (p.categoryLabel || p.category || "สินค้าทั่วไป").split(" ")[0];
    const priceNum = Number(p.price || 0);
    const origPriceNum = Number(p.originalPrice || 0);

    return `
    <div onclick="${isOutOfStock ? '' : `openProductDetail('${p.id}')`}" class="product-card group relative${isOutOfStock ? ' cursor-not-allowed' : ''}">
      <div class="product-image-wrap">
        <img src="${imgUrl}" alt="${p.name || 'สินค้า'}" loading="lazy" class="${isOutOfStock ? 'grayscale opacity-50' : ''}" />
        <div class="absolute top-2 left-2 flex flex-col gap-1 z-10">
          ${p.isMall ? '<span class="badge-mall shimmer-badge border border-neutral-700 shadow-sm"><i class="fa-solid fa-crown text-[9px] text-yellow-400"></i> ATELIER</span>' : ''}
          ${p.isBestSeller ? '<span class="bg-black text-white border border-neutral-700 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase shadow-xs">LIMITED</span>' : ''}
        </div>
        ${isOutOfStock
          ? `<!-- Sold Out Overlay + Badge -->
             <div class="absolute inset-0 z-10 bg-white/30 rounded-t-xl pointer-events-none"></div>
             <div class="absolute top-2 right-2 z-20">
               <span class="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md shadow-lg tracking-wide uppercase">
                 <i class="fa-solid fa-ban text-[9px]"></i> ขายหมดแล้ว
               </span>
             </div>`
          : `${p.discount ? `<div class="absolute top-2 right-2 z-10"><span class="badge-discount">-${p.discount}%</span></div>` : ''}
             <div class="absolute inset-x-2 bottom-2 z-10 opacity-100 translate-y-0 sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1.5">
                <button onclick="event.stopPropagation(); openProductDetail('${p.id}')" class="flex-1 py-2 bg-white/95 hover:bg-white text-black font-extrabold rounded-lg text-[11px] shadow-sm flex items-center justify-center gap-1 backdrop-blur-md transition border border-white/50 active:scale-95">
                  <i class="fa-regular fa-eye text-xs"></i>
                  <span>ดูสินค้า</span>
                </button>
                <button onclick="quickAddToCart(event, '${p.id}')" class="flex-1 py-2 bg-black hover:bg-neutral-800 text-white font-extrabold rounded-lg text-[11px] shadow-sm flex items-center justify-center gap-1 backdrop-blur-md transition border border-white/20 active:scale-95">
                  <i class="fa-solid fa-cart-plus text-xs text-yellow-400"></i>
                  <span>ใส่ตะกร้า</span>
                </button>
              </div>`
        }
      </div>
      <div class="p-3 flex-1 flex flex-col justify-between">
        <div>
          <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">${catDisplay}</span>
          <h3 class="text-xs sm:text-sm font-medium ${isOutOfStock ? 'text-gray-400' : 'text-gray-900'} line-clamp-2 mt-0.5 leading-snug group-hover:text-black">${p.name || ''}</h3>
        </div>
        <div class="mt-3">
          <div class="flex items-baseline gap-1.5">
            <span class="text-sm sm:text-base font-bold ${isOutOfStock ? 'text-gray-400' : 'text-black'} font-sans">฿${priceNum.toLocaleString()}</span>
            ${origPriceNum > priceNum ? `<span class="text-[11px] text-gray-400 line-through">฿${origPriceNum.toLocaleString()}</span>` : ''}
          </div>
          <div class="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <div class="flex items-center gap-1 text-amber-500 font-medium">
              <i class="fa-solid fa-star text-[10px]"></i>
              <span>${p.rating || 5.0}</span>
            </div>
            ${isOutOfStock
              ? `<span class="text-red-500 font-bold text-[10px]">สินค้าหมด</span>`
              : `<span>ขายแล้ว ${p.soldCount || 0} ชิ้น</span>`
            }
          </div>
        </div>
      </div>
    </div>
  `}).join("");
}

function openProductDetail(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.currentDetailProduct = product;
  state.selectedDetailColor = product.colors && product.colors[0] ? product.colors[0] : { name: "Standard", hex: "#000" };
  state.selectedDetailSize = product.sizes && product.sizes[0] ? product.sizes[0] : "Free Size";
  state.detailQuantity = 1;

  const modal = document.getElementById("productDetailModal");
  if (!modal) return;

  const isOutOfStock = Number(product.stock) <= 0;
  const priceNum = Number(product.price || 0);
  const origPriceNum = Number(product.originalPrice || 0);

  document.getElementById("modalProductTitle").innerText = product.name || "";
  document.getElementById("modalProductSubtitle").innerText = product.subtitle || "";
  document.getElementById("modalProductPrice").innerText = `฿${priceNum.toLocaleString()}`;
  document.getElementById("modalProductOriginalPrice").innerText = origPriceNum > priceNum ? `฿${origPriceNum.toLocaleString()}` : "";
  document.getElementById("modalProductDiscount").innerText = product.discount ? `-${product.discount}%` : "";
  document.getElementById("modalProductDiscount").classList.toggle("hidden", !product.discount);

  // แสดงสต็อก / ป้ายสินค้าหมด
  const stockEl = document.getElementById("modalProductStock");
  if (stockEl) {
    if (isOutOfStock) {
      stockEl.innerHTML = `<span class="inline-flex items-center gap-1 bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full text-[11px]"><i class="fa-solid fa-ban text-[9px]"></i> สินค้าหมด</span>`;
    } else {
      stockEl.innerText = `${product.stock} ชิ้น`;
    }
  }

  const descEl = document.getElementById("modalProductDescription");
  if (descEl) {
    descEl.innerHTML = (product.description || "• สินค้าคุณภาพพรีเมียมจาก VORTEX").replace(/\n/g, "<br>");
  }

  const qtyInput = document.getElementById("modalDetailQty");
  if (qtyInput) {
    qtyInput.value = 1;
    qtyInput.disabled = isOutOfStock;
  }

  // Disable/Enable quantity controls
  const qtyBtns = document.querySelectorAll(".qty-step-btn");
  qtyBtns.forEach(b => { b.disabled = isOutOfStock; });

  // Disable/Enable ปุ่มซื้อและปุ่มเพิ่มตะกร้า
  const addCartBtn = document.getElementById("modalAddCartBtn");
  const buyNowBtn = document.getElementById("modalBuyNowBtn");
  if (addCartBtn) {
    addCartBtn.disabled = isOutOfStock;
    if (isOutOfStock) {
      addCartBtn.className = "w-full py-3.5 px-4 bg-neutral-200 text-neutral-400 border-2 border-neutral-300 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-60";
      addCartBtn.innerHTML = '<i class="fa-solid fa-ban text-sm"></i> <span class="font-bold">สินค้าหมด</span>';
    } else {
      addCartBtn.className = "w-full py-3.5 px-4 bg-white hover:bg-neutral-100 active:scale-[0.98] text-black border-2 border-black font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer";
      addCartBtn.innerHTML = '<i class="fa-solid fa-cart-plus text-base text-black"></i> <span class="font-extrabold tracking-wide">เพิ่มไปยังรถเข็น</span>';
    }
  }
  if (buyNowBtn) {
    buyNowBtn.disabled = isOutOfStock;
    if (isOutOfStock) {
      buyNowBtn.className = "w-full py-3.5 px-4 bg-neutral-300 text-neutral-400 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-60 pointer-events-none";
      buyNowBtn.innerHTML = '<span class="font-bold">ไม่พร้อมจำหน่าย</span>';
    } else {
      buyNowBtn.className = "w-full py-3.5 px-4 bg-black hover:bg-neutral-800 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer";
      buyNowBtn.innerHTML = '<i class="fa-solid fa-bolt text-base text-yellow-400"></i> <span class="font-extrabold tracking-wide">ซื้อสินค้าตอนนี้</span>';
    }
  }

  const pImages = (product.images && product.images.length > 0) ? product.images.map(normalizeImagePath) : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'];
  const mainImage = document.getElementById("modalMainImage");
  if (mainImage) {
    mainImage.src = pImages[0];
    if (isOutOfStock) {
      mainImage.classList.add("grayscale", "opacity-70");
    } else {
      mainImage.classList.remove("grayscale", "opacity-70");
    }
  }

  const thumbContainer = document.getElementById("modalThumbnails");
  if (thumbContainer) {
    thumbContainer.innerHTML = pImages.map((img, idx) => `
      <button onclick="changeModalMainImage('${img}', this)" class="thumb-btn w-14 h-14 rounded border-2 ${idx === 0 ? 'border-black' : 'border-transparent'} overflow-hidden hover:opacity-80 transition">
        <img src="${img}" class="w-full h-full object-cover"/>
      </button>
    `).join("");
  }

  const sizeContainer = document.getElementById("modalSizesContainer");
  if (sizeContainer) {
    sizeContainer.innerHTML = (product.sizes || ["S", "M", "L", "XL", "2XL"]).map((s, idx) => `
      <button onclick="${isOutOfStock ? '' : `selectModalSize('${s}')`}" class="variant-btn size-option-btn ${idx === 0 ? 'selected' : ''} ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''}" data-size="${s}" ${isOutOfStock ? 'disabled' : ''}>
        ${s}
      </button>
    `).join("");
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeProductDetailModal() {
  const modal = document.getElementById("productDetailModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

function changeModalMainImage(src, btnEl) {
  const mainImage = document.getElementById("modalMainImage");
  if (mainImage) mainImage.src = src;

  const thumbs = document.querySelectorAll(".thumb-btn");
  thumbs.forEach(t => t.classList.replace("border-black", "border-transparent"));
  if (btnEl) btnEl.classList.replace("border-transparent", "border-black");
}

function selectModalSize(size) {
  state.selectedDetailSize = size;
  const buttons = document.querySelectorAll(".size-option-btn");
  buttons.forEach(btn => {
    btn.classList.toggle("selected", btn.getAttribute("data-size") === size);
  });
}

function stepModalQty(delta) {
  const input = document.getElementById("modalDetailQty");
  if (!input) return;
  let val = parseInt(input.value, 10) || 1;
  val = Math.max(1, Math.min(state.currentDetailProduct?.stock || 99, val + delta));
  input.value = val;
  state.detailQuantity = val;
}

/* ==========================================================================
   Storefront Cart Actions (With Auth Guards)
   ========================================================================== */

/**
 * Web Audio API: เล่นเสียง Chime สดใสเบาๆ เมื่อสินค้าเด้งเข้าตะกร้า
 */
function playAddToCartSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    // Autoplay policy fallback
  }
}

/**
 * Flying animation: ทำให้รูปสินค้าบินไปหาไอคอนตะกร้าในหัว
 * ใช้ CSS transition + transform สำหรับ performance ที่ดี
 * @param {string} imgSrc - URL ของรูปสินค้า
 * @param {DOMRect|null} originRect - ตำแหน่งต้นทาง (จาก button หรือ modal)
 * @param {function} onComplete - callback เมื่อ animation เสร็จ
 */
function flyCartAnimation(imgSrc, originRect, onComplete) {
  const cartBtn = document.querySelector('.cart-trigger-btn');
  if (!cartBtn || !originRect) {
    if (onComplete) onComplete();
    return;
  }

  const targetRect = cartBtn.getBoundingClientRect();
  const size = Math.min(originRect.width, originRect.height, 90);

  // จุดเริ่มต้น (กลางของ origin element)
  const startX = originRect.left + originRect.width / 2 - size / 2;
  const startY = originRect.top + originRect.height / 2 - size / 2;

  // สร้าง flying image — วางที่ตำแหน่ง fixed เริ่มต้น
  const flyImg = document.createElement('img');
  flyImg.src = imgSrc;
  flyImg.className = 'cart-fly-img';
  flyImg.style.cssText = `
    left: ${startX}px;
    top: ${startY}px;
    width: ${size}px;
    height: ${size}px;
    transform: scale(1) rotate(0deg);
    opacity: 1;
    transition: none;
  `;
  document.body.appendChild(flyImg);

  // Force reflow
  void flyImg.offsetWidth;

  // Phase 1: Pop up เล็กน้อย
  flyImg.style.transition = 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)';
  flyImg.style.transform = 'scale(1.15) rotate(-4deg)';

  setTimeout(() => {
    // Phase 2: บินไปหาตะกร้า โดยใช้ translate ไปยังจุดปลาย
    const dx = (targetRect.left + targetRect.width / 2) - (startX + size / 2);
    const dy = (targetRect.top + targetRect.height / 2) - (startY + size / 2);

    flyImg.style.transition = 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.55s ease';
    flyImg.style.transform = `translate(${dx}px, ${dy}px) scale(0.12) rotate(18deg)`;
    flyImg.style.opacity = '0';

    setTimeout(() => {
      flyImg.remove();

      // Bounce badge
      const badge = document.querySelector('.cart-count-badge');
      if (badge) {
        badge.classList.remove('badge-pop');
        void badge.offsetWidth;
        badge.classList.add('badge-pop');
        setTimeout(() => badge.classList.remove('badge-pop'), 500);
      }

      // Shake cart icon & pulse
      const cartButtons = document.querySelectorAll('.cart-trigger-btn');
      cartButtons.forEach(btn => {
        btn.classList.remove('cart-trigger-pulse');
        void btn.offsetWidth;
        btn.classList.add('cart-trigger-pulse');
        setTimeout(() => btn.classList.remove('cart-trigger-pulse'), 800);
      });

      const icon = document.querySelector('.cart-trigger-btn i.fa-bag-shopping');
      if (icon) {
        icon.classList.remove('cart-icon-shake');
        void icon.offsetWidth;
        icon.classList.add('cart-icon-shake');
        setTimeout(() => icon.classList.remove('cart-icon-shake'), 600);
      }

      if (onComplete) onComplete();
    }, 580);
  }, 130);
}

function quickAddToCart(event, productId) {
  event.stopPropagation();
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  if (product.stock <= 0) {
    showToast("สินค้าหมดแล้ว ไม่สามารถเพิ่มลงตะกร้าได้", "warning");
    return;
  }

  // จับตำแหน่ง origin ของปุ่มที่กด
  const btnEl = event.currentTarget || event.target;
  const originRect = btnEl ? btnEl.getBoundingClientRect() : null;

  // Visual feedback ทันทีที่ปุ่ม: เปลี่ยนเป็นสีเขียว + เด้งเข้าตะกร้าแล้ว!
  if (btnEl) {
    const originalHtml = btnEl.innerHTML;
    btnEl.classList.add("btn-just-added");
    btnEl.innerHTML = `<i class="fa-solid fa-circle-check text-white"></i> <span>เด้งเข้าตะกร้าแล้ว!</span>`;
    setTimeout(() => {
      btnEl.classList.remove("btn-just-added");
      btnEl.innerHTML = originalHtml;
    }, 700);
  }

  // เล่นเสียงแจ้งเตือน
  playAddToCartSound();

  // เพิ่มสินค้าลงตะกร้าทันที (สามารถหยิบใส่ตะกร้าได้ทันที และจะยืนยันล็อกอินเมื่อกดชำระเงิน)
  const cartItemId = addToCartItem({
    productId: product.id,
    name: product.name,
    price: product.price,
    image: product.images[0],
    color: product.colors && product.colors[0] ? product.colors[0].name : "Standard",
    size: product.sizes && product.sizes[0] ? product.sizes[0] : "Free Size",
    quantity: 1,
    selected: true
  });

  // เด้งเปิดหน้าตะกร้าสินค้าทันที ให้เห็นว่าสินค้าเด้งเข้าตะกร้าแล้ว
  openCartDrawer(cartItemId);
  showToast(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`, "success");

  // เล่น flying animation เสริมเพื่อความสวยงาม
  if (originRect) {
    flyCartAnimation(product.images[0], originRect);
  }
}

function handleAddDetailToCart() {
  if (!state.currentDetailProduct) return;
  const p = state.currentDetailProduct;

  if (p.stock <= 0) {
    showToast("สินค้าหมดแล้ว ไม่สามารถเพิ่มลงตะกร้าได้", "warning");
    return;
  }

  // หา origin จากปุ่มหรือรูปในโมดัล
  const modalImg = document.getElementById('modalMainImage') || document.querySelector('#productDetailModal img');
  const addBtn = document.getElementById('modalAddCartBtn');
  const originRect = modalImg ? modalImg.getBoundingClientRect() : (addBtn ? addBtn.getBoundingClientRect() : null);

  // Visual feedback ที่ปุ่ม
  if (addBtn) {
    const origHtml = addBtn.innerHTML;
    addBtn.classList.add("btn-just-added");
    addBtn.innerHTML = `<i class="fa-solid fa-circle-check text-white"></i> <span>เด้งเข้าตะกร้าแล้ว!</span>`;
    setTimeout(() => {
      addBtn.classList.remove("btn-just-added");
      addBtn.innerHTML = origHtml;
    }, 600);
  }

  // เล่นเสียงแจ้งเตือน
  playAddToCartSound();

  // เพิ่มสินค้าลงตะกร้าทันที
  const cartItemId = addToCartItem({
    productId: p.id,
    name: p.name,
    price: p.price,
    image: normalizeImagePath(p.images[0]),
    color: state.selectedDetailColor?.name || "Standard",
    size: state.selectedDetailSize || (p.sizes && p.sizes[0] ? p.sizes[0] : "L"),
    quantity: state.detailQuantity,
    selected: true
  });

  // ปิด modal รายละเอียดสินค้า
  closeProductDetailModal();

  // เด้งเปิดหน้าตะกร้าสินค้าทันที เพื่อให้เห็นสินค้าที่เพิ่งเด้งเข้าตะกร้า
  openCartDrawer(cartItemId);
  showToast(`เพิ่ม "${p.name}" (ไซส์ ${state.selectedDetailSize || "L"}) ลงในตะกร้าแล้ว`, "success");

  // เล่น animation สินค้าบินเสริม
  if (originRect) {
    flyCartAnimation(normalizeImagePath(p.images[0]), originRect);
  }
}

function handleBuyNow() {
  if (!state.currentDetailProduct) return;
  const p = state.currentDetailProduct;

  if (p.stock <= 0) {
    showToast("สินค้าหมดแล้ว ไม่สามารถสั่งซื้อได้", "warning");
    return;
  }

  const buyBtn = document.getElementById('modalBuyNowBtn');
  if (buyBtn) {
    buyBtn.classList.add("btn-just-added");
    setTimeout(() => buyBtn.classList.remove("btn-just-added"), 600);
  }

  // เล่นเสียงแจ้งเตือน
  playAddToCartSound();

  // เมื่อกดซื้อสินค้า ให้ยกเลิกการเลือกรายการอื่น เพื่อเตรียมสั่งซื้อสินค้านี้ชิ้นเดียว
  state.cart.forEach(item => item.selected = false);

  const cartItemId = addToCartItem({
    productId: p.id,
    name: p.name,
    price: p.price,
    image: normalizeImagePath(p.images[0]),
    color: state.selectedDetailColor?.name || "Standard",
    size: state.selectedDetailSize || (p.sizes && p.sizes[0] ? p.sizes[0] : "L"),
    quantity: state.detailQuantity,
    selected: true
  });

  // ปิด modal รายละเอียดสินค้า
  closeProductDetailModal();

  // เด้งไปหน้าตะกร้าสินค้าทันที พร้อมไฮไลต์สินค้าที่เตรียมซื้อ
  openCartDrawer(cartItemId);
  showToast(`เพิ่ม "${p.name}" พร้อมชำระเงินในตะกร้าแล้ว`, "info");
}

function addToCartItem(newItem) {
  const existingIndex = state.cart.findIndex(
    item => item.productId === newItem.productId && item.size === newItem.size
  );

  let targetId;
  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += newItem.quantity;
    state.cart[existingIndex].selected = true;
    targetId = state.cart[existingIndex].id;
  } else {
    targetId = "CART_" + Date.now();
    state.cart.push({
      id: targetId,
      ...newItem
    });
  }

  saveCart();
  return targetId;
}

function openCartDrawer(highlightTarget = true) {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("cartBackdrop");

  renderCart(highlightTarget);

  if (drawer) {
    drawer.classList.add("drawer-open");
    if (backdrop) {
      backdrop.classList.add("open");
    }
    document.body.style.overflow = "hidden";

    // เพิ่ม bounce animation ที่ drawer content เมื่อเปิดตะกร้า
    const drawerContent = drawer.querySelector('.drawer-content');
    if (drawerContent) {
      drawerContent.classList.remove('drawer-bounce');
      void drawerContent.offsetWidth;
      drawerContent.classList.add('drawer-bounce');
      setTimeout(() => drawerContent.classList.remove('drawer-bounce'), 800);
    }
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("cartBackdrop");
  if (drawer) {
    drawer.classList.remove("drawer-open");
  }
  if (backdrop) {
    backdrop.classList.remove("open");
  }
  document.body.style.overflow = "";
}

function renderCart(highlightTarget = false) {
  const container = document.getElementById("cartItemsList");
  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center">
        <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl mx-auto mb-3">
          <i class="fa-solid fa-cart-arrow-down"></i>
        </div>
        <p class="text-sm font-semibold text-gray-700">ไม่มีสินค้าในตะกร้าของคุณ</p>
        <p class="text-xs text-gray-400 mt-1">เลือกช้อปสินค้าสตรีทแวร์เท่ๆ ได้เลยตอนนี้</p>
      </div>
    `;
    updateCartSummary();
    return;
  }

  const lastIdx = state.cart.length - 1;

  // ค้นหาสินค้าที่เพิ่งถูกเพิ่มเข้ามาเพื่อทำ Banner แจ้งเตือนด้านบน
  const addedItem = highlightTarget ? (
    typeof highlightTarget === "string" 
      ? state.cart.find(i => i.id === highlightTarget) 
      : state.cart[lastIdx]
  ) : null;

  const bannerHtml = addedItem ? `
    <div id="cartJustAddedBanner" class="cart-success-banner mb-3.5 p-3.5 bg-neutral-900 text-white rounded-xl shadow-lg border border-neutral-700 flex items-center justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-12 h-12 rounded-lg overflow-hidden border border-neutral-600 shrink-0 bg-neutral-800 relative">
          <img src="${addedItem.image}" alt="${addedItem.name}" class="w-full h-full object-cover" />
          <span class="absolute -top-1 -right-1 bg-green-500 text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-black shadow">✓</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-black text-yellow-400 flex items-center gap-1.5">
            <i class="fa-solid fa-circle-check text-green-400"></i>
            <span>สินค้าเด้งเข้าตะกร้าเรียบร้อยแล้ว!</span>
          </div>
          <p class="text-xs font-bold text-white truncate">${addedItem.name}</p>
          <p class="text-[10px] text-gray-300 mt-0.5">ไซส์: <strong class="text-yellow-300 font-mono text-[11px]">${addedItem.size}</strong> • จำนวน: ${addedItem.quantity} ชิ้น</p>
        </div>
      </div>
      <div class="text-right shrink-0 pl-2">
        <span class="text-xs font-black text-white block font-sans">฿${(addedItem.price * addedItem.quantity).toLocaleString()}</span>
        <span class="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold border border-green-500/30">พร้อมชำระเงิน</span>
      </div>
    </div>
  ` : '';

  const itemsHtml = state.cart.map((item, idx) => {
    // เช็คว่าไอเทมนี้เป็นไอเทมที่เพิ่งเพิ่ม/ไฮไลต์หรือไม่
    const isHighlighted = highlightTarget && (
      (typeof highlightTarget === "string" && item.id === highlightTarget) ||
      (highlightTarget === true && idx === lastIdx)
    );

    return `
    <div class="flex items-center gap-3 py-3.5 px-2 border-b border-gray-100 last:border-0 transition-all duration-300 ${isHighlighted ? 'cart-item-new cart-item-highlight bg-amber-50/70 rounded-xl shadow-sm border border-amber-200/80' : ''}" data-cart-item="${item.id}">
      <input type="checkbox" ${item.selected ? "checked" : ""} onchange="toggleCartItemSelection('${item.id}')" class="custom-checkbox shrink-0" />
      <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0 ${isHighlighted ? 'ring-2 ring-black ring-offset-2 scale-105 transition-transform' : ''}" />
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-1">
          <h4 class="text-xs font-bold text-gray-900 truncate">${item.name}</h4>
        </div>
        <div class="text-[11px] text-gray-500 mt-0.5">ไซส์: <span class="font-bold text-gray-800">${item.size}</span></div>
        ${isHighlighted ? '<div class="text-[10px] text-green-700 font-extrabold mt-1 inline-flex items-center gap-1 bg-green-100/90 px-2.5 py-0.5 rounded-full border border-green-300 animate-pulse"><i class="fa-solid fa-circle-check text-green-600"></i> ✨ สินค้าชิ้นนี้เพิ่งเด้งเข้าตะกร้า!</div>' : ''}
        <div class="flex items-center justify-between mt-2">
          <span class="text-xs font-bold text-black font-sans">฿${item.price.toLocaleString()}</span>
          <div class="flex items-center rounded-md overflow-hidden border border-gray-200 bg-white shadow-xs">
            <button onclick="updateCartItemQty('${item.id}', -1)" class="w-6 h-6 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-200 text-xs transition">-</button>
            <span class="w-8 text-center text-xs font-semibold">${item.quantity}</span>
            <button onclick="updateCartItemQty('${item.id}', 1)" class="w-6 h-6 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-200 text-xs transition">+</button>
          </div>
        </div>
      </div>
      <button onclick="removeCartItem('${item.id}')" class="text-gray-300 hover:text-red-600 p-1.5 text-xs shrink-0 transition" title="ลบสินค้า">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `}).join("");

  container.innerHTML = bannerHtml + itemsHtml;

  updateCartSummary();

  // Scroll ไปยังสินค้าล่าสุดที่เพิ่งเพิ่มทันที เพื่อให้เห็นชัดเจน
  if (highlightTarget && state.cart.length > 0) {
    const targetItemEl = typeof highlightTarget === "string"
      ? container.querySelector(`[data-cart-item="${highlightTarget}"]`)
      : container.querySelector(`[data-cart-item="${state.cart[lastIdx].id}"]`);
    if (targetItemEl) {
      setTimeout(() => {
        targetItemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  }
}

function toggleCartItemSelection(itemId) {
  const item = state.cart.find(i => i.id === itemId);
  if (item) {
    item.selected = !item.selected;
    saveCart();
    renderCart();
  }
}

function toggleSelectAllCart(checked) {
  state.cart.forEach(item => item.selected = checked);
  saveCart();
  renderCart();
}

function updateCartItemQty(itemId, delta) {
  const item = state.cart.find(i => i.id === itemId);
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeCartItem(itemId);
  } else {
    item.quantity = newQty;
    saveCart();
    renderCart();
  }
}

function removeCartItem(itemId) {
  state.cart = state.cart.filter(i => i.id !== itemId);
  saveCart();
  renderCart();
  showToast("ลบสินค้าออกจากตะกร้าแล้ว", "info");
}

function updateCartSummary() {
  const selectedItems = state.cart.filter(i => i.selected);
  const subtotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let discount = 0;
  let shipping = 0; // ไม่มีค่าจัดส่ง (ส่งฟรีทุกออเดอร์)

  if (state.appliedVoucher && selectedItems.length > 0) {
    if (state.appliedVoucher.type === "percent") {
      discount = Math.min(state.appliedVoucher.maxDiscount, Math.round((subtotal * state.appliedVoucher.discountPercent) / 100));
    } else if (state.appliedVoucher.type === "fixed") {
      discount = state.appliedVoucher.discountAmount;
    } else if (state.appliedVoucher.type === "shipping") {
      shipping = 0;
    }
  }

  const total = Math.max(0, subtotal - discount + shipping);

  const subtotalEl = document.getElementById("cartSubtotal");
  const discountEl = document.getElementById("cartDiscount");
  const shippingEl = document.getElementById("cartShipping");
  const totalEl = document.getElementById("cartTotal");
  const checkoutBtn = document.getElementById("cartCheckoutBtn");

  if (subtotalEl) subtotalEl.innerText = `฿${subtotal.toLocaleString()}`;
  if (discountEl) discountEl.innerText = `-฿${discount.toLocaleString()}`;
  if (shippingEl) shippingEl.innerText = "ฟรี";
  if (totalEl) totalEl.innerText = `฿${total.toLocaleString()}`;

  if (checkoutBtn) {
    checkoutBtn.disabled = selectedItems.length === 0;
    checkoutBtn.innerText = `สั่งซื้อสินค้า (${selectedItems.length})`;
  }
}

/* ==========================================================================
   Checkout & Orders
   ========================================================================== */
function openCheckout() {
  requireAuth((user) => {
    const selectedItems = state.cart.filter(i => i.selected);
    if (selectedItems.length === 0) {
      showToast("กรุณาเลือกสินค้าอย่างน้อย 1 รายการก่อนชำระเงิน", "warning");
      return;
    }

    closeCartDrawer();
    const modal = document.getElementById("checkoutModal");
    if (!modal) return;

    // เติมข้อมูลลูกค้าที่ล็อกอินอยู่ให้อัตโนมัติ
    const nameInput = document.getElementById("orderCustName");
    const phoneInput = document.getElementById("orderCustPhone");
    if (nameInput && !nameInput.value) nameInput.value = user.name;
    if (phoneInput && !phoneInput.value && user.phone !== "-") phoneInput.value = user.phone;

    renderCheckoutSummary(selectedItems);
    selectPaymentMethod("promptpay");
    removeUploadedSlip();
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }, "checkout");
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

async function handleSlipFileChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const placeholder = document.getElementById("slipUploadPlaceholder");
  const container = document.getElementById("slipPreviewContainer");
  const imgEl = document.getElementById("slipPreviewImg");
  const fileNameEl = document.getElementById("slipFileName");

  // แสดง visual indicator ว่ากำลังประมวลผลรูปภาพจากกล้องมือถือ
  if (placeholder) {
    placeholder.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center mb-1.5 animate-spin">
        <i class="fa-solid fa-spinner"></i>
      </div>
      <span class="text-xs font-bold text-gray-800">กำลังบีบอัดรูปภาพจากกล้องมือถือ...</span>
      <span class="text-[10px] text-gray-400 mt-0.5">ระบบรองรับไฟล์ทุกขนาดและปรับขนาดให้อัตโนมัติ</span>
    `;
  }

  try {
    // บีบอัดและปรับขนาดรูปภาพจากกล้องมือถือทุกขนาด (ไม่จำกัดขนาดไฟล์)
    const compressedDataUrl = await compressImageFile(file, 900, 1200, 0.72);
    state.uploadedSlip = compressedDataUrl;

    if (imgEl) imgEl.src = compressedDataUrl;
    if (fileNameEl) fileNameEl.innerText = file.name;
    if (placeholder) placeholder.classList.add("hidden");
    if (container) container.classList.remove("hidden");

    showToast("แนบสลิปเรียบร้อยแล้ว (ปรับแต่งภาพจากกล้องมือถืออัตโนมัติ)", "success");
  } catch (err) {
    console.error("Error processing slip image:", err);
    showToast(err.message || "เกิดข้อผิดพลาดในการประมวลผลรูปภาพ", "error");
    removeUploadedSlip();
  } finally {
    // คืนค่า input เพื่อให้สามารถเลือกรูปเดิมซ้ำได้หากต้องการ
    if (event.target) event.target.value = "";
    // คืนค่า placeholder ปกติกรณีไม่ได้ซ่อน
    if (placeholder && !placeholder.classList.contains("hidden")) {
      placeholder.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-black group-hover:text-white text-gray-600 flex items-center justify-center mb-1.5 transition">
          <i class="fa-solid fa-cloud-arrow-up text-base"></i>
        </div>
        <span class="text-xs font-bold text-gray-800 group-hover:text-black">คลิกเพื่อแนบรูปภาพสลิปโอนเงิน</span>
        <span class="text-[10px] text-gray-400 mt-0.5">รองรับภาพถ่ายจากกล้องมือถือทุกขนาด ระบบปรับขนาดให้อัตโนมัติ</span>
      `;
    }
  }
}

function removeUploadedSlip() {
  state.uploadedSlip = null;
  const fileInput = document.getElementById("orderSlipInput");
  if (fileInput) fileInput.value = "";

  const placeholder = document.getElementById("slipUploadPlaceholder");
  const container = document.getElementById("slipPreviewContainer");
  const imgEl = document.getElementById("slipPreviewImg");

  if (imgEl) imgEl.src = "";
  if (placeholder) {
    placeholder.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-black group-hover:text-white text-gray-600 flex items-center justify-center mb-1.5 transition">
        <i class="fa-solid fa-cloud-arrow-up text-base"></i>
      </div>
      <span class="text-xs font-bold text-gray-800 group-hover:text-black">คลิกเพื่อแนบรูปภาพสลิปโอนเงิน</span>
      <span class="text-[10px] text-gray-400 mt-0.5">รองรับภาพถ่ายจากกล้องมือถือทุกขนาด ระบบปรับขนาดให้อัตโนมัติ</span>
    `;
    placeholder.classList.remove("hidden");
  }
  if (container) container.classList.add("hidden");
}

function selectShippingMethod(method) {
  state.selectedShippingMethod = method;
  const standardRadio = document.getElementById("shipStandardRadio");
  const expressRadio = document.getElementById("shipExpressRadio");
  if (standardRadio) standardRadio.checked = method === "standard";
  if (expressRadio) expressRadio.checked = method === "express";

  const selectedItems = state.cart.filter(i => i.selected);
  renderCheckoutSummary(selectedItems);
}

function selectPaymentMethod(method) {
  state.selectedPaymentMethod = method;
  ["promptpay", "bank"].forEach(m => {
    const card = document.getElementById(`payMethod_${m}`);
    const details = document.getElementById(`payDetails_${m}`);
    if (card) {
      card.classList.toggle("border-black", m === method);
      card.classList.toggle("bg-neutral-50", m === method);
      card.classList.toggle("border-2", m === method);
      card.classList.toggle("border-neutral-300", m !== method);
    }
    if (details) details.classList.toggle("hidden", m !== method);
  });
}

function renderCheckoutSummary(items) {
  const listEl = document.getElementById("checkoutItemsList");
  if (!listEl) return;

  listEl.innerHTML = items.map(item => `
    <div class="flex items-center justify-between text-xs py-2 border-b border-gray-100 last:border-0">
      <div class="flex items-center gap-2 min-w-0">
        <img src="${item.image}" class="w-10 h-10 rounded object-cover shrink-0"/>
        <div class="truncate">
          <div class="font-medium text-gray-900 truncate">${item.name}</div>
          <div class="text-[10px] text-gray-400">ไซส์ ${item.size} x ${item.quantity}</div>
        </div>
      </div>
      <span class="font-bold text-gray-900 shrink-0 ml-2">฿${(item.price * item.quantity).toLocaleString()}</span>
    </div>
  `).join("");

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let shippingCost = 0; // ไม่มีค่าจัดส่ง (ส่งฟรีทุกออเดอร์)
  let discount = 0;

  if (state.appliedVoucher) {
    if (state.appliedVoucher.type === "percent") {
      discount = Math.min(state.appliedVoucher.maxDiscount, Math.round((subtotal * state.appliedVoucher.discountPercent) / 100));
    } else if (state.appliedVoucher.type === "fixed") {
      discount = state.appliedVoucher.discountAmount;
    } else if (state.appliedVoucher.type === "shipping") {
      shippingCost = 0;
    }
  }

  const grandTotal = Math.max(0, subtotal - discount + shippingCost);

  document.getElementById("checkoutSubtotal").innerText = `฿${subtotal.toLocaleString()}`;
  document.getElementById("checkoutShipping").innerText = "ฟรี (ไม่มีค่าจัดส่ง)";
  document.getElementById("checkoutDiscount").innerText = `-฿${discount.toLocaleString()}`;
  document.getElementById("checkoutGrandTotal").innerText = `฿${grandTotal.toLocaleString()}`;
  
  const qrAmountEl = document.getElementById("qrTotalAmount");
  if (qrAmountEl) qrAmountEl.innerText = `฿${grandTotal.toLocaleString()}`;
}

function submitCheckoutOrder(event) {
  event.preventDefault();

  const user = getCurrentUser();
  if (!user) {
    showToast("กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ", "error");
    showAuthRequiredModal("checkout");
    return;
  }

  const name = document.getElementById("orderCustName")?.value.trim();
  const phone = document.getElementById("orderCustPhone")?.value.trim();
  const address = document.getElementById("orderCustAddress")?.value.trim();
  const province = document.getElementById("orderCustProvince")?.value.trim();
  const postalCode = document.getElementById("orderCustPostal")?.value.trim();

  if (!name || !phone || !address || !province || !postalCode) {
    showToast("กรุณากรอกข้อมูลที่อยู่สำหรับจัดส่งให้ครบถ้วนทุกช่อง", "warning");
    return;
  }

  // หากไม่มีสินค้าที่ถูกเลือกในตะกร้า แต่มีสินค้าอยู่ในตะกร้า ให้เลือกสินค้าทั้งหมดให้อัตโนมัติ
  let orderedItems = state.cart.filter(i => i.selected);
  if (orderedItems.length === 0 && state.cart.length > 0) {
    state.cart.forEach(i => i.selected = true);
    saveCart();
    orderedItems = [...state.cart];
  }

  if (orderedItems.length === 0) {
    showToast("ไม่พบรายการสินค้าที่สั่งซื้อ กรุณาเลือกสินค้าลงตะกร้าก่อน", "warning");
    closeCheckoutModal();
    return;
  }

  const subtotal = orderedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let shippingCost = 0; // ไม่มีค่าจัดส่ง (ส่งฟรีทุกออเดอร์)
  let discount = 0;

  if (state.appliedVoucher) {
    if (state.appliedVoucher.type === "percent") {
      discount = Math.min(state.appliedVoucher.maxDiscount, Math.round((subtotal * state.appliedVoucher.discountPercent) / 100));
    } else if (state.appliedVoucher.type === "fixed") {
      discount = state.appliedVoucher.discountAmount;
    } else if (state.appliedVoucher.type === "shipping") {
      shippingCost = 0;
    }
  }

  const grandTotal = Math.max(0, subtotal - discount + shippingCost);
  const now = new Date();
  const dateStr = now.toLocaleDateString("th-TH") + " " + now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const orderId = "VTX-" + now.getFullYear() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0") + "-" + Math.floor(1000 + Math.random() * 9000);

  const orderPayload = {
    orderId,
    date: dateStr,
    customerId: user.id,
    customerName: name,
    customerEmail: user.email,
    customerPhone: phone,
    customerAddress: `${address}, ${province} ${postalCode}`,
    items: orderedItems,
    shippingMethod: "Standard Delivery (ส่งฟรีไม่มีค่าจัดส่ง - ตัดยอดทุกวัน 13:00 น.)",
    paymentMethod: state.selectedPaymentMethod === "promptpay" ? "QR PromptPay" : "โอนเงินผ่านบัญชีธนาคาร",
    subtotal,
    discount,
    shippingCost: 0,
    grandTotal,
    status: state.selectedPaymentMethod === "promptpay" ? "กำลังเตรียมจัดส่ง" : "รอชำระเงิน",
    courier: "SPX Express",
    trackingNumber: "",
    slipImage: state.uploadedSlip || ""
  };

  // ตรวจสอบสต็อกสินค้าก่อนยืนยันคำสั่งซื้อ
  const currentProducts = getStoredProducts();
  for (const item of orderedItems) {
    const prod = currentProducts.find(p => p.id === item.productId);
    if (prod && Number(prod.stock) < Number(item.quantity)) {
      showToast(`สินค้า "${item.name}" มีสต็อกไม่เพียงพอ (คงเหลือ ${prod.stock} ชิ้น)`, "error");
      return;
    }
  }

  // หักสต็อกสินค้าทันที และเพิ่มยอดขาย (SoldCount)
  for (const item of orderedItems) {
    const prodIndex = currentProducts.findIndex(p => p.id === item.productId);
    if (prodIndex > -1) {
      currentProducts[prodIndex].stock = Math.max(0, Number(currentProducts[prodIndex].stock || 0) - Number(item.quantity));
      currentProducts[prodIndex].soldCount = Number(currentProducts[prodIndex].soldCount || 0) + Number(item.quantity);
    }
  }

  // บันทึกสต็อกสินค้าที่อัปเดตใหม่ลง IndexedDB และ LocalStorage ทันที
  saveStoredProducts(currentProducts);
  state.products = currentProducts;

  createOrder(orderPayload);

  // เคลียร์สินค้าที่สั่งออกจากตะกร้า
  state.cart = state.cart.filter(i => !i.selected);
  saveCart();
  updateCartBadge();

  // อัปเดตการแสดงผลหน้าร้านทันที (หากสต็อกเป็น 0 จะขึ้นป้าย "ขายหมดแล้ว" ทันที)
  if (typeof applyFiltersAndRender === "function") {
    applyFiltersAndRender();
  }
  if (typeof renderAdminProductsTable === "function" && document.getElementById("adminProductsTableBody")) {
    renderAdminProductsTable();
    renderAdminStats();
  }

  // หากโมดัลรายละเอียดสินค้ากำลังเปิดอยู่ ให้อัปเดตสถานะเป็น "สินค้าหมด" ทันที
  if (state.currentDetailProduct) {
    const updatedProd = currentProducts.find(p => p.id === state.currentDetailProduct.id);
    if (updatedProd) {
      state.currentDetailProduct = updatedProd;
      const isOutOfStock = Number(updatedProd.stock) <= 0;
      const stockEl = document.getElementById("modalProductStock");
      if (stockEl) {
        if (isOutOfStock) {
          stockEl.innerHTML = `<span class="inline-flex items-center gap-1 bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full text-[11px]"><i class="fa-solid fa-ban text-[9px]"></i> สินค้าหมด</span>`;
        } else {
          stockEl.innerText = `${updatedProd.stock} ชิ้น`;
        }
      }
      const addCartBtn = document.getElementById("modalAddCartBtn");
      const buyNowBtn = document.getElementById("modalBuyNowBtn");
      if (isOutOfStock) {
        if (addCartBtn) {
          addCartBtn.disabled = true;
          addCartBtn.className = "w-full py-3.5 px-4 bg-neutral-200 text-neutral-400 border-2 border-neutral-300 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-60";
          addCartBtn.innerHTML = '<i class="fa-solid fa-ban text-sm"></i> <span class="font-bold">สินค้าหมด</span>';
        }
        if (buyNowBtn) {
          buyNowBtn.disabled = true;
          buyNowBtn.className = "w-full py-3.5 px-4 bg-neutral-300 text-neutral-400 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-60 pointer-events-none";
          buyNowBtn.innerHTML = '<span class="font-bold">ไม่พร้อมจำหน่าย</span>';
        }
      }
    }
  }

  closeCheckoutModal();
  openReceiptModal(orderPayload);
  showToast("สั่งซื้อสินค้าสำเร็จ! ได้รับข้อมูลคำสั่งซื้อแล้ว (ส่งฟรีไม่มีค่าจัดส่ง)", "success");
}

function openReceiptModal(order) {
  const modal = document.getElementById("orderReceiptModal");
  if (!modal || !order) return;

  document.getElementById("receiptOrderId").innerText = order.orderId;
  document.getElementById("receiptDate").innerText = order.date;
  document.getElementById("receiptCustName").innerText = order.customerName;
  document.getElementById("receiptCustPhone").innerText = order.customerPhone;
  document.getElementById("receiptCustAddress").innerText = order.customerAddress;
  document.getElementById("receiptPaymentMethod").innerText = order.paymentMethod;
  document.getElementById("receiptShippingMethod").innerText = order.shippingMethod;
  document.getElementById("receiptGrandTotal").innerText = `฿${order.grandTotal.toLocaleString()}`;

  const slipRow = document.getElementById("receiptSlipRow");
  if (slipRow) {
    slipRow.classList.toggle("hidden", !order.slipImage);
  }

  const itemsContainer = document.getElementById("receiptItemsList");
  if (itemsContainer) {
    itemsContainer.innerHTML = order.items.map(item => `
      <div class="flex items-center justify-between text-xs py-1.5 border-b border-gray-100 last:border-0">
        <div>
          <span class="font-bold text-gray-900">${item.name}</span>
          <div class="text-[11px] text-gray-500">ไซส์ ${item.size} (x${item.quantity})</div>
        </div>
        <span class="font-bold text-gray-900 font-sans">฿${(item.price * item.quantity).toLocaleString()}</span>
      </div>
    `).join("");
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeReceiptModal() {
  const modal = document.getElementById("orderReceiptModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

/* ==========================================================================
   Customer Orders View Modal
   ========================================================================== */
function openMyOrdersModal() {
  const user = getCurrentUser();
  if (!user) {
    showToast("กรุณาเข้าสู่ระบบก่อนดูคำสั่งซื้อ", "warning");
    return;
  }

  const allOrders = getStoredOrders();
  const myOrders = allOrders.filter(o => o.customerId === user.id || o.customerEmail === user.email);

  const existingModal = document.getElementById("myOrdersModal");
  if (existingModal) existingModal.remove();

  const modalHtml = `
    <div id="myOrdersModal" class="modal-backdrop open fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="modal-content-box bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl p-5 sm:p-6 overflow-y-auto border border-neutral-200 relative">
        <div class="flex items-center justify-between pb-4 border-b border-neutral-200">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-box-archive text-lg text-black"></i>
            <div>
              <h3 class="text-base font-black text-gray-900">คำสั่งซื้อของฉัน</h3>
              <p class="text-xs text-gray-500">ประวัติและสถานะการจัดส่งพัสดุ</p>
            </div>
          </div>
          <button onclick="document.getElementById('myOrdersModal').remove()" class="w-8 h-8 rounded-full bg-neutral-100 hover:bg-black hover:text-white text-gray-500 flex items-center justify-center transition">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <div class="py-4 space-y-4">
          ${myOrders.length === 0 ? `
            <div class="text-center py-12 text-gray-400">
              <i class="fa-solid fa-receipt text-3xl mb-2"></i>
              <p class="text-xs">ยังไม่มีประวัติคำสั่งซื้อ</p>
            </div>
          ` : myOrders.map(o => `
            <div class="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-xs">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-neutral-200 gap-1">
                <div>
                  <span class="font-mono font-bold text-black">${o.orderId}</span>
                  <span class="text-gray-400 text-[11px] ml-2">${o.date}</span>
                </div>
                <div>
                  <span class="status-badge ${o.status === 'จัดส่งแล้ว' ? 'status-shipped' : o.status === 'กำลังเตรียมจัดส่ง' ? 'status-processing' : 'status-pending'}">
                    ${o.status}
                  </span>
                </div>
              </div>

              <div class="py-2 space-y-1">
                ${o.items.map(item => `
                  <div class="flex justify-between text-gray-700">
                    <span>${item.name} (${item.size}) x${item.quantity}</span>
                    <span class="font-bold text-black font-sans">฿${(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                `).join("")}
              </div>

              ${o.trackingNumber ? `
                <div class="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-800">
                  <span class="font-semibold"><i class="fa-solid fa-truck-fast mr-1"></i> ${o.courier || 'พัสดุ'}: <strong>${o.trackingNumber}</strong></span>
                  <span class="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded">ส่งแล้ว</span>
                </div>
              ` : `
                <div class="mt-2 text-[11px] text-gray-500 italic">
                  <i class="fa-solid fa-hourglass-half mr-1"></i> ทางร้านกำลังเตรียมแพ็กสินค้า จะแจ้งเลขพัสดุเร็วๆ นี้
                </div>
              `}

              <div class="pt-2 border-t border-neutral-200 flex justify-between items-center font-bold text-black mt-2">
                <span>ยอดรวมทั้งสิ้น</span>
                <span class="text-sm font-sans">฿${o.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

/* ==========================================================================
   Banner Carousel & Timers
   ========================================================================== */
function initBannerCarousel() {
  const slides = document.querySelectorAll(".carousel-slide");
  const dotsContainer = document.getElementById("carouselDots");
  if (!slides.length) return;

  if (dotsContainer) {
    dotsContainer.innerHTML = "";
    slides.forEach((_, idx) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `h-2 rounded-full transition-all duration-300 ${idx === 0 ? "bg-white w-6" : "bg-white/40 hover:bg-white/70 w-2"}`;
      dot.addEventListener("click", () => goToBanner(idx));
      dotsContainer.appendChild(dot);
    });
  }

  // Auto slide ทุกๆ 5 วินาที
  if (window._bannerCarouselInterval) {
    clearInterval(window._bannerCarouselInterval);
  }
  window._bannerCarouselInterval = setInterval(() => {
    nextBanner();
  }, 5000);
}

function goToBanner(index) {
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.getElementById("carouselDots")?.children;
  if (!slides.length) return;

  state.activeBannerIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, idx) => slide.classList.toggle("active", idx === state.activeBannerIndex));

  if (dots) {
    Array.from(dots).forEach((dot, idx) => {
      dot.className = idx === state.activeBannerIndex 
        ? "w-6 h-2 rounded-full bg-white transition-all duration-300 shadow-sm" 
        : "w-2 h-2 rounded-full bg-white/40 hover:bg-white/70 transition-all duration-300";
    });
  }
}
window.goToBanner = goToBanner;

function nextBanner() {
  const slides = document.querySelectorAll(".carousel-slide");
  if (!slides.length) return;
  goToBanner((state.activeBannerIndex || 0) + 1);
}
window.nextBanner = nextBanner;

function prevBanner() {
  const slides = document.querySelectorAll(".carousel-slide");
  if (!slides.length) return;
  goToBanner((state.activeBannerIndex || 0) - 1);
}
window.prevBanner = prevBanner;

function initFlashSaleTimer() {
  let totalSeconds = 3 * 3600 + 45 * 60 + 20;
  const hoursEl = document.getElementById("fsHours");
  const minutesEl = document.getElementById("fsMinutes");
  const secondsEl = document.getElementById("fsSeconds");

  setInterval(() => {
    if (totalSeconds <= 0) totalSeconds = 4 * 3600;
    totalSeconds--;
    if (hoursEl) hoursEl.innerText = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    if (minutesEl) minutesEl.innerText = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    if (secondsEl) secondsEl.innerText = String(totalSeconds % 60).padStart(2, "0");
  }, 1000);

  renderFlashSale();
}

function renderFlashSale() {
  const container = document.getElementById("flashSaleContainer");
  if (!container) return;

  const flashItems = state.products.filter(p => p.isFlashSale);
  container.innerHTML = flashItems.map(p => `
    <div onclick="openProductDetail('${p.id}')" class="min-w-[190px] md:min-w-[210px] max-w-[220px] bg-white rounded-lg border border-gray-100 p-2.5 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col group">
      <div class="relative w-full pb-[110%] rounded overflow-hidden bg-neutral-100">
        <img src="${normalizeImagePath(p.images[0])}" alt="${p.name}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/>
        <div class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">-${p.discount}%</div>
        <div class="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
          <i class="fa-solid fa-bolt text-yellow-400 text-[9px]"></i> FLASH SALE
        </div>
      </div>
      <div class="mt-2.5 flex-1 flex flex-col justify-between">
        <h4 class="text-xs font-medium text-gray-800 line-clamp-2 leading-snug group-hover:text-black">${p.name}</h4>
        <div class="mt-2">
          <div class="flex items-baseline gap-1.5">
            <span class="text-sm font-bold text-black font-sans">฿${p.price.toLocaleString()}</span>
            <span class="text-[11px] text-gray-400 line-through">฿${p.originalPrice.toLocaleString()}</span>
          </div>
          <div class="mt-2 flash-progress">
            <div class="flash-progress-bar" style="width: 75%"></div>
            <span class="flash-progress-text">ขายแล้ว ${p.soldCount || 100} ชิ้น</span>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderCategories() {
  const container = document.getElementById("categoriesContainer");
  if (!container) return;

  container.innerHTML = CATEGORIES_DATA.map(cat => `
    <button onclick="selectCategory('${cat.id}')" class="category-btn flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-200 min-w-[90px] sm:min-w-[110px] text-center
      ${state.selectedCategory === cat.id ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-black hover:bg-neutral-50'}">
      <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2 ${state.selectedCategory === cat.id ? 'bg-white/10 text-white' : 'bg-neutral-100 text-black'}">
        <i class="fa-solid ${cat.icon}"></i>
      </div>
      <span class="text-xs font-semibold whitespace-nowrap">${cat.name}</span>
    </button>
  `).join("");
}

function selectCategory(catId) {
  state.selectedCategory = catId;
  renderCategories();
  applyFiltersAndRender();
}

function setQuickSearch(tag) {
  const input = document.getElementById("searchInput");
  if (input) input.value = tag;
  state.searchKeyword = tag.toLowerCase();
  applyFiltersAndRender();
}

function resetFilters() {
  state.selectedCategory = "all";
  state.searchKeyword = "";
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  renderCategories();
  applyFiltersAndRender();
}

function renderVoucherList() {
  const container = document.getElementById("voucherBadgesContainer");
  if (!container) return;

  container.innerHTML = VOUCHERS_DATA.map(v => `
    <button onclick="quickApplyVoucher('${v.code}')" class="px-2.5 py-1 rounded border border-dashed border-gray-400 hover:border-black bg-neutral-50 text-[11px] font-mono font-bold flex items-center gap-1.5 transition">
      <i class="fa-solid fa-ticket text-[10px]"></i> ${v.code}
    </button>
  `).join("");
}

function quickApplyVoucher(code) {
  const input = document.getElementById("cartVoucherInput");
  if (input) input.value = code;
  handleApplyVoucher();
}

function handleApplyVoucher() {
  const input = document.getElementById("cartVoucherInput");
  if (!input) return;
  const code = input.value.trim().toUpperCase();

  const found = VOUCHERS_DATA.find(v => v.code === code);
  if (!found) {
    showToast("โค้ดส่วนลดไม่ถูกต้อง หรือหมดอายุแล้ว", "error");
    return;
  }

  state.appliedVoucher = found;
  updateCartSummary();
  showToast(`ใช้โค้ดส่วนลด "${found.code}" สำเร็จ!`, "success");
}

/* ==========================================================================
   ADMIN DASHBOARD CONTROLLER (admin.html)
   ========================================================================== */
function initAdminDashboard() {
  initStorage();
  const user = getCurrentUser();

  // Route Guard: ต้องล็อกอิน และต้องมี Role เป็น admin
  if (!user || user.role !== "admin") {
    alert("กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ (Admin)");
    window.location.href = "admin-login.html";
    return;
  }

  // อัปเดตข้อมูลแอดมินบนหัวเว็บ
  const adminNameEl = document.getElementById("adminUserName");
  if (adminNameEl) adminNameEl.innerText = user.name;

  // โหลด products จาก cache (IDB จะ override ใน syncProductsFromIDB ที่เรียกจาก initStorage)
  // ไม่ force set state.products ที่นี่เพราะ syncProductsFromIDB จะ render ใหม่เมื่อ IDB โหลดเสร็จ
  if (_inMemoryProductsCache && _inMemoryProductsCache.length > 0) {
    state.products = _inMemoryProductsCache;
  }
  state.orders = getStoredOrders();

  renderAdminStats();
  renderAdminProductsTable();
  renderAdminOrdersTable();
  renderAdminUsersTable();
  renderAdminReviewsTable();
  setupAdminEvents();
  initAdminChat();
  initRealtimeImageSync();
}

function renderAdminUsersTable(searchKeyword = "", filterRole = "all") {
  const tableBody = document.getElementById("adminUsersTableBody");
  if (!tableBody) return;

  let users = getUsers(); // from localStorage

  const search = String(searchKeyword || "").trim().toLowerCase();
  if (search) {
    users = users.filter(u => 
      (u.name && u.name.toLowerCase().includes(search)) ||
      (u.email && u.email.toLowerCase().includes(search)) ||
      (u.phone && u.phone.toLowerCase().includes(search)) ||
      (u.id && u.id.toLowerCase().includes(search))
    );
  }

  if (filterRole && filterRole !== "all") {
    users = users.filter(u => u.role === filterRole);
  }
  
  if (users.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-gray-400">
          <i class="fa-solid fa-users-slash text-2xl mb-2 text-gray-300"></i>
          <p class="text-xs">ไม่พบข้อมูลสมาชิกที่ตรงกับการค้นหา</p>
        </td>
      </tr>
    `;
    return;
  }

  const currentUser = getCurrentUser();

  tableBody.innerHTML = users.map(u => `
    <tr class="border-b border-neutral-100 hover:bg-neutral-50 transition">
      <td class="py-3 px-4 font-mono text-[10px] text-gray-500" title="${u.id}">${u.id.length > 12 ? u.id.substring(0, 10) + '...' : u.id}</td>
      <td class="py-3 px-4">
        <div class="font-bold text-gray-900">${u.name}</div>
        ${currentUser && currentUser.id === u.id ? '<span class="inline-block text-[9px] bg-black text-white px-1.5 py-0.2 rounded font-semibold mt-0.5">คุณ (Current)</span>' : ''}
      </td>
      <td class="py-3 px-4 text-gray-600 font-mono text-xs">${u.email}</td>
      <td class="py-3 px-4 text-gray-600">${u.phone || '-'}</td>
      <td class="py-3 px-4">
        ${u.role === 'admin' 
          ? '<span class="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase inline-flex items-center gap-1"><i class="fa-solid fa-shield-halved text-[9px]"></i> Admin</span>' 
          : '<span class="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase inline-flex items-center gap-1"><i class="fa-solid fa-user text-[9px]"></i> Customer</span>'}
      </td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="openEditUserModal('${u.id}')" class="px-2.5 py-1.5 bg-neutral-100 hover:bg-black hover:text-white rounded text-xs font-semibold text-gray-700 transition flex items-center gap-1" title="แก้ไขข้อมูล">
            <i class="fa-solid fa-pen-to-square"></i> แก้ไข
          </button>
          <button onclick="handleDeleteUser('${u.id}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white rounded text-xs font-semibold text-red-600 transition flex items-center gap-1" title="ลบสมาชิก">
            <i class="fa-solid fa-trash-can"></i> ลบ
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderAdminStats() {
  const products = getStoredProducts();
  const orders = getStoredOrders();
  const users = getUsers();

  const totalSales = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalCustomers = users.filter(u => u.role === "customer").length;

  const statSales = document.getElementById("statTotalSales");
  const statOrders = document.getElementById("statTotalOrders");
  const statProducts = document.getElementById("statTotalProducts");
  const statCustomers = document.getElementById("statTotalCustomers");

  if (statSales) statSales.innerText = `฿${totalSales.toLocaleString()}`;
  if (statOrders) statOrders.innerText = `${totalOrders} ออเดอร์`;
  if (statProducts) statProducts.innerText = `${totalProducts} รายการ`;
  if (statCustomers) statCustomers.innerText = `${totalCustomers} บัญชี`;

  const reviews = getStoredReviews();
  const countBadge = document.getElementById("adminReviewCountBadge");
  if (countBadge) countBadge.innerText = reviews.length;
}

function renderAdminProductsTable(searchKeyword = "", filterCategory = "all") {
  const tableBody = document.getElementById("adminProductsTableBody");
  if (!tableBody) return;

  let products = getStoredProducts();

  // ตัวกรองคำค้นหา (ชื่อสินค้า หรือ รหัสสินค้า)
  const kw = (searchKeyword || "").trim().toLowerCase();
  if (kw) {
    products = products.filter(p =>
      (p.name && p.name.toLowerCase().includes(kw)) ||
      (p.id && p.id.toLowerCase().includes(kw)) ||
      (p.categoryLabel && p.categoryLabel.toLowerCase().includes(kw))
    );
  }

  // ตัวกรองตามหมวดหมู่
  if (filterCategory && filterCategory !== "all") {
    products = products.filter(p => p.category === filterCategory);
  }

  if (!products || products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-gray-400">
          <div class="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-2 text-gray-400 text-lg">
            <i class="fa-solid fa-box-open"></i>
          </div>
          <p class="text-xs font-bold text-gray-600">ไม่พบรายการสินค้าที่ค้นหา</p>
          <p class="text-[11px] text-gray-400 mt-0.5">คุณสามารถกดปุ่ม "เพิ่มสินค้าใหม่" ด้านบนเพื่อลงขายสินค้า</p>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = products.map((p, idx) => `
    <tr class="border-b border-gray-100 hover:bg-neutral-50 transition">
      <td class="py-3 px-4 text-gray-400 font-mono text-[11px]">${idx + 1}</td>
      <td class="py-3 px-4">
        <div class="flex items-center gap-3">
          <img src="${normalizeImagePath((p.images && p.images[0]) || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80')}" alt="${p.name}" class="w-12 h-12 rounded object-cover border border-gray-200 shrink-0"/>
          <div>
            <div class="font-bold text-gray-900 text-xs">${p.name}</div>
            <div class="text-[10px] text-gray-400 font-mono">${p.id}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-4 text-xs font-semibold text-gray-600">
        ${p.categoryLabel || p.category}
      </td>
      <td class="py-3 px-4 font-bold text-black font-sans text-xs">
        ฿${Number(p.price || 0).toLocaleString()}
      </td>
      <td class="py-3 px-4">
        <div class="flex flex-wrap gap-1">
          ${(p.sizes || ["S", "M", "L"]).map(s => `<span class="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">${s}</span>`).join("")}
        </div>
      </td>
      <td class="py-3 px-4 text-xs">
        <span class="font-bold ${p.stock < 10 ? 'text-red-600' : 'text-gray-800'}">${p.stock}</span> ชิ้น
      </td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-2">
          <button type="button" onclick="openEditProductModal('${p.id}')" class="px-2.5 py-1.5 bg-neutral-100 hover:bg-black hover:text-white rounded text-xs font-semibold text-gray-700 transition" title="แก้ไข">
            <i class="fa-solid fa-pen-to-square"></i> แก้ไข
          </button>
          <button type="button" onclick="handleDeleteProduct('${p.id}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white rounded text-xs font-semibold text-red-600 transition" title="ลบ">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderAdminOrdersTable(filterStatus = "all") {
  const tableBody = document.getElementById("adminOrdersTableBody");
  if (!tableBody) return;

  let orders = getStoredOrders();
  if (filterStatus !== "all") {
    orders = orders.filter(o => o.status === filterStatus);
  }

  if (orders.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-gray-400 text-xs">
          ไม่พบคำสั่งซื้อในหมวดหมู่นี้
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = orders.map(o => `
    <tr class="border-b border-gray-100 hover:bg-neutral-50 transition">
      <td class="py-3 px-4 font-mono font-bold text-xs text-black">${o.orderId}</td>
      <td class="py-3 px-4 text-[11px] text-gray-500">${o.date}</td>
      <td class="py-3 px-4">
        <div class="text-xs font-bold text-gray-900">${o.customerName}</div>
        <div class="text-[10px] text-gray-400">${o.customerEmail} | ${o.customerPhone}</div>
      </td>
      <td class="py-3 px-4 text-xs">
        <div class="max-w-[200px] truncate text-gray-700" title="${o.items.map(i => `${i.name} (${i.size}) x${i.quantity}`).join(', ')}">
          ${o.items.map(i => `${i.name} (${i.size}) x${i.quantity}`).join(', ')}
        </div>
      </td>
      <td class="py-3 px-4 font-bold text-black font-sans text-xs">฿${o.grandTotal.toLocaleString()}</td>
      <td class="py-3 px-4">
        <span class="status-badge ${o.status === 'จัดส่งแล้ว' ? 'status-shipped' : o.status === 'กำลังเตรียมจัดส่ง' ? 'status-processing' : 'status-pending'}">
          ${o.status}
        </span>
        ${o.trackingNumber ? `<div class="text-[10px] text-emerald-700 font-mono mt-1 font-bold"><i class="fa-solid fa-truck text-[9px]"></i> ${o.trackingNumber}</div>` : ''}
      </td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-1.5">
          ${o.slipImage ? `
            <button onclick="openAdminSlipModal('${o.orderId}')" class="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-[11px] font-bold rounded transition flex items-center gap-1" title="ดูสลิปโอนเงิน">
              <i class="fa-solid fa-receipt"></i> สลิป
            </button>
          ` : ''}
          <!-- Change Status Dropdown / Action -->
          ${o.status === "รอชำระเงิน" ? `
            <button onclick="handleQuickOrderStatus('${o.orderId}', 'กำลังเตรียมจัดส่ง')" class="px-2 py-1 bg-black text-white hover:bg-neutral-800 text-[11px] font-bold rounded transition">
              รับออเดอร์
            </button>
          ` : ''}
          <button onclick="openTrackingModal('${o.orderId}')" class="px-2 py-1 border border-neutral-300 hover:border-black text-neutral-800 text-[11px] font-bold rounded transition">
            <i class="fa-solid fa-truck-fast"></i> จัดส่ง/เลขพัสดุ
          </button>
          <button onclick="handleDeleteOrder('${o.orderId}')" class="px-2 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 text-[11px] font-bold rounded transition flex items-center gap-1" title="ลบออเดอร์นี้">
            <i class="fa-solid fa-trash-can"></i> ลบ
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function handleDeleteOrder(orderId) {
  if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบคำสั่งซื้อรหัส "${orderId}" ออกจากระบบ?`)) {
    deleteOrder(orderId);
    renderAdminOrdersTable();
    renderAdminStats();
    showToast(`ลบคำสั่งซื้อ ${orderId} เรียบร้อยแล้ว`, "info");
  }
}

function openAdminSlipModal(orderId) {
  const orders = getStoredOrders();
  const order = orders.find(o => o.orderId === orderId);
  if (!order || !order.slipImage) {
    showToast("คำสั่งซื้อนี้ไม่มีรูปภาพสลิปแนบมา", "warning");
    return;
  }

  const modal = document.getElementById("adminSlipModal");
  if (!modal) return;

  const orderIdEl = document.getElementById("slipModalOrderId");
  const amountEl = document.getElementById("slipModalAmount");
  const imgEl = document.getElementById("slipModalImage");

  if (orderIdEl) orderIdEl.innerText = order.orderId;
  if (amountEl) amountEl.innerText = `฿${order.grandTotal.toLocaleString()}`;
  if (imgEl) imgEl.src = order.slipImage;

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeAdminSlipModal() {
  const modal = document.getElementById("adminSlipModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

function handleQuickOrderStatus(orderId, newStatus) {
  updateOrderStatus(orderId, newStatus);
  renderAdminOrdersTable();
  renderAdminStats();
  showToast(`อัปเดตสถานะคำสั่งซื้อเป็น "${newStatus}" แล้ว`, "success");
}

function openTrackingModal(orderId) {
  const orders = getStoredOrders();
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;

  const modal = document.getElementById("trackingModal");
  if (!modal) return;

  document.getElementById("trackingOrderId").value = order.orderId;
  document.getElementById("trackingNumberInput").value = order.trackingNumber || "";
  document.getElementById("trackingCourierSelect").value = order.courier || "SPX Express";
  document.getElementById("trackingStatusSelect").value = order.status || "กำลังเตรียมจัดส่ง";

  modal.classList.add("open");
}

function closeTrackingModal() {
  const modal = document.getElementById("trackingModal");
  if (modal) modal.classList.remove("open");
}

function submitTrackingForm(event) {
  event.preventDefault();
  const orderId = document.getElementById("trackingOrderId")?.value;
  const trackingNumber = document.getElementById("trackingNumberInput")?.value.trim();
  const courier = document.getElementById("trackingCourierSelect")?.value;
  const status = document.getElementById("trackingStatusSelect")?.value;

  if (!orderId) return;

  updateOrderTracking(orderId, trackingNumber, courier);
  if (status) updateOrderStatus(orderId, status);

  closeTrackingModal();
  renderAdminOrdersTable();
  renderAdminStats();
  showToast(`อัปเดตข้อมูลพัสดุและสถานะสำหรับ ${orderId} สำเร็จ`, "success");
}

// ==========================================================================
// IMAGE MANAGEMENT & GALLERY MODULE (images/ Folder Integration)
// จัดการรูปภาพในโฟลเดอร์ images/ โดยตรง, อัปโหลดเข้าโฟลเดอร์, และคลังภาพ 153+ รูป
// ==========================================================================

const BUILTIN_CLOTHES_IMAGES = [
  "S__21970948_0.jpg","S__21970949_0.jpg","S__21970950_0.jpg","S__21970951_0.jpg","S__21970952_0.jpg","S__21970953_0.jpg",
  "S__22102020_0.jpg","S__22102021_0.jpg","S__22102022_0.jpg","S__22102023_0.jpg","S__22102024_0.jpg","S__22102025_0.jpg",
  "S__22102026_0.jpg","S__22102027_0.jpg","S__22102028_0.jpg","S__22102029_0.jpg","S__22102031_0.jpg","S__22102032_0.jpg",
  "S__22102033_0.jpg","S__22102034_0.jpg","S__22102035_0.jpg","S__22102036_0.jpg","S__22102037_0.jpg","S__22102038_0.jpg",
  "S__22102039_0.jpg","S__22102040_0.jpg","S__22102042_0.jpg","S__22102043_0.jpg","S__22102044_0.jpg","S__22102045_0.jpg",
  "S__22102046_0.jpg","S__22102047_0.jpg","S__22102048_0.jpg","S__22102049_0.jpg","S__22102050_0.jpg","S__22102051_0.jpg",
  "S__22102053_0.jpg","S__22102054_0.jpg","S__22102055_0.jpg","S__22102056_0.jpg","S__22102057_0.jpg","S__22102058_0.jpg",
  "S__22102059_0.jpg","S__22102060_0.jpg","S__22102061_0.jpg","S__22102062_0.jpg","S__22102064_0.jpg","S__22102065_0.jpg",
  "S__22102066_0.jpg","S__22102067_0.jpg","S__22102068_0.jpg","S__22102069_0.jpg","S__22102070_0.jpg","S__22102071_0.jpg",
  "S__22102072_0.jpg","S__22102073_0.jpg","S__22102074.jpg","S__22102076_0.jpg","S__22102077_0.jpg","S__22102078_0.jpg",
  "S__22102079_0.jpg","S__22102080_0.jpg","S__22102081_0.jpg","S__22102082_0.jpg","S__22102083_0.jpg","S__22102084_0.jpg",
  "S__22102085_0.jpg","S__22102087_0.jpg","S__22102088_0.jpg","S__22102089_0.jpg","S__22102090_0.jpg","S__22102091_0.jpg",
  "S__22102092_0.jpg","S__22102093_0.jpg","S__22102094_0.jpg","S__22102095_0.jpg","S__22102096_0.jpg","S__22102098_0.jpg",
  "S__22102099_0.jpg","S__22102100_0.jpg","S__22102101_0.jpg","S__22102102_0.jpg","S__22102103_0.jpg","S__22102104_0.jpg",
  "S__22102105_0.jpg","S__22102106_0.jpg","S__22102107_0.jpg","S__22102109_0.jpg","S__22102110_0.jpg","S__22102111_0.jpg",
  "S__22102112_0.jpg","S__22102113_0.jpg","S__22102114_0.jpg","S__22102115_0.jpg","S__22102116_0.jpg","S__22102117_0.jpg",
  "S__22102118_0.jpg","S__22102120_0.jpg","S__22102121_0.jpg","S__22102122_0.jpg","S__22102123_0.jpg","S__22102124_0.jpg",
  "S__22102125_0.jpg","S__22102126_0.jpg","S__22102127_0.jpg","S__22102128_0.jpg","S__22102129_0.jpg","S__22102131_0.jpg",
  "S__22102132_0.jpg","S__22102133_0.jpg","S__22102134_0.jpg","S__22102135_0.jpg","S__22102136_0.jpg","S__22102137_0.jpg",
  "S__22102138_0.jpg","S__22102139_0.jpg","S__22102140_0.jpg","S__22102142_0.jpg","S__22102143_0.jpg","S__22102144_0.jpg",
  "S__22102145_0.jpg","S__22102146_0.jpg","S__22102147_0.jpg","S__22102148_0.jpg","S__22102149_0.jpg","S__22102150_0.jpg",
  "S__22102151_0.jpg","S__22102153_0.jpg","S__22102154_0.jpg","S__22102155_0.jpg","S__22102156_0.jpg","S__22102157_0.jpg",
  "S__22102158_0.jpg","S__22102159_0.jpg","S__22102160_0.jpg","S__22102161_0.jpg","S__22102162_0.jpg","S__22102164_0.jpg",
  "S__22102165_0.jpg","S__22102166_0.jpg","S__22102167_0.jpg","S__22102168_0.jpg","S__22102169_0.jpg","S__22102170_0.jpg",
  "S__22102171_0.jpg","S__22102172_0.jpg","S__22102173_0.jpg","S__22102175_0.jpg","S__22102176_0.jpg","S__22102177_0.jpg",
  "S__22102178_0.jpg","S__22102179_0.jpg","S__22102180_0.jpg"
];

const BUILTIN_ROOT_IMAGES = [
  "hero_banner_1.jpg",
  "hero_banner_2.jpg",
  "hero_banner_3.jpg",
  "promptpay_qr.png",
  "vortex_logo.png"
];

let appImageCatalog = [
  ...BUILTIN_CLOTHES_IMAGES.map(name => ({ name, path: `images/เสื้อผ้า/${name}`, folder: "เสื้อผ้า" })),
  ...BUILTIN_ROOT_IMAGES.map(name => ({ name, path: `images/${name}`, folder: "root" })),
  { name: "S__22945796.jpg", path: "images/icons/S__22945796.jpg", folder: "icons" }
];

let gallerySelectedImages = [];
let galleryCurrentFilter = "all";
let gallerySearchKeyword = "";

// ฟังก์ชันตรวจหา Base URL ของเซิร์ฟเวอร์ (รองรับทั้งเปิดผ่าน http://localhost:3000 และ file:///)
function getServerApiBase() {
  if (window.location.protocol.startsWith("http")) {
    return "";
  }
  return "http://localhost:3000";
}

let _imageSyncStream = null;
let _imageSyncPollingInterval = null;
let _isRealtimeSyncing = false;

// ดึงรายชื่อรูปภาพจากเซิร์ฟเวอร์แบบ Real-time และอัปเดต UI ทันที
async function syncImagesCatalogFromServer(showUserToast = false) {
  const apiBase = getServerApiBase();
  const rescanIcon = document.getElementById("rescanImagesIcon");
  if (rescanIcon) rescanIcon.classList.add("fa-spin");

  try {
    const res = await fetch(`${apiBase}/api/images-list?_t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.images)) {
      applyNewImagesCatalog(data.images);
      if (showUserToast) {
        showToast(`อัปเดตคลังรูปภาพเรียบร้อยแล้ว (${data.images.length} รูป)`, "success");
      }
    }
  } catch (err) {
    if (showUserToast) {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์สำหรับสแกนรูปภาพได้", "warning");
    }
  } finally {
    if (rescanIcon) {
      setTimeout(() => rescanIcon.classList.remove("fa-spin"), 500);
    }
  }
}

// นำแคตตาล็อกรูปภาพชุดใหม่มาอัปเดตลงในระบบ
function applyNewImagesCatalog(newImages) {
  if (!Array.isArray(newImages) || newImages.length === 0) return;

  const prevCount = appImageCatalog.length;
  // แปลง path ให้เป็น forward-slash ทั้งหมด
  const normalized = newImages.map(item => ({
    ...item,
    path: item.path.replace(/\\/g, "/")
  }));

  appImageCatalog = normalized;
  updateGalleryBadges();

  // หากโมดอลเลือกรูปภาพกำลังเปิดอยู่ ให้รีเรนเดอร์กริดทันที เพื่อให้รูปใหม่ปรากฏทันที
  const modal = document.getElementById("imageGalleryModal");
  if (modal && modal.classList.contains("open")) {
    renderImageGalleryGrid();
  }

  // หากมีการเพิ่มรูปใหม่ ให้แสดง Toast แจ้งเตือนแอดมิน
  if (prevCount > 0 && normalized.length > prevCount) {
    const diff = normalized.length - prevCount;
    showToast(`📸 ตรวจพบรูปใหม่ในโฟลเดอร์ images/ (+${diff} รูป) รวม ${normalized.length} รูป`, "info");
  }
}

// เริ่มต้นระบบตรวจจับไฟล์รูปภาพอัตโนมัติตลอดเวลา (Server-Sent Events + Polling Fallback)
function initRealtimeImageSync() {
  if (_isRealtimeSyncing) return;
  _isRealtimeSyncing = true;

  const apiBase = getServerApiBase();

  // 1. ดึงข้อมูลครั้งแรกทันที
  syncImagesCatalogFromServer();

  // 2. เชื่อมต่อ Server-Sent Events (SSE) จาก server.js เพื่อรับแจ้งเตือนทันทีที่มีไฟล์เข้าโฟลเดอร์
  if (typeof EventSource !== "undefined") {
    try {
      if (_imageSyncStream) _imageSyncStream.close();
      _imageSyncStream = new EventSource(`${apiBase}/api/images-stream`);

      _imageSyncStream.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && Array.isArray(payload.images)) {
            applyNewImagesCatalog(payload.images);
            updateLiveSyncUI(true);
          }
        } catch (e) {}
      };

      _imageSyncStream.onopen = () => {
        console.log("⚡ VORTEX Live Folder Watcher connected!");
        updateLiveSyncUI(true);
      };

      _imageSyncStream.onerror = () => {
        // หากหลุดการเชื่อมต่อ ให้เริ่ม Polling สำรอง
        updateLiveSyncUI(false);
        startImagePollingFallback();
      };
    } catch (err) {
      updateLiveSyncUI(false);
      startImagePollingFallback();
    }
  } else {
    updateLiveSyncUI(false);
    startImagePollingFallback();
  }
}

function startImagePollingFallback() {
  if (_imageSyncPollingInterval) return;
  _imageSyncPollingInterval = setInterval(() => {
    syncImagesCatalogFromServer();
  }, 2500);
}

function updateLiveSyncUI(isLive) {
  const ind = document.getElementById("galleryLiveSyncIndicator");
  if (ind) {
    ind.className = isLive 
      ? "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-300";
    ind.innerHTML = isLive
      ? `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>ซิงค์โฟลเดอร์สด (Auto-Sync)</span>`
      : `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>ตรวจจับอัตโนมัติ (Polling)</span>`;
  }
  const pulseDot = document.getElementById("galleryLivePulseDot");
  if (pulseDot) {
    pulseDot.className = isLive
      ? "w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"
      : "w-2 h-2 rounded-full bg-amber-400 inline-block";
  }
}

async function openImageGalleryModal() {
  const modal = document.getElementById("imageGalleryModal");
  if (!modal) return;
  gallerySelectedImages = [];
  gallerySearchKeyword = "";
  const searchInput = document.getElementById("gallerySearchInput");
  if (searchInput) searchInput.value = "";
  setGalleryFilter("all");
  
  // สแกนดึงข้อมูลล่าสุดจากโฟลเดอร์ทันทีที่เปิด
  await syncImagesCatalogFromServer();
  renderImageGalleryGrid();
  updateGalleryBadges();
  modal.classList.add("open");
}

function closeImageGalleryModal() {
  const modal = document.getElementById("imageGalleryModal");
  if (modal) modal.classList.remove("open");
}

function updateGalleryBadges() {
  const badge = document.getElementById("galleryTotalBadge");
  const countBadge = document.getElementById("galleryCountBadge");
  const count = appImageCatalog.length;
  if (badge) badge.innerText = `${count} รูป`;
  if (countBadge) countBadge.innerText = `${count} รูป`;
  const selCount = document.getElementById("gallerySelectedCount");
  if (selCount) selCount.innerText = String(gallerySelectedImages.length);
}

function setGalleryFilter(filter) {
  galleryCurrentFilter = filter;
  document.querySelectorAll(".gallery-tab-btn").forEach(btn => {
    btn.className = "gallery-tab-btn px-3 py-1 rounded-lg text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-gray-700 transition";
  });
  const activeTab = document.getElementById(filter === "all" ? "galleryTab_all" : filter === "เสื้อผ้า" ? "galleryTab_clothes" : "galleryTab_root");
  if (activeTab) {
    activeTab.className = "gallery-tab-btn px-3 py-1 rounded-lg text-xs font-bold bg-black text-white transition";
  }
  renderImageGalleryGrid();
}

function handleGallerySearch() {
  const input = document.getElementById("gallerySearchInput");
  gallerySearchKeyword = input ? input.value.trim().toLowerCase() : "";
  renderImageGalleryGrid();
}

function toggleGallerySelect(imagePath) {
  const index = gallerySelectedImages.indexOf(imagePath);
  if (index > -1) {
    gallerySelectedImages.splice(index, 1);
  } else {
    gallerySelectedImages.push(imagePath);
  }
  updateGalleryBadges();
  renderImageGalleryGrid();
}

function renderImageGalleryGrid() {
  const grid = document.getElementById("galleryGrid");
  const empty = document.getElementById("galleryEmpty");
  if (!grid) return;

  let filtered = appImageCatalog;
  if (galleryCurrentFilter === "เสื้อผ้า") {
    filtered = filtered.filter(img => img.folder === "เสื้อผ้า");
  } else if (galleryCurrentFilter === "root") {
    filtered = filtered.filter(img => img.folder === "root" || img.folder === "icons" || img.folder === "images");
  }

  if (gallerySearchKeyword) {
    filtered = filtered.filter(img => 
      img.name.toLowerCase().includes(gallerySearchKeyword) || 
      img.path.toLowerCase().includes(gallerySearchKeyword)
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");

  grid.innerHTML = filtered.map(img => {
    const isSelected = gallerySelectedImages.includes(img.path);
    return `
      <div 
        onclick="toggleGallerySelect('${img.path}')" 
        class="relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all group ${
          isSelected ? 'border-black ring-2 ring-black/20 shadow-md scale-95' : 'border-neutral-200 hover:border-neutral-400 hover:shadow-xs'
        }"
        style="aspect-ratio: 1;"
        title="${img.name}"
      >
        <img 
          src="${img.path}" 
          alt="${img.name}" 
          class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" 
          loading="lazy" 
          onerror="this.src='https://placehold.co/150x150?text=IMG'" 
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5 pointer-events-none">
          <span class="text-[10px] text-white font-mono truncate">${img.name}</span>
        </div>
        ${isSelected ? `
          <div class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs shadow-md">
            <i class="fa-solid fa-check"></i>
          </div>
        ` : `
          <div class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 hover:bg-white text-gray-400 group-hover:flex items-center justify-center text-xs shadow-sm hidden">
            <i class="fa-solid fa-plus text-black"></i>
          </div>
        `}
      </div>
    `;
  }).join("");
}

function applySelectedGalleryImages() {
  if (gallerySelectedImages.length === 0) {
    showToast("กรุณาเลือกรูปภาพอย่างน้อย 1 รูป", "warning");
    return;
  }
  gallerySelectedImages.forEach(path => {
    if (!crudUploadedImages.includes(path)) {
      crudUploadedImages.push(path);
    }
  });
  renderCrudImagePreview();
  showToast(`เพิ่มรูปภาพเข้าสินค้าสำเร็จ (${gallerySelectedImages.length} รูป)`, "success");
  closeImageGalleryModal();
}

// เก็บรูปที่เลือกใน Admin Product Form
let crudUploadedImages = [];

function renderCrudImagePreview() {
  const grid = document.getElementById("crudImagePreviewGrid");
  if (!grid) return;
  grid.innerHTML = crudUploadedImages.map((src, i) => `
    <div class="relative group rounded-lg overflow-hidden border border-neutral-200" style="aspect-ratio:1">
      <img src="${src}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/150x150?text=IMG'" />
      <button type="button" onclick="removeCrudImage(${i})"
        class="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-700 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join("");
}

function removeCrudImage(index) {
  crudUploadedImages.splice(index, 1);
  renderCrudImagePreview();
}

async function handleCrudImageChange(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const grid = document.getElementById("crudImagePreviewGrid");
  const statusEl = document.createElement("div");
  statusEl.id = "crudImageProcessingStatus";
  statusEl.className = "col-span-full py-2.5 px-3 bg-neutral-100 border border-neutral-300 rounded-lg text-xs font-bold text-gray-800 flex items-center gap-2 shadow-xs";
  statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-black text-sm"></i> <span>กำลังประมวลผลรูปภาพ (${files.length} รูป)... ระบบจัดเก็บเข้าโฟลเดอร์ images</span>`;
  if (grid) grid.prepend(statusEl);

  let successCount = 0;
  try {
    for (const file of files) {
      try {
        const compressedUrl = await compressImageFile(file, 800, 800, 0.70);
        let finalPath = null;

        // ถ้าเปิดผ่านเซิร์ฟเวอร์ ให้ส่งบันทึกเป็นไฟล์จริงลงโฟลเดอร์ images/เสื้อผ้า/ โดยตรง
        if (window.location.protocol.startsWith("http")) {
          try {
            const res = await fetch("/api/upload-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                filename: file.name,
                data: compressedUrl,
                folder: "เสื้อผ้า"
              })
            });
            if (res.ok) {
              const resData = await res.json();
              if (resData.success && resData.url) {
                finalPath = resData.url;
                appImageCatalog.unshift({
                  name: resData.filename,
                  path: resData.url,
                  folder: "เสื้อผ้า"
                });
                updateGalleryBadges();
              }
            }
          } catch (netErr) {
            console.log("Server upload unavailable, using optimized data URL");
          }
        }

        // กรณีไม่มีเซิร์ฟเวอร์ ให้ใช้ DataURL ที่บีบอัดแล้ว
        crudUploadedImages.push(finalPath || compressedUrl);
        successCount++;
      } catch (errOne) {
        console.error("Failed to process one image:", errOne);
      }
    }
    if (successCount > 0) {
      showToast(`เพิ่มรูปภาพสำเร็จ (${successCount} รูป) จัดเก็บเข้า images/ เรียบร้อย`, "success");
    }
  } catch (err) {
    console.error("Error compressing product images:", err);
    showToast(err.message || "เกิดข้อผิดพลาดในการประมวลผลภาพ", "error");
  } finally {
    const status = document.getElementById("crudImageProcessingStatus");
    if (status) status.remove();
    renderCrudImagePreview();
    event.target.value = "";
  }
}

function handleAddCrudImageUrl() {
  const input = document.getElementById("crudImageUrlInput");
  if (!input) return;
  const rawUrl = input.value.trim();
  if (!rawUrl) {
    showToast("กรุณาระบุ URL หรือชื่อไฟล์รูปภาพ", "warning");
    return;
  }
  const normalizedUrl = normalizeImagePath(rawUrl);
  crudUploadedImages.push(normalizedUrl);
  input.value = "";
  renderCrudImagePreview();
  showToast(`เพิ่มรูปภาพ "${normalizedUrl}" สำเร็จ`, "success");
}

function handleAdminProductSearch() {
  const searchInput = document.getElementById("adminProductSearchInput");
  const catSelect = document.getElementById("adminProductCategoryFilter");
  const keyword = searchInput ? searchInput.value : "";
  const cat = catSelect ? catSelect.value : "all";
  renderAdminProductsTable(keyword, cat);
}

function openAddProductModal() {
  const modal = document.getElementById("productCrudModal");
  if (!modal) return;

  document.getElementById("crudModalTitle").innerText = "เพิ่มสินค้าใหม่";
  document.getElementById("crudProductId").value = "";
  document.getElementById("crudProductName").value = "";
  document.getElementById("crudProductPrice").value = "";
  document.getElementById("crudProductOriginalPrice").value = "";
  document.getElementById("crudProductCategory").value = "t-shirts";
  document.getElementById("crudProductStock").value = "50";
  document.getElementById("crudProductDesc").value = "";

  const urlInput = document.getElementById("crudImageUrlInput");
  if (urlInput) urlInput.value = "";

  // Reset image upload
  crudUploadedImages = [];
  renderCrudImagePreview();

  // Reset checkboxes
  document.querySelectorAll(".crud-size-checkbox").forEach(cb => cb.checked = ["S", "M", "L", "XL"].includes(cb.value));

  modal.classList.add("open");
}

function openEditProductModal(productId) {
  const product = getStoredProducts().find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById("productCrudModal");
  if (!modal) return;

  document.getElementById("crudModalTitle").innerText = `แก้ไขสินค้า (${product.id})`;
  document.getElementById("crudProductId").value = product.id;
  document.getElementById("crudProductName").value = product.name || "";
  document.getElementById("crudProductPrice").value = product.price || "";
  document.getElementById("crudProductOriginalPrice").value = product.originalPrice || product.price || "";
  document.getElementById("crudProductCategory").value = product.category || "t-shirts";
  document.getElementById("crudProductStock").value = product.stock !== undefined ? product.stock : "50";
  document.getElementById("crudProductDesc").value = product.description || "";

  const urlInput = document.getElementById("crudImageUrlInput");
  if (urlInput) urlInput.value = "";

  // โหลดรูปเดิมเข้า crudUploadedImages
  crudUploadedImages = product.images ? [...product.images] : [];
  renderCrudImagePreview();

  // Checkboxes
  document.querySelectorAll(".crud-size-checkbox").forEach(cb => {
    cb.checked = (product.sizes || []).includes(cb.value);
  });

  modal.classList.add("open");
}

function closeProductCrudModal() {
  const modal = document.getElementById("productCrudModal");
  if (modal) modal.classList.remove("open");
  crudUploadedImages = [];
  const grid = document.getElementById("crudImagePreviewGrid");
  if (grid) grid.innerHTML = "";
}

function submitProductCrudForm(event) {
  event.preventDefault();

  const id = document.getElementById("crudProductId")?.value;
  const name = document.getElementById("crudProductName")?.value.trim();
  const price = document.getElementById("crudProductPrice")?.value;
  const originalPrice = document.getElementById("crudProductOriginalPrice")?.value;
  const category = document.getElementById("crudProductCategory")?.value;
  const stock = document.getElementById("crudProductStock")?.value;
  const description = document.getElementById("crudProductDesc")?.value.trim();

  const selectedSizes = Array.from(document.querySelectorAll(".crud-size-checkbox:checked")).map(cb => cb.value);

  if (!name || !price) {
    showToast("กรุณากรอกชื่อสินค้าและราคาขาย", "warning");
    return;
  }

  const payload = {
    name,
    price,
    originalPrice,
    category,
    images: crudUploadedImages.length > 0 ? [...crudUploadedImages] : undefined,
    sizes: selectedSizes.length > 0 ? selectedSizes : ["S", "M", "L", "XL"],
    stock,
    description
  };

  try {
    if (id) {
      updateProduct(id, payload);
      showToast(`แก้ไขข้อมูลสินค้า "${name}" สำเร็จ`, "success");
    } else {
      addProduct(payload);
      showToast(`เพิ่มสินค้า "${name}" สำเร็จ พร้อมแสดงผลทั้งหน้าร้านและหลังบ้านทันที`, "success");
    }
  } catch (err) {
    console.error("Error saving product:", err);
    showToast("เกิดข้อผิดพลาดในการบันทึกสินค้า: " + err.message, "error");
  }

  closeProductCrudModal();
  renderAdminProductsTable();
  renderAdminStats();
}

async function handleDeleteProduct(productId) {
  if (confirm(`คุณต้องการลบสินค้ารหัส ${productId} ออกจากร้านใช่หรือไม่?`)) {
    const success = await deleteProduct(productId);
    if (success) {
      renderAdminProductsTable();
      renderAdminStats();
      showToast("ลบสินค้าเรียบร้อยแล้ว", "info");
    } else {
      showToast("เกิดข้อผิดพลาดในการลบสินค้า", "error");
    }
  }
}

function setupAdminEvents() {
  const orderFilterTabs = document.querySelectorAll(".admin-order-filter-btn");
  orderFilterTabs.forEach(btn => {
    btn.addEventListener("click", () => {
      orderFilterTabs.forEach(b => b.classList.replace("bg-black", "bg-white"));
      orderFilterTabs.forEach(b => b.classList.replace("text-white", "text-gray-700"));
      btn.classList.replace("bg-white", "bg-black");
      btn.classList.replace("text-gray-700", "text-white");
      renderAdminOrdersTable(btn.getAttribute("data-status"));
    });
  });

  // ปิด modal เมื่อคลิกพื้นที่สีดำรอบนอก (Backdrop)
  ["productCrudModal", "trackingModal", "adminSlipModal", "userCrudModal", "reviewImageLightboxModal"].forEach(id => {
    const modalEl = document.getElementById(id);
    if (modalEl) {
      modalEl.addEventListener("click", (e) => {
        if (e.target === modalEl) {
          modalEl.classList.remove("open");
          document.body.style.overflow = "";
        }
      });
    }
  });
}

/* ==========================================================================
   ADMIN USER CRUD & SEARCH CONTROLLER
   ========================================================================== */
function handleAdminUserSearch() {
  const search = document.getElementById("adminUserSearchInput")?.value || "";
  const role = document.getElementById("adminUserRoleFilter")?.value || "all";
  renderAdminUsersTable(search, role);
}

function openAddUserModal() {
  const modal = document.getElementById("userCrudModal");
  if (!modal) return;

  document.getElementById("userCrudModalTitle").innerText = "เพิ่มสมาชิกใหม่";
  document.getElementById("crudUserId").value = "";
  
  const idWrap = document.getElementById("crudUserIdDisplayWrap");
  if (idWrap) idWrap.classList.add("hidden");

  document.getElementById("crudUserName").value = "";
  document.getElementById("crudUserEmail").value = "";
  document.getElementById("crudUserPhone").value = "";
  document.getElementById("crudUserRole").value = "customer";

  const passInput = document.getElementById("crudUserPassword");
  if (passInput) {
    passInput.value = "";
    passInput.required = true;
    passInput.type = "password";
  }

  const passLabel = document.getElementById("crudUserPasswordLabel");
  if (passLabel) passLabel.innerText = "รหัสผ่าน (Password) *";

  const passHint = document.getElementById("crudUserPasswordHint");
  if (passHint) passHint.innerText = "* ต้องระบุรหัสผ่านสำหรับการเข้าสู่ระบบของสมาชิกใหม่";

  const eyeIcon = document.getElementById("crudPasswordEyeIcon");
  if (eyeIcon) {
    eyeIcon.classList.remove("fa-eye-slash");
    eyeIcon.classList.add("fa-eye");
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function openEditUserModal(userId) {
  const user = getUsers().find(u => u.id === userId);
  if (!user) {
    showToast("ไม่พบข้อมูลสมาชิก", "error");
    return;
  }

  const modal = document.getElementById("userCrudModal");
  if (!modal) return;

  document.getElementById("userCrudModalTitle").innerText = `แก้ไขข้อมูลสมาชิก (${user.name})`;
  document.getElementById("crudUserId").value = user.id;

  const idWrap = document.getElementById("crudUserIdDisplayWrap");
  const idDisplay = document.getElementById("crudUserIdDisplay");
  if (idWrap && idDisplay) {
    idWrap.classList.remove("hidden");
    idDisplay.innerText = user.id;
  }

  document.getElementById("crudUserName").value = user.name || "";
  document.getElementById("crudUserEmail").value = user.email || "";
  document.getElementById("crudUserPhone").value = user.phone && user.phone !== "-" ? user.phone : "";
  document.getElementById("crudUserRole").value = user.role || "customer";

  const passInput = document.getElementById("crudUserPassword");
  if (passInput) {
    passInput.value = "";
    passInput.required = false;
    passInput.type = "password";
  }

  const passLabel = document.getElementById("crudUserPasswordLabel");
  if (passLabel) passLabel.innerText = "เปลี่ยนรหัสผ่านใหม่ (ระบุเมื่อต้องการเปลี่ยน)";

  const passHint = document.getElementById("crudUserPasswordHint");
  if (passHint) passHint.innerText = "* ปล่อยว่างไว้หากต้องการใช้รหัสผ่านเดิม (รหัสผ่านปัจจุบัน: " + (user.password ? "••••••••" : "ไม่มี") + ")";

  const eyeIcon = document.getElementById("crudPasswordEyeIcon");
  if (eyeIcon) {
    eyeIcon.classList.remove("fa-eye-slash");
    eyeIcon.classList.add("fa-eye");
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeUserCrudModal() {
  const modal = document.getElementById("userCrudModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

function toggleCrudPasswordVisibility() {
  const passInput = document.getElementById("crudUserPassword");
  const eyeIcon = document.getElementById("crudPasswordEyeIcon");
  if (!passInput || !eyeIcon) return;

  if (passInput.type === "password") {
    passInput.type = "text";
    eyeIcon.classList.remove("fa-eye");
    eyeIcon.classList.add("fa-eye-slash");
  } else {
    passInput.type = "password";
    eyeIcon.classList.remove("fa-eye-slash");
    eyeIcon.classList.add("fa-eye");
  }
}

function submitUserCrudForm(event) {
  event.preventDefault();

  const id = document.getElementById("crudUserId")?.value;
  const name = document.getElementById("crudUserName")?.value.trim();
  const email = document.getElementById("crudUserEmail")?.value.trim();
  const phone = document.getElementById("crudUserPhone")?.value.trim();
  const role = document.getElementById("crudUserRole")?.value;
  const password = document.getElementById("crudUserPassword")?.value.trim();

  if (!name || !email) {
    showToast("กรุณากรอกชื่อและอีเมล/ชื่อผู้ใช้", "warning");
    return;
  }

  if (id) {
    // อัปเดตสมาชิกเดิม
    const res = updateUser(id, { name, email, phone, role, password });
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast(`อัปเดตข้อมูลของ "${name}" เรียบร้อยแล้ว`, "success");
  } else {
    // เพิ่มสมาชิกใหม่
    if (!password) {
      showToast("กรุณาระบุรหัสผ่านสำหรับสมาชิกใหม่", "warning");
      return;
    }
    const res = addUser({ name, email, phone, role, password });
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast(`เพิ่มสมาชิกใหม่ "${name}" สำเร็จ`, "success");
  }

  closeUserCrudModal();
  handleAdminUserSearch();
  renderAdminStats();
}

function handleDeleteUser(userId) {
  const user = getUsers().find(u => u.id === userId);
  if (!user) return;

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    alert("คุณไม่สามารถลบบัญชีผู้ดูแลระบบที่กำลังเข้าสู่ระบบอยู่ในขณะนี้ได้!");
    return;
  }

  if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิก "${user.name}" (${user.email}) ออกจากระบบ?`)) {
    const res = deleteUser(userId);
    if (!res.success) {
      showToast(res.message, "error");
      return;
    }
    showToast(`ลบสมาชิก "${user.name}" เรียบร้อยแล้ว`, "info");
    handleAdminUserSearch();
    renderAdminStats();
  }
}

/* ==========================================================================
   TOAST NOTIFICATION SYSTEM
   ========================================================================== */
function showToast(message, type = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const icons = {
    success: '<i class="fa-solid fa-circle-check text-green-500"></i>',
    error: '<i class="fa-solid fa-circle-xmark text-red-500"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation text-amber-500"></i>',
    info: '<i class="fa-solid fa-circle-info text-black"></i>'
  };

  toast.className = "toast-item flex items-center gap-3 px-4 py-3 bg-white text-gray-800 text-xs font-medium rounded-lg shadow-xl border border-gray-200 pointer-events-auto min-w-[260px] max-w-[340px]";
  toast.innerHTML = `
    <span class="text-base shrink-0">${icons[type] || icons.info}</span>
    <span class="flex-1 leading-snug">${message}</span>
    <button onclick="this.parentElement.remove()" class="text-gray-400 hover:text-black p-1"><i class="fa-solid fa-xmark"></i></button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
}

/* ==========================================================================
   Luxury Streetwear Interactive Utilities
   ========================================================================== */
function initScrollReveal() {
  const elements = document.querySelectorAll(".reveal-on-scroll");
  if (!elements.length) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: "0px 0px -30px 0px"
    });

    elements.forEach(el => observer.observe(el));
  } else {
    elements.forEach(el => el.classList.add("is-visible"));
  }
}

function initBackToTop() {
  const btn = document.getElementById("backToTopBtn");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }, { passive: true });
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}
window.scrollToTop = scrollToTop;

/* ==========================================================================
   LIVE CHAT SYSTEM (STOREFRONT & ADMIN REAL-TIME SYNC)
   ========================================================================== */

const chatChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('voetex_chat_sync') : null;
let chatSyncInitialized = false;

function getStoredChats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CHATS)) || {};
  } catch (e) {
    return {};
  }
}

function saveStoredChats(chats, triggerSync = true) {
  localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  if (db && chats && typeof chats === 'object') {
    Object.keys(chats).forEach(customerId => {
      db.collection("chats").doc(customerId).set({
        messages: chats[customerId] || []
      }).catch(err => {
        console.error("Firestore saveChat error:", err);
      });
    });
  }
  if (triggerSync) {
    if (chatChannel) {
      chatChannel.postMessage({ type: 'CHAT_UPDATED', timestamp: Date.now() });
    }
    window.dispatchEvent(new CustomEvent('voetex_chat_local_updated'));
  }
}

function getCustomerChatSession() {
  const currentUser = getCurrentUser();
  if (currentUser) {
    return {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      isGuest: false
    };
  }

  let guestSession = null;
  try {
    guestSession = JSON.parse(localStorage.getItem(STORAGE_KEYS.GUEST_SESSION));
  } catch (e) {}

  if (!guestSession || !guestSession.id) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    guestSession = {
      id: "GUEST_" + randomNum,
      name: "ลูกค้าทั่วไป #" + randomNum,
      email: "guest" + randomNum + "@vortex.com",
      isGuest: true
    };
    localStorage.setItem(STORAGE_KEYS.GUEST_SESSION, JSON.stringify(guestSession));
  }
  return guestSession;
}

function setupChatRealtimeSync() {
  if (chatChannel) {
    chatChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'CHAT_UPDATED') {
        handleChatSyncEvent();
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.CHATS) {
      handleChatSyncEvent();
    }
  });

  window.addEventListener('voetex_chat_local_updated', () => {
    handleChatSyncEvent();
  });
}

function handleChatSyncEvent() {
  const page = document.body.getAttribute('data-page');
  if (page === 'store') {
    renderCustomerChatMessages();
    updateCustomerChatBadge();
  } else if (page === 'admin') {
    renderAdminChatList();
    renderAdminChatMessages();
    updateAdminChatBadge();
  }
}

/* --- Customer Chat (Storefront) --- */
function initCustomerChat() {
  setupChatRealtimeSync();
  renderCustomerChatMessages();
  updateCustomerChatBadge();
}

function toggleCustomerChat(forceOpen) {
  const chatBox = document.getElementById("customerChatBox");
  if (!chatBox) return;

  if (typeof forceOpen === "boolean") {
    state.isCustomerChatOpen = forceOpen;
  } else {
    state.isCustomerChatOpen = !state.isCustomerChatOpen;
  }

  chatBox.classList.toggle("open", state.isCustomerChatOpen);

  if (state.isCustomerChatOpen) {
    const session = getCustomerChatSession();
    const chats = getStoredChats();
    if (chats[session.id] && chats[session.id].unreadCustomerCount > 0) {
      chats[session.id].unreadCustomerCount = 0;
      saveStoredChats(chats, true);
    }
    renderCustomerChatMessages();
    updateCustomerChatBadge();

    const input = document.getElementById("customerChatInput");
    if (input) setTimeout(() => input.focus(), 150);
  }
}
window.toggleCustomerChat = toggleCustomerChat;

function sendCustomerMessage(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return;

  const session = getCustomerChatSession();
  const chats = getStoredChats();

  if (!chats[session.id]) {
    chats[session.id] = {
      id: session.id,
      customerName: session.name,
      customerEmail: session.email,
      isGuest: session.isGuest,
      updatedAt: Date.now(),
      unreadAdminCount: 0,
      unreadCustomerCount: 0,
      messages: []
    };
  }

  const newMsg = {
    id: "MSG_" + Date.now(),
    sender: "customer",
    text: cleanText,
    timestamp: Date.now(),
    customerName: session.name
  };

  chats[session.id].messages.push(newMsg);
  chats[session.id].customerName = session.name;
  chats[session.id].customerEmail = session.email;
  chats[session.id].updatedAt = Date.now();
  chats[session.id].unreadAdminCount = (chats[session.id].unreadAdminCount || 0) + 1;

  saveStoredChats(chats, true);

  renderCustomerChatMessages();
  updateCustomerChatBadge();
}

function handleCustomerChatSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("customerChatInput");
  if (!input) return;
  const text = input.value.trim();
  if (text) {
    sendCustomerMessage(text);
    input.value = "";
  }
}
window.handleCustomerChatSubmit = handleCustomerChatSubmit;

function sendCustomerQuickMessage(text) {
  sendCustomerMessage(text);
}
window.sendCustomerQuickMessage = sendCustomerQuickMessage;

function renderCustomerChatMessages() {
  const container = document.getElementById("customerChatMessages");
  if (!container) return;

  const session = getCustomerChatSession();
  const chats = getStoredChats();
  const chatData = chats[session.id];

  const defaultWelcomeHTML = `
    <div class="text-center my-2">
      <span class="text-[10px] bg-neutral-200/80 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">เริ่มต้นการสนทนา</span>
    </div>
    <div class="flex items-start gap-2 mr-auto max-w-[85%]">
      <div class="w-7 h-7 rounded-full bg-black text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
        VX
      </div>
      <div>
        <div class="chat-msg-bubble-admin">
          สวัสดีครับ ยินดีต้อนรับสู่ <strong>VORTEX ATELIER</strong> แอดมินพร้อมให้คำแนะนำเรื่องไซส์ รายละเอียดสินค้า หรือตรวจสอบสถานะพัสดุ สอบถามได้เลยครับ!<br/>
          <div class="mt-2 pt-2 border-t border-neutral-200 text-[11px]">
            <span class="text-gray-500">หรือติดต่อแอดมินโดยตรงทาง LINE:</span><br/>
            <a href="https://line.me/R/ti/p/@152zpxzv" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[#06C755] font-bold hover:underline mt-0.5">
              <i class="fa-brands fa-line text-sm"></i> @152zpxzv (คลิกเพื่อแอดไลน์)
            </a>
          </div>
        </div>
        <span class="text-[9px] text-gray-400 block mt-1 ml-1">VORTEX Support</span>
      </div>
    </div>
  `;

  if (!chatData || !chatData.messages || chatData.messages.length === 0) {
    container.innerHTML = defaultWelcomeHTML;
    return;
  }

  let html = defaultWelcomeHTML;
  chatData.messages.forEach(msg => {
    const isCustomer = msg.sender === "customer";
    const timeStr = new Date(msg.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

    if (isCustomer) {
      html += `
        <div class="flex flex-col items-end ml-auto max-w-[85%]">
          <div class="chat-msg-bubble-customer">
            ${escapeChatHTML(msg.text)}
          </div>
          <span class="text-[9px] text-gray-400 mt-0.5 mr-1">${timeStr}</span>
        </div>
      `;
    } else {
      html += `
        <div class="flex items-start gap-2 mr-auto max-w-[85%]">
          <div class="w-7 h-7 rounded-full bg-black text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
            VX
          </div>
          <div>
            <div class="chat-msg-bubble-admin">
              ${escapeChatHTML(msg.text)}
            </div>
            <div class="flex items-center gap-1.5 mt-0.5 ml-1">
              <span class="text-[9px] font-bold text-gray-600">แอดมิน</span>
              <span class="text-[9px] text-gray-400">${timeStr}</span>
            </div>
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function updateCustomerChatBadge() {
  const badge = document.getElementById("customerChatUnreadBadge");
  if (!badge) return;

  const session = getCustomerChatSession();
  const chats = getStoredChats();
  const chatData = chats[session.id];
  const count = (chatData && chatData.unreadCustomerCount) || 0;

  if (count > 0 && !state.isCustomerChatOpen) {
    badge.innerText = count;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

/* --- Admin Live Chat Controller --- */
function initAdminChat() {
  setupChatRealtimeSync();
  renderAdminChatList();
  renderAdminChatMessages();
  updateAdminChatBadge();
}

function renderAdminChatList(filterKeyword = "") {
  const container = document.getElementById("adminChatCustomerList");
  if (!container) return;

  const chats = getStoredChats();
  const keyword = String(filterKeyword || "").trim().toLowerCase();

  let customerList = Object.values(chats).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (keyword) {
    customerList = customerList.filter(c => 
      (c.customerName && c.customerName.toLowerCase().includes(keyword)) ||
      (c.customerEmail && c.customerEmail.toLowerCase().includes(keyword)) ||
      (c.messages && c.messages.some(m => m.text && m.text.toLowerCase().includes(keyword)))
    );
  }

  if (customerList.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-gray-400">
        <i class="fa-regular fa-comment-dots text-2xl mb-1 text-gray-300"></i>
        <p class="text-xs">ยังไม่มีประวัติการแชทจากลูกค้า</p>
      </div>
    `;
    return;
  }

  container.innerHTML = customerList.map(c => {
    const isSelected = state.activeAdminChatCustomerId === c.id;
    const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
    const lastText = lastMsg ? (lastMsg.sender === "admin" ? "คุณ: " + lastMsg.text : lastMsg.text) : "ยังไม่มีข้อความ";
    const timeStr = c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";
    const unreadCount = c.unreadAdminCount || 0;

    return `
      <div onclick="selectAdminChatCustomer('${c.id}')" class="p-3.5 hover:bg-neutral-100 cursor-pointer transition flex items-center justify-between gap-3 ${isSelected ? 'admin-chat-active-user' : 'bg-white'} group">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-full ${isSelected ? 'bg-white text-black' : 'bg-black text-white'} font-bold text-xs flex items-center justify-center shrink-0">
            ${(c.customerName || "U").charAt(0).toUpperCase()}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-gray-900 truncate">${escapeChatHTML(c.customerName || "ลูกค้า")}</span>
              ${c.isGuest ? '<span class="text-[9px] bg-neutral-200 text-gray-600 px-1.5 py-0.2 rounded">Guest</span>' : ''}
            </div>
            <p class="text-[11px] text-gray-500 truncate mt-0.5">${escapeChatHTML(lastText)}</p>
          </div>
        </div>
        <div class="flex flex-col items-end shrink-0 gap-1">
          <span class="text-[10px] text-gray-400">${timeStr}</span>
          ${unreadCount > 0 ? `<span class="chat-unread-badge bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">${unreadCount}</span>` : ''}
          <button
            type="button"
            title="ลบแชทของลูกค้ารายนี้"
            onclick="event.stopPropagation(); deleteCustomerChat('${c.id}')"
            class="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
          >
            <i class="fa-solid fa-trash-can text-[10px]"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function handleAdminChatSearch() {
  const input = document.getElementById("adminChatSearchInput");
  const keyword = input ? input.value : "";
  renderAdminChatList(keyword);
}
window.handleAdminChatSearch = handleAdminChatSearch;

/**
 * ลบข้อมูลแชทของลูกค้ารายนี้ออกทั้งหมด (ลบทั้ง session)
 * @param {string} customerId - Session ID ของลูกค้า
 */
function deleteCustomerChat(customerId) {
  if (!customerId) return;
  const chats = getStoredChats();
  const chatData = chats[customerId];
  const customerName = chatData ? (chatData.customerName || "ลูกค้า") : "ลูกค้า";

  if (!confirm(`ต้องการลบประวัติการสนทนาทั้งหมดของ "${customerName}" ใช่หรือไม่?\n\nการกระทำนี้จะลบข้อความทั้งหมดของลูกค้ารายนี้อย่างถาวร`)) return;

  delete chats[customerId];
  saveStoredChats(chats, true);

  // รีเซ็ต active chat ถ้าเป็น session ที่ถูกลบ
  if (state.activeAdminChatCustomerId === customerId) {
    state.activeAdminChatCustomerId = null;
    const input = document.getElementById("adminChatInput");
    const sendBtn = document.getElementById("adminChatSendBtn");
    const quickReplies = document.getElementById("adminChatQuickReplies");

    if (input) {
      input.disabled = true;
      input.value = "";
    }
    if (sendBtn) sendBtn.disabled = true;
    if (quickReplies) quickReplies.classList.add("hidden");
  }

  renderAdminChatList();
  renderAdminChatMessages();
  updateAdminChatBadge();

  showToast(`ลบประวัติแชทของ "${customerName}" เรียบร้อยแล้ว`, "success");
}
window.deleteCustomerChat = deleteCustomerChat;

/**
 * ลบห้องแชทของลูกค้าที่กำลังเปิดดูอยู่
 */
function deleteActiveCustomerChat() {
  if (!state.activeAdminChatCustomerId) return;
  deleteCustomerChat(state.activeAdminChatCustomerId);
}
window.deleteActiveCustomerChat = deleteActiveCustomerChat;

/**
 * ล้างข้อความทั้งหมดในการสนทนา แต่ยังคง session ไว้
 * @param {string} customerId - Session ID ของลูกค้า
 */
function clearCustomerChatMessages(customerId) {
  if (!customerId) return;
  const chats = getStoredChats();
  const chatData = chats[customerId];
  if (!chatData) return;

  const customerName = chatData.customerName || "ลูกค้า";
  if (!confirm(`ต้องการล้างข้อความทั้งหมดในการสนทนากับ "${customerName}" ใช่หรือไม่?`)) return;

  chats[customerId].messages = [];
  chats[customerId].unreadAdminCount = 0;
  chats[customerId].updatedAt = Date.now();
  saveStoredChats(chats, true);

  renderAdminChatList();
  renderAdminChatMessages();
  updateAdminChatBadge();

  showToast(`ล้างข้อความสนทนากับ "${customerName}" เรียบร้อยแล้ว`, "success");
}
window.clearCustomerChatMessages = clearCustomerChatMessages;

/**
 * ล้างข้อความในการสนทนาที่กำลังเปิดดูอยู่
 */
function clearActiveCustomerChat() {
  if (!state.activeAdminChatCustomerId) return;
  clearCustomerChatMessages(state.activeAdminChatCustomerId);
}
window.clearActiveCustomerChat = clearActiveCustomerChat;

/**
 * ลบข้อความเดี่ยว 1 ข้อความออกจากห้องแชท
 * @param {string} messageId - ID ของข้อความที่จะลบ
 */
function deleteSingleChatMessage(messageId) {
  const activeId = state.activeAdminChatCustomerId;
  if (!activeId || !messageId) return;

  const chats = getStoredChats();
  const chatData = chats[activeId];
  if (!chatData || !chatData.messages) return;

  if (!confirm("ต้องการลบข้อความนี้ใช่หรือไม่?")) return;

  chatData.messages = chatData.messages.filter(m => m.id !== messageId);
  chatData.updatedAt = Date.now();
  saveStoredChats(chats, true);

  renderAdminChatList();
  renderAdminChatMessages();
  showToast("ลบข้อความเรียบร้อยแล้ว", "success");
}
window.deleteSingleChatMessage = deleteSingleChatMessage;

function selectAdminChatCustomer(customerId) {
  state.activeAdminChatCustomerId = customerId;

  const chats = getStoredChats();
  if (chats[customerId] && chats[customerId].unreadAdminCount > 0) {
    chats[customerId].unreadAdminCount = 0;
    saveStoredChats(chats, true);
  }

  renderAdminChatList();
  renderAdminChatMessages();
  updateAdminChatBadge();

  const input = document.getElementById("adminChatInput");
  const sendBtn = document.getElementById("adminChatSendBtn");
  const quickReplies = document.getElementById("adminChatQuickReplies");

  if (input) {
    input.disabled = false;
    input.focus();
  }
  if (sendBtn) sendBtn.disabled = false;
  if (quickReplies) quickReplies.classList.remove("hidden");
}
window.selectAdminChatCustomer = selectAdminChatCustomer;

function renderAdminChatMessages() {
  const historyContainer = document.getElementById("adminChatMessageHistory");
  const activeHeaderName = document.getElementById("adminChatActiveName");
  const activeHeaderSub = document.getElementById("adminChatActiveSub");
  const activeHeaderAvatar = document.getElementById("adminChatActiveAvatar");
  const activeActions = document.getElementById("adminChatActiveActions");
  const activeIdBadge = document.getElementById("adminChatActiveId");

  if (!historyContainer) return;

  const activeId = state.activeAdminChatCustomerId;
  if (!activeId) {
    historyContainer.innerHTML = `
      <div class="my-auto text-center text-gray-400 py-12">
        <div class="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-xl mx-auto mb-2 text-gray-300">
          <i class="fa-solid fa-comments"></i>
        </div>
        <p class="text-xs">เลือกลูกค้าจากแถบด้านซ้ายเพื่อเริ่มการสนทนา</p>
      </div>
    `;
    if (activeHeaderName) activeHeaderName.innerText = "กรุณาเลือกลูกค้า";
    if (activeHeaderSub) activeHeaderSub.innerText = "คลิกที่รายชื่อลูกค้าด้านซ้ายเพื่อดูบทสนทนา";
    if (activeHeaderAvatar) activeHeaderAvatar.innerText = "?";
    if (activeActions) activeActions.classList.add("hidden");
    return;
  }

  const chats = getStoredChats();
  const chatData = chats[activeId];

  if (!chatData) return;

  if (activeHeaderName) activeHeaderName.innerText = chatData.customerName || "ลูกค้า";
  if (activeHeaderSub) activeHeaderSub.innerText = `${chatData.customerEmail || ""} • สถานะ: กำลังใช้งาน`;
  if (activeHeaderAvatar) activeHeaderAvatar.innerText = (chatData.customerName || "U").charAt(0).toUpperCase();
  if (activeActions) activeActions.classList.remove("hidden");
  if (activeIdBadge) activeIdBadge.innerText = `ID: ${chatData.id}`;

  if (!chatData.messages || chatData.messages.length === 0) {
    historyContainer.innerHTML = `
      <div class="my-auto text-center text-gray-400 py-8">
        <p class="text-xs">ยังไม่มีข้อความในการสนทนานี้</p>
      </div>
    `;
    return;
  }

  let html = "";
  chatData.messages.forEach((msg, idx) => {
    const isCustomer = msg.sender === "customer";
    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "";
    const msgId = msg.id || `MSG_${idx}`;
    if (!msg.id) msg.id = msgId;

    if (isCustomer) {
      html += `
        <div class="flex items-start gap-2.5 mr-auto max-w-[85%] group">
          <div class="w-8 h-8 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
            ${(chatData.customerName || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <div class="chat-msg-bubble-admin bg-white border border-neutral-200 text-gray-900 shadow-xs">
                ${escapeChatHTML(msg.text)}
              </div>
              <button 
                type="button" 
                title="ลบข้อความนี้" 
                onclick="deleteSingleChatMessage('${msgId}')" 
                class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600 rounded hover:bg-neutral-100 cursor-pointer text-xs"
              >
                <i class="fa-solid fa-trash-can text-[11px]"></i>
              </button>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5 ml-1">
              <span class="text-[9px] font-bold text-gray-600">${escapeChatHTML(chatData.customerName || "ลูกค้า")}</span>
              <span class="text-[9px] text-gray-400">${timeStr}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="flex flex-col items-end ml-auto max-w-[85%] group">
          <div class="flex items-center gap-1.5 flex-row-reverse">
            <div class="chat-msg-bubble-customer bg-black text-white shadow-sm">
              ${escapeChatHTML(msg.text)}
            </div>
            <button 
              type="button" 
              title="ลบข้อความนี้" 
              onclick="deleteSingleChatMessage('${msgId}')" 
              class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600 rounded hover:bg-neutral-100 cursor-pointer text-xs"
            >
              <i class="fa-solid fa-trash-can text-[11px]"></i>
            </button>
          </div>
          <div class="flex items-center gap-1 mt-0.5 mr-1 text-[9px] text-gray-400">
            <span>แอดมินตอบกลับ</span>
            <span>•</span>
            <span>${timeStr}</span>
          </div>
        </div>
      `;
    }
  });

  historyContainer.innerHTML = html;
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

function sendAdminMessage(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText || !state.activeAdminChatCustomerId) return;

  const customerId = state.activeAdminChatCustomerId;
  const chats = getStoredChats();

  if (!chats[customerId]) return;

  const newMsg = {
    id: "MSG_" + Date.now(),
    sender: "admin",
    text: cleanText,
    timestamp: Date.now(),
    adminName: "Admin VORTEX"
  };

  chats[customerId].messages.push(newMsg);
  chats[customerId].updatedAt = Date.now();
  chats[customerId].unreadCustomerCount = (chats[customerId].unreadCustomerCount || 0) + 1;

  saveStoredChats(chats, true);

  renderAdminChatList();
  renderAdminChatMessages();
}

function handleAdminChatSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("adminChatInput");
  if (!input) return;
  const text = input.value.trim();
  if (text) {
    sendAdminMessage(text);
    input.value = "";
  }
}
window.handleAdminChatSubmit = handleAdminChatSubmit;

function sendAdminQuickReply(text) {
  sendAdminMessage(text);
}
window.sendAdminQuickReply = sendAdminQuickReply;

function updateAdminChatBadge() {
  const badge = document.getElementById("adminTotalChatUnreadBadge");
  const headerBadge = document.getElementById("adminHeaderChatBadge");

  const chats = getStoredChats();
  const totalUnread = Object.values(chats).reduce((sum, c) => sum + (c.unreadAdminCount || 0), 0);

  if (badge) {
    if (totalUnread > 0) {
      badge.innerText = `${totalUnread} ข้อความใหม่`;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  if (headerBadge) {
    if (totalUnread > 0) {
      headerBadge.innerText = totalUnread;
      headerBadge.classList.remove("hidden");
    } else {
      headerBadge.classList.add("hidden");
    }
  }
}

/* ==========================================================================
   CUSTOMER REVIEWS & FEEDBACK MODULE (Storefront & Admin)
   ระบบแสดงรีวิวจากลูกค้าจริง และให้ลูกค้าหน้าเว็บสามารถเขียนรีวิว + แนบรูปภาพได้
   ========================================================================== */

function getDeletedReviewIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_REVIEWS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(id => String(id).trim());
    }
  } catch (e) {}
  return [];
}

function addDeletedReviewId(id) {
  if (!id) return;
  try {
    const cleanId = String(id).trim();
    const deleted = getDeletedReviewIds();
    if (!deleted.includes(cleanId)) {
      deleted.push(cleanId);
      localStorage.setItem(STORAGE_KEYS.DELETED_REVIEWS, JSON.stringify(deleted));
    }
  } catch (e) {}
}

function getStoredReviews() {
  const deletedIds = getDeletedReviewIds();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // คืนค่ารายการรีวิวที่บันทึกไว้จริง โดยกรอง id ที่ถูกลบออกไปเสมอ
        return parsed.filter(r => r && !deletedIds.includes(String(r.id).trim()));
      }
    }
  } catch (e) {
    console.warn("Could not read reviews from localStorage:", e);
  }
  // กรณีเปิดเว็บครั้งแรกและยังไม่มี key ใน localStorage
  return SEED_REVIEWS.filter(r => r && !deletedIds.includes(String(r.id).trim()));
}

function saveStoredReviews(reviews) {
  const deletedIds = getDeletedReviewIds();
  const cleanReviews = (Array.isArray(reviews) ? reviews : []).filter(
    r => r && !deletedIds.includes(String(r.id).trim())
  );
  state.reviews = cleanReviews;
  try {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(cleanReviews));
  } catch (e) {
    console.warn("LocalStorage full, trying lightweight review storage:", e);
    try {
      // บันทึกเฉพาะข้อมูลหลักถ้า local storage ใกล้เต็ม
      const light = cleanReviews.map(r => ({
        ...r,
        image: r.image && r.image.startsWith("data:") ? r.image.slice(0, 100) : r.image
      }));
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(light));
    } catch (err2) {}
  }
}

function initReviews() {
  state.reviews = getStoredReviews();
  state.selectedReviewRating = 5;
  state.reviewUploadedImage = null;
  state.activeReviewFilter = "all";
  renderReviews();
}

function filterReviews(filterType) {
  state.activeReviewFilter = filterType;
  // Update Filter Tab Buttons
  document.querySelectorAll(".review-filter-btn").forEach(btn => {
    const type = btn.getAttribute("data-filter");
    if (type === filterType) {
      btn.className = "review-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-black text-white shadow-xs transition";
    } else {
      btn.className = "review-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-gray-700 transition";
    }
  });
  renderReviews();
}

function renderReviews() {
  const container = document.getElementById("reviewsGrid");
  const countEl = document.getElementById("reviewStatsCount");
  const avgRatingEl = document.getElementById("reviewStatsAvgRating");
  const starAvgEl = document.getElementById("reviewStatsStars");

  if (!container) return;

  const allReviews = state.reviews || [];
  
  // คำนวณค่าเฉลี่ย
  let avg = 5.0;
  if (allReviews.length > 0) {
    const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    avg = (sum / allReviews.length).toFixed(1);
  }

  if (countEl) countEl.innerText = `${allReviews.length} รีวิว`;
  if (avgRatingEl) avgRatingEl.innerText = avg;
  if (starAvgEl) {
    let starsHtml = "";
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.round(avg)) {
        starsHtml += '<i class="fa-solid fa-star text-yellow-400 text-xs"></i>';
      } else {
        starsHtml += '<i class="fa-regular fa-star text-gray-300 text-xs"></i>';
      }
    }
    starAvgEl.innerHTML = starsHtml;
  }

  // Filter
  let filtered = [...allReviews];
  if (state.activeReviewFilter === "photo") {
    filtered = filtered.filter(r => !!r.image);
  } else if (state.activeReviewFilter === "5star") {
    filtered = filtered.filter(r => Number(r.rating) === 5);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-neutral-200 p-8 shadow-xs">
        <div class="w-16 h-16 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-gray-400 text-2xl mb-3">
          <i class="fa-solid fa-comments"></i>
        </div>
        <h4 class="text-sm font-bold text-gray-800">ยังไม่มีรีวิวในหมวดหมู่นี้</h4>
        <p class="text-xs text-gray-500 mt-1">มาเป็นคนแรกที่แบ่งปันความประทับใจให้กับชาว VORTEX</p>
        <button onclick="openReviewModal()" class="mt-4 px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition">
          <i class="fa-solid fa-pen-to-square"></i> เขียนรีวิวแรกเลย
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(rev => {
    const ratingNum = Math.min(5, Math.max(1, Number(rev.rating) || 5));
    let starsHtml = "";
    for (let i = 1; i <= 5; i++) {
      if (i <= ratingNum) {
        starsHtml += '<i class="fa-solid fa-star text-yellow-400 text-xs"></i>';
      } else {
        starsHtml += '<i class="fa-regular fa-star text-gray-300 text-xs"></i>';
      }
    }

    const firstChar = (rev.name || "U").charAt(0).toUpperCase();
    const avatarBg = rev.avatarBg || "#111111";
    const imgUrl = rev.image ? normalizeImagePath(rev.image) : "";

    return `
      <div class="bg-white rounded-2xl border border-neutral-200/90 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
        <div>
          <!-- Header: User Info & Rating -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs" style="background-color: ${avatarBg};">
                ${firstChar}
              </div>
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-xs text-gray-900">${escapeChatHTML(rev.name || "ลูกค้าผู้มีอุปการคุณ")}</span>
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                    <i class="fa-solid fa-circle-check text-[9px] text-emerald-600"></i> ผู้ซื้อจริง
                  </span>
                </div>
                <div class="text-[10px] text-gray-400 mt-0.5">${escapeChatHTML(rev.date || "รีวิวล่าสุด")}</div>
              </div>
            </div>
            
            <div class="flex items-center gap-0.5 shrink-0 bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-100">
              ${starsHtml}
            </div>
          </div>

          <!-- Product Tag -->
          ${rev.productName ? `
            <div class="mb-2.5">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800 text-[11px] font-medium max-w-full truncate">
                <i class="fa-solid fa-shirt text-[10px] text-neutral-500"></i>
                <span class="truncate">${escapeChatHTML(rev.productName)}</span>
              </span>
            </div>
          ` : ''}

          <!-- Comment Text -->
          <p class="text-xs sm:text-[13px] text-gray-700 leading-relaxed font-sans mb-3 break-words">
            ${escapeChatHTML(rev.comment || "")}
          </p>

          <!-- Review Photo (ถ้ามี) -->
          ${imgUrl ? `
            <div class="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 cursor-pointer group/img mb-3 aspect-4/3 max-h-56" onclick="openReviewImageLightbox('${imgUrl}', '${escapeChatHTML(rev.name || "รีวิวลูกค้า")}')">
              <img src="${imgUrl}" alt="รูปรีวิวจากลูกค้า" loading="lazy" class="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300" />
              <div class="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-2xs">
                <i class="fa-solid fa-magnifying-glass-plus"></i> คลิกเพื่อดูรูปใหญ่
              </div>
              <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1">
                <i class="fa-solid fa-camera text-[9px]"></i> รูปจากลูกค้า
              </span>
            </div>
          ` : ''}
        </div>

        <!-- Footer: Helpful button & Admin Delete -->
        <div class="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-gray-400 mt-2">
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-gray-400">VORTEX Verified</span>
            ${(state.currentUser && state.currentUser.role === 'admin') ? `
              <button type="button" onclick="event.stopPropagation(); handleDeleteReview('${rev.id}')" title="ลบรีวิวนี้ (Admin)" class="text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                <i class="fa-solid fa-trash-can text-[10px]"></i> ลบ
              </button>
            ` : ''}
          </div>
          <button onclick="likeReview('${rev.id}')" id="likeBtn_${rev.id}" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-neutral-100 text-gray-500 hover:text-black transition cursor-pointer text-[11px]">
            <i class="fa-regular fa-thumbs-up"></i>
            <span id="likeCount_${rev.id}">${rev.likes || 0}</span> ถูกใจ
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function likeReview(reviewId) {
  const rev = (state.reviews || []).find(r => r.id === reviewId);
  if (!rev) return;
  rev.likes = (rev.likes || 0) + 1;
  saveStoredReviews(state.reviews);
  const countEl = document.getElementById(`likeCount_${reviewId}`);
  if (countEl) countEl.innerText = rev.likes;
  const btn = document.getElementById(`likeBtn_${reviewId}`);
  if (btn) {
    btn.classList.add("text-black", "font-bold");
    btn.innerHTML = `<i class="fa-solid fa-thumbs-up text-black"></i> <span>${rev.likes}</span> ถูกใจ`;
  }
}

function openReviewModal() {
  const modal = document.getElementById("reviewModal");
  if (!modal) return;

  // Auto fill user name if logged in
  const nameInput = document.getElementById("reviewAuthorName");
  if (nameInput) {
    const user = state.currentUser;
    if (user && user.name) {
      nameInput.value = user.name;
    } else {
      nameInput.value = "";
    }
  }

  // Reset Rating
  setReviewRating(5);

  const commentInput = document.getElementById("reviewCommentInput");
  if (commentInput) commentInput.value = "";

  // Reset Image
  state.reviewUploadedImage = null;
  const previewContainer = document.getElementById("reviewImagePreviewBox");
  if (previewContainer) previewContainer.classList.add("hidden");
  const uploadPlaceholder = document.getElementById("reviewUploadPlaceholder");
  if (uploadPlaceholder) uploadPlaceholder.classList.remove("hidden");
  const fileInput = document.getElementById("reviewImageFileInput");
  if (fileInput) fileInput.value = "";

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeReviewModal() {
  const modal = document.getElementById("reviewModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
  state.reviewUploadedImage = null;
}

function setReviewRating(rating) {
  state.selectedReviewRating = rating;
  const stars = document.querySelectorAll(".review-star-btn");
  const textEl = document.getElementById("reviewRatingText");

  const ratingLabels = {
    5: "⭐⭐⭐⭐⭐ ยอดเยี่ยมมาก ประทับใจที่สุด (5 ดาว)",
    4: "⭐⭐⭐⭐ ดีมาก คุณภาพคุ้มราคา (4 ดาว)",
    3: "⭐⭐⭐ ปานกลาง พอใช้ได้ (3 ดาว)",
    2: "⭐⭐ พอใช้ อยากให้ปรับปรุง (2 ดาว)",
    1: "⭐ ไม่ประทับใจ (1 ดาว)"
  };

  stars.forEach(btn => {
    const r = Number(btn.getAttribute("data-star"));
    const icon = btn.querySelector("i");
    if (r <= rating) {
      icon.className = "fa-solid fa-star text-yellow-400 text-xl sm:text-2xl transition-transform hover:scale-110";
    } else {
      icon.className = "fa-regular fa-star text-neutral-300 text-xl sm:text-2xl transition-transform hover:scale-110";
    }
  });

  if (textEl) {
    textEl.innerText = ratingLabels[rating] || "";
  }
}

async function handleReviewImageUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)", "warning");
    return;
  }

  showToast("กำลังประมวลผลรูปภาพ...", "info");

  try {
    // บีบอัดรูปภาพด้วย canvas เพื่อประสิทธิภาพสูงสุดและขนาดไม่เกิน 120KB
    const compressedDataUrl = await compressImageFile(file, 1000, 1000, 0.75);
    state.reviewUploadedImage = compressedDataUrl;

    const previewContainer = document.getElementById("reviewImagePreviewBox");
    const previewImg = document.getElementById("reviewImagePreview");
    const uploadPlaceholder = document.getElementById("reviewUploadPlaceholder");

    if (previewImg) previewImg.src = compressedDataUrl;
    if (previewContainer) previewContainer.classList.remove("hidden");
    if (uploadPlaceholder) uploadPlaceholder.classList.add("hidden");

    showToast("แนบรูปภาพรีวิวสำเร็จ", "success");
  } catch (err) {
    console.error("Review image upload error:", err);
    showToast("ไม่สามารถประมวลผลรูปภาพได้: " + err.message, "error");
  }
}

function removeReviewImage() {
  state.reviewUploadedImage = null;
  const previewContainer = document.getElementById("reviewImagePreviewBox");
  const uploadPlaceholder = document.getElementById("reviewUploadPlaceholder");
  const fileInput = document.getElementById("reviewImageFileInput");

  if (previewContainer) previewContainer.classList.add("hidden");
  if (uploadPlaceholder) uploadPlaceholder.classList.remove("hidden");
  if (fileInput) fileInput.value = "";
}

function submitReviewForm(event) {
  if (event) event.preventDefault();

  const nameInput = document.getElementById("reviewAuthorName");
  const commentInput = document.getElementById("reviewCommentInput");

  const name = nameInput ? nameInput.value.trim() : "";
  const comment = commentInput ? commentInput.value.trim() : "";
  const productName = "";

  if (!name) {
    showToast("กรุณาระบุชื่อของคุณเพื่อแสดงในรีวิว", "warning");
    if (nameInput) nameInput.focus();
    return;
  }

  if (!comment) {
    showToast("กรุณาพิมพ์ข้อความรีวิวความประทับใจ", "warning");
    if (commentInput) commentInput.focus();
    return;
  }

  // Format thai date e.g. "30 ก.ย. 2026"
  const now = new Date();
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const dateStr = `${now.getDate()} ${thaiMonths[now.getMonth()]} ${now.getFullYear()}`;

  const modernColors = ["#111111", "#2563eb", "#7c3aed", "#059669", "#dc2626", "#ea580c", "#0891b2"];
  const randomColor = modernColors[Math.floor(Math.random() * modernColors.length)];

  const newReview = {
    id: "REV-" + Date.now(),
    name: name,
    role: "Verified Buyer",
    rating: state.selectedReviewRating || 5,
    productName: productName || "สินค้า VORTEX Streetwear",
    comment: comment,
    image: state.reviewUploadedImage || null,
    date: dateStr,
    likes: 1,
    avatarBg: randomColor
  };

  const currentReviews = getStoredReviews();
  currentReviews.unshift(newReview);
  saveStoredReviews(currentReviews);
  if (db) {
    db.collection("reviews").doc(newReview.id).set(newReview).catch(err => {
      console.error("Firestore addReview error:", err);
    });
  }

  closeReviewModal();
  renderReviews();

  // Also update Admin table if on admin page
  if (typeof renderAdminReviewsTable === "function") {
    renderAdminReviewsTable();
  }

  showToast("ขอบคุณสำหรับรีวิวของคุณ! รีวิวของคุณถูกเผยแพร่สู่หน้าร้านแล้ว", "success");

  // Smooth scroll to reviews section
  const revSec = document.getElementById("customerReviewsSection");
  if (revSec) {
    revSec.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function openReviewImageLightbox(imgSrc, title) {
  const modal = document.getElementById("reviewImageLightboxModal");
  const imgEl = document.getElementById("reviewLightboxImg");
  const titleEl = document.getElementById("reviewLightboxTitle");

  if (!modal || !imgEl) return;

  imgEl.src = normalizeImagePath(imgSrc);
  if (titleEl) titleEl.innerText = title || "รูปภาพรีวิวจากลูกค้า";

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeReviewImageLightbox() {
  const modal = document.getElementById("reviewImageLightboxModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

// Admin Reviews Management
function renderAdminReviewsTable() {
  const tbody = document.getElementById("adminReviewsTableBody");
  if (!tbody) return;

  const reviews = getStoredReviews();

  if (reviews.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-gray-400">ยังไม่มีข้อมูลรีวิวในระบบ</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = reviews.map((r, idx) => {
    const imgUrl = r.image ? normalizeImagePath(r.image) : "";
    return `
      <tr class="border-b border-gray-100 hover:bg-neutral-50 transition">
        <td class="py-3 px-4 font-mono text-[11px] text-gray-400">${idx + 1}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-gray-900 text-xs">${escapeChatHTML(r.name)}</div>
          <div class="text-[10px] text-gray-400">${escapeChatHTML(r.date)}</div>
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center text-yellow-400 text-xs gap-0.5">
            ${'<i class="fa-solid fa-star"></i>'.repeat(Number(r.rating) || 5)}
          </div>
          <div class="text-[11px] text-gray-600 truncate max-w-xs mt-0.5 font-medium">${escapeChatHTML(r.productName || "-")}</div>
        </td>
        <td class="py-3 px-4 text-xs text-gray-700 max-w-sm">
          <p class="line-clamp-2">${escapeChatHTML(r.comment)}</p>
        </td>
        <td class="py-3 px-4">
          ${imgUrl ? `
            <img src="${imgUrl}" alt="รูปรีวิว" class="w-10 h-10 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80" onclick="openReviewImageLightbox('${imgUrl}', '${escapeChatHTML(r.name)}')"/>
          ` : '<span class="text-gray-300 text-[11px]">- ไม่มีรูป -</span>'}
        </td>
        <td class="py-3 px-4 text-right">
          <button onclick="handleDeleteReview('${r.id}')" class="px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto">
            <i class="fa-solid fa-trash-can text-[10px]"></i> ลบ
          </button>
        </td>
      </tr>
    `;
  }).join("");

  const countBadge = document.getElementById("adminReviewCountBadge");
  if (countBadge) countBadge.innerText = reviews.length;
}

function handleDeleteReview(reviewId) {
  if (!reviewId) return;
  if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้ออกจากระบบ?")) return;
  
  const cleanId = String(reviewId).trim();
  // 1. เพิ่มเข้า Deleted Blacklist ทันที เพื่อป้องกันไม่ให้รีวิวนี้เด้งกลับมาเด็ดขาด
  addDeletedReviewId(cleanId);

  // 2. กรองออกจาก storage
  let reviews = getStoredReviews();
  reviews = reviews.filter(r => r && String(r.id).trim() !== cleanId);
  saveStoredReviews(reviews);

  // 3. ลบออกจาก Cloud Firestore
  if (db) {
    db.collection("reviews").doc(cleanId).delete().catch(err => {
      console.error("Firestore deleteReview error:", err);
    });
  }

  // 3. อัปเดต UI ทันทีทั้งหน้าร้านและหน้าแอดมิน
  if (typeof renderReviews === "function" && document.getElementById("reviewsGrid")) {
    renderReviews();
  }
  if (typeof renderAdminReviewsTable === "function" && document.getElementById("adminReviewsTableBody")) {
    renderAdminReviewsTable();
  }
  if (typeof renderAdminStats === "function") {
    renderAdminStats();
  }
  showToast("ลบรีวิวเรียบร้อยแล้ว", "info");
}

function escapeChatHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Auto Initialize if on specific page
document.addEventListener("DOMContentLoaded", () => {
  initFirestoreSync();
  if (document.body.getAttribute("data-page") === "store") {
    initStorefront();
  } else if (document.body.getAttribute("data-page") === "admin") {
    initAdminDashboard();
  }
});
