/**
 * VOETEX Streetwear - Main Application Logic
 * สถาปัตยกรรมระบบจัดการร้านค้าอีคอมเมิร์ซสไตล์ Shopee โทนสีดำขาว
 */

// Application State
const state = {
  products: [...PRODUCTS_DATA],
  filteredProducts: [...PRODUCTS_DATA],
  cart: [],
  selectedCategory: "all",
  searchKeyword: "",
  sortBy: "popular", // popular, latest, price-asc, price-desc
  appliedVoucher: null,
  activeBannerIndex: 0,
  currentDetailProduct: null,
  selectedDetailColor: null,
  selectedDetailSize: null,
  detailQuantity: 1,
  selectedPaymentMethod: "promptpay",
  selectedShippingMethod: "standard",
  lastOrder: null
};

// LocalStorage Keys
const STORAGE_KEYS = {
  CART: "voetex_cart_v1",
  ORDERS: "voetex_orders_v1"
};

/* ==========================================================================
   DOM Initialization & Event Listeners
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadCartFromStorage();
  initBannerCarousel();
  initFlashSaleTimer();
  renderCategories();
  applyFiltersAndRender();
  updateCartBadge();
  setupEventListeners();
  renderVoucherList();
});

function setupEventListeners() {
  // Search Input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchKeyword = e.target.value.trim().toLowerCase();
      applyFiltersAndRender();
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyFiltersAndRender();
      }
    });
  }

  // Search Button
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      applyFiltersAndRender();
    });
  }

  // Sort Buttons / Tabs
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

  // Price Sort Select Dropdown
  const priceSortSelect = document.getElementById("priceSortSelect");
  if (priceSortSelect) {
    priceSortSelect.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Cart Drawer open/close
  const cartTriggerBtns = document.querySelectorAll(".cart-trigger-btn");
  cartTriggerBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openCartDrawer();
    });
  });

  const closeCartBtn = document.getElementById("closeCartBtn");
  if (closeCartBtn) {
    closeCartBtn.addEventListener("click", closeCartDrawer);
  }

  const cartBackdrop = document.getElementById("cartBackdrop");
  if (cartBackdrop) {
    cartBackdrop.addEventListener("click", (e) => {
      if (e.target === cartBackdrop) closeCartDrawer();
    });
  }

  // Product Detail Modal backdrop click to close
  const productModalBackdrop = document.getElementById("productDetailModal");
  if (productModalBackdrop) {
    productModalBackdrop.addEventListener("click", (e) => {
      if (e.target === productModalBackdrop) closeProductDetailModal();
    });
  }

  // Checkout Modal backdrop click to close
  const checkoutModal = document.getElementById("checkoutModal");
  if (checkoutModal) {
    checkoutModal.addEventListener("click", (e) => {
      if (e.target === checkoutModal) closeCheckoutModal();
    });
  }

  // Size Guide Modal backdrop click to close
  const sizeGuideModal = document.getElementById("sizeGuideModal");
  if (sizeGuideModal) {
    sizeGuideModal.addEventListener("click", (e) => {
      if (e.target === sizeGuideModal) closeSizeGuideModal();
    });
  }
}

/* ==========================================================================
   Banner Carousel Logic
   ========================================================================== */
function initBannerCarousel() {
  const slides = document.querySelectorAll(".carousel-slide");
  const dotsContainer = document.getElementById("carouselDots");
  if (!slides.length) return;

  if (dotsContainer) {
    dotsContainer.innerHTML = "";
    slides.forEach((_, idx) => {
      const dot = document.createElement("button");
      dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${idx === 0 ? "bg-black w-6" : "bg-gray-300"}`;
      dot.setAttribute("aria-label", `Slide ${idx + 1}`);
      dot.addEventListener("click", () => goToBanner(idx));
      dotsContainer.appendChild(dot);
    });
  }

  setInterval(() => {
    goToBanner((state.activeBannerIndex + 1) % slides.length);
  }, 5000);
}

function goToBanner(index) {
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.getElementById("carouselDots")?.children;
  if (!slides.length) return;

  state.activeBannerIndex = index;
  slides.forEach((slide, idx) => {
    slide.classList.toggle("active", idx === index);
  });

  if (dots) {
    Array.from(dots).forEach((dot, idx) => {
      if (idx === index) {
        dot.className = "w-6 h-3 rounded-full bg-black transition-all duration-300";
      } else {
        dot.className = "w-3 h-3 rounded-full bg-gray-300 transition-all duration-300";
      }
    });
  }
}

function nextBanner() {
  const slides = document.querySelectorAll(".carousel-slide");
  goToBanner((state.activeBannerIndex + 1) % slides.length);
}

function prevBanner() {
  const slides = document.querySelectorAll(".carousel-slide");
  goToBanner((state.activeBannerIndex - 1 + slides.length) % slides.length);
}

/* ==========================================================================
   Flash Sale Countdown Timer
   ========================================================================== */
function initFlashSaleTimer() {
  let totalSeconds = 3 * 3600 + 45 * 60 + 20; // 03:45:20
  const hoursEl = document.getElementById("fsHours");
  const minutesEl = document.getElementById("fsMinutes");
  const secondsEl = document.getElementById("fsSeconds");

  setInterval(() => {
    if (totalSeconds <= 0) {
      totalSeconds = 4 * 3600;
    }
    totalSeconds--;

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (hoursEl) hoursEl.innerText = String(h).padStart(2, "0");
    if (minutesEl) minutesEl.innerText = String(m).padStart(2, "0");
    if (secondsEl) secondsEl.innerText = String(s).padStart(2, "0");
  }, 1000);

  renderFlashSaleProducts();
}

function renderFlashSaleProducts() {
  const container = document.getElementById("flashSaleContainer");
  if (!container) return;

  const flashItems = state.products.filter(p => p.isFlashSale);
  container.innerHTML = flashItems.map(p => {
    const percentSold = Math.min(95, Math.floor((p.soldCount / (p.soldCount + p.stock)) * 100));
    return `
      <div onclick="openProductDetail('${p.id}')" class="min-w-[190px] md:min-w-[210px] max-w-[220px] bg-white rounded-lg border border-gray-100 p-2.5 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col group">
        <div class="relative w-full pb-[110%] rounded overflow-hidden bg-neutral-100">
          <img src="${p.images[0]}" alt="${p.name}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/>
          <div class="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
            -${p.discount}%
          </div>
          <div class="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
            <i class="fa-solid fa-bolt text-yellow-400 text-[9px]"></i> FLASH SALE
          </div>
        </div>
        <div class="mt-2.5 flex-1 flex flex-col justify-between">
          <h4 class="text-xs font-medium text-gray-800 line-clamp-2 leading-snug group-hover:text-black">
            ${p.name}
          </h4>
          <div class="mt-2">
            <div class="flex items-baseline gap-1.5">
              <span class="text-sm font-bold text-black font-sans">฿${p.price.toLocaleString()}</span>
              <span class="text-[11px] text-gray-400 line-through">฿${p.originalPrice.toLocaleString()}</span>
            </div>
            <!-- Shopee Style Progress Bar -->
            <div class="mt-2 flash-progress">
              <div class="flash-progress-bar" style="width: ${percentSold}%"></div>
              <span class="flash-progress-text">ขายแล้ว ${p.soldCount} ชิ้น</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   Category Rendering & Filtering
   ========================================================================== */
function renderCategories() {
  const container = document.getElementById("categoriesContainer");
  if (!container) return;

  container.innerHTML = CATEGORIES_DATA.map(cat => `
    <button onclick="selectCategory('${cat.id}')" 
      class="category-btn flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-200 min-w-[90px] sm:min-w-[110px] text-center
      ${state.selectedCategory === cat.id ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-black hover:bg-neutral-50'}">
      <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2 
        ${state.selectedCategory === cat.id ? 'bg-white/10 text-white' : 'bg-neutral-100 text-black'}">
        <i class="fa-solid ${cat.icon}"></i>
      </div>
      <span class="text-xs font-semibold whitespace-nowrap">${cat.name}</span>
      <span class="text-[10px] ${state.selectedCategory === cat.id ? 'text-gray-300' : 'text-gray-400'} mt-0.5">${cat.count} รายการ</span>
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

/* ==========================================================================
   Product List Filtering, Sorting & Rendering
   ========================================================================== */
function applyFiltersAndRender() {
  let result = [...state.products];

  // Category filter
  if (state.selectedCategory !== "all") {
    result = result.filter(p => p.category === state.selectedCategory);
  }

  // Search keyword filter
  if (state.searchKeyword) {
    result = result.filter(p => 
      p.name.toLowerCase().includes(state.searchKeyword) ||
      p.subtitle.toLowerCase().includes(state.searchKeyword) ||
      p.categoryLabel.toLowerCase().includes(state.searchKeyword) ||
      p.description.toLowerCase().includes(state.searchKeyword)
    );
  }

  // Sorting
  if (state.sortBy === "price-asc") {
    result.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === "price-desc") {
    result.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === "latest") {
    result.sort((a, b) => b.id.localeCompare(a.id));
  } else {
    // popular (default)
    result.sort((a, b) => b.soldCount - a.soldCount);
  }

  state.filteredProducts = result;
  renderProducts();

  // Update result count
  const countEl = document.getElementById("productCountText");
  if (countEl) {
    countEl.innerText = `พบสินค้า ${result.length} รายการ`;
  }
}

function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (state.filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-3xl text-gray-400 mb-4">
          <i class="fa-solid fa-shirt"></i>
        </div>
        <h3 class="text-base font-bold text-gray-800 mb-1">ไม่พบสินค้าที่คุณกำลังค้นหา</h3>
        <p class="text-xs text-gray-500 max-w-sm mx-auto mb-5">ลองค้นหาด้วยคำค้นอื่น หรือเลือกหมวดหมู่อื่นดูสิ</p>
        <button onclick="resetFilters()" class="px-5 py-2.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition">
          แสดงสินค้าทั้งหมด
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.filteredProducts.map(p => `
    <div onclick="openProductDetail('${p.id}')" class="product-card group">
      <div class="product-image-wrap">
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy" />
        
        <!-- Badges -->
        <div class="absolute top-2 left-2 flex flex-col gap-1 z-10">
          ${p.isMall ? '<span class="badge-mall"><i class="fa-solid fa-certificate text-[9px]"></i> MALL</span>' : ''}
          ${p.isBestSeller ? '<span class="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-xs tracking-tight">ขายดี</span>' : ''}
        </div>

        <div class="absolute top-2 right-2 z-10">
          <span class="badge-discount">-${p.discount}%</span>
        </div>

        <!-- Quick Action on Hover -->
        <div class="absolute inset-x-2 bottom-2 z-10 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button onclick="quickAddToCart(event, '${p.id}')" class="w-full py-2 bg-black/90 hover:bg-black text-white rounded text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 backdrop-blur-xs">
            <i class="fa-solid fa-cart-plus text-xs"></i> เพิ่มลงตะกร้า
          </button>
        </div>
      </div>

      <!-- Info -->
      <div class="p-3 flex-1 flex flex-col justify-between">
        <div>
          <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">${p.categoryLabel.split(" ")[0]}</span>
          <h3 class="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 mt-0.5 leading-snug group-hover:text-black">
            ${p.name}
          </h3>
        </div>

        <div class="mt-3">
          <div class="flex items-baseline gap-1.5">
            <span class="text-sm sm:text-base font-bold text-black font-sans">฿${p.price.toLocaleString()}</span>
            <span class="text-[11px] text-gray-400 line-through">฿${p.originalPrice.toLocaleString()}</span>
          </div>

          <div class="flex items-center justify-between text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <div class="flex items-center gap-1 text-amber-500 font-medium">
              <i class="fa-solid fa-star text-[10px]"></i>
              <span>${p.rating.toFixed(1)}</span>
            </div>
            <span>ขายแล้ว ${p.soldCount > 1000 ? (p.soldCount / 1000).toFixed(1) + 'k' : p.soldCount} ชิ้น</span>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function resetFilters() {
  state.selectedCategory = "all";
  state.searchKeyword = "";
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  renderCategories();
  applyFiltersAndRender();
}

/* ==========================================================================
   Product Detail Modal
   ========================================================================== */
function openProductDetail(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.currentDetailProduct = product;
  state.selectedDetailColor = product.colors[0];
  state.selectedDetailSize = product.sizes[0];
  state.detailQuantity = 1;

  const modal = document.getElementById("productDetailModal");
  if (!modal) return;

  // Set Content
  document.getElementById("modalProductTitle").innerText = product.name;
  document.getElementById("modalProductSubtitle").innerText = product.subtitle;
  document.getElementById("modalProductPrice").innerText = `฿${product.price.toLocaleString()}`;
  document.getElementById("modalProductOriginalPrice").innerText = `฿${product.originalPrice.toLocaleString()}`;
  document.getElementById("modalProductDiscount").innerText = `-${product.discount}%`;
  document.getElementById("modalProductRating").innerText = product.rating.toFixed(1);
  document.getElementById("modalProductReviewCount").innerText = `${product.reviewCount} รีวิว`;
  document.getElementById("modalProductSoldCount").innerText = `ขายแล้ว ${product.soldCount} ชิ้น`;
  document.getElementById("modalProductStock").innerText = `${product.stock} ชิ้น`;
  document.getElementById("modalProductDescription").innerHTML = product.description.replace(/\n/g, "<br>");
  document.getElementById("modalDetailQty").value = 1;

  // Main Image
  const mainImage = document.getElementById("modalMainImage");
  mainImage.src = product.colors[0].previewImage || product.images[0];

  // Thumbnails
  const thumbContainer = document.getElementById("modalThumbnails");
  thumbContainer.innerHTML = product.images.map((img, idx) => `
    <button onclick="changeModalMainImage('${img}', this)" class="thumb-btn w-14 h-14 rounded border-2 ${idx === 0 ? 'border-black' : 'border-transparent'} overflow-hidden hover:opacity-80 transition">
      <img src="${img}" class="w-full h-full object-cover"/>
    </button>
  `).join("");

  // Color Swatches
  const colorContainer = document.getElementById("modalColorsContainer");
  colorContainer.innerHTML = product.colors.map((c, idx) => `
    <button onclick="selectModalColor('${c.name}')" 
      class="variant-btn color-option-btn flex items-center gap-2 ${idx === 0 ? 'selected' : ''}" 
      data-color="${c.name}">
      <span class="w-3.5 h-3.5 rounded-full border border-gray-300" style="background-color: ${c.hex}"></span>
      <span>${c.name}</span>
    </button>
  `).join("");

  // Sizes
  const sizeContainer = document.getElementById("modalSizesContainer");
  sizeContainer.innerHTML = product.sizes.map((s, idx) => `
    <button onclick="selectModalSize('${s}')" 
      class="variant-btn size-option-btn ${idx === 0 ? 'selected' : ''}" 
      data-size="${s}">
      ${s}
    </button>
  `).join("");

  // Render Reviews List
  renderProductModalReviews(product);

  // Open Modal
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

function selectModalColor(colorName) {
  if (!state.currentDetailProduct) return;
  const colorObj = state.currentDetailProduct.colors.find(c => c.name === colorName);
  if (!colorObj) return;

  state.selectedDetailColor = colorObj;

  const buttons = document.querySelectorAll(".color-option-btn");
  buttons.forEach(btn => {
    btn.classList.toggle("selected", btn.getAttribute("data-color") === colorName);
  });

  if (colorObj.previewImage) {
    const mainImg = document.getElementById("modalMainImage");
    if (mainImg) mainImg.src = colorObj.previewImage;
  }
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

function renderProductModalReviews(product) {
  const container = document.getElementById("modalReviewsList");
  if (!container) return;

  container.innerHTML = product.reviews.map(r => `
    <div class="py-3 border-b border-gray-100 last:border-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <img src="${r.avatar}" class="w-8 h-8 rounded-full object-cover" alt="${r.author}"/>
          <div>
            <div class="text-xs font-bold text-gray-900">${r.author}</div>
            <div class="flex text-amber-500 text-[10px] gap-0.5">
              ${Array(r.rating).fill('<i class="fa-solid fa-star"></i>').join("")}
            </div>
          </div>
        </div>
        <span class="text-[11px] text-gray-400">${r.date}</span>
      </div>
      <div class="text-[11px] text-gray-500 mt-1">ตัวเลือก: ${r.variation}</div>
      <p class="text-xs text-gray-700 mt-2 leading-relaxed">${r.comment}</p>
      <div class="flex items-center gap-1.5 text-[11px] text-gray-400 mt-2">
        <button class="hover:text-black flex items-center gap-1">
          <i class="fa-regular fa-thumbs-up"></i> มีประโยชน์ (${r.helpful})
        </button>
      </div>
    </div>
  `).join("");
}

/* ==========================================================================
   Size Guide Modal
   ========================================================================== */
function openSizeGuideModal() {
  if (!state.currentDetailProduct) return;
  const modal = document.getElementById("sizeGuideModal");
  const tableBody = document.getElementById("sizeGuideTableBody");
  
  if (modal && tableBody) {
    const guides = state.currentDetailProduct.sizeGuide || [];
    tableBody.innerHTML = guides.map(g => `
      <tr class="border-b border-gray-100 text-center hover:bg-neutral-50">
        <td class="py-2.5 px-3 font-bold text-gray-900">${g.size}</td>
        <td class="py-2.5 px-3 text-gray-700">${g.chest || g.waist || "-"}</td>
        <td class="py-2.5 px-3 text-gray-700">${g.length || "-"}</td>
        <td class="py-2.5 px-3 text-gray-700">${g.shoulder || g.hip || "-"}</td>
      </tr>
    `).join("");

    modal.classList.add("open");
  }
}

function closeSizeGuideModal() {
  const modal = document.getElementById("sizeGuideModal");
  if (modal) modal.classList.remove("open");
}

/* ==========================================================================
   Cart System (State & LocalStorage)
   ========================================================================== */
function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CART);
    state.cart = saved ? JSON.parse(saved) : [];
  } catch (e) {
    state.cart = [];
  }
}

function saveCartToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(state.cart));
  } catch (e) {
    console.error("Failed to save cart to storage", e);
  }
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

function quickAddToCart(event, productId) {
  event.stopPropagation();
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  addToCartItem({
    productId: product.id,
    name: product.name,
    price: product.price,
    image: product.images[0],
    color: product.colors[0].name,
    size: product.sizes[0],
    quantity: 1,
    selected: true
  });

  showToast(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`, "success");
}

function handleAddDetailToCart() {
  if (!state.currentDetailProduct) return;
  const p = state.currentDetailProduct;

  addToCartItem({
    productId: p.id,
    name: p.name,
    price: p.price,
    image: state.selectedDetailColor?.previewImage || p.images[0],
    color: state.selectedDetailColor?.name || p.colors[0].name,
    size: state.selectedDetailSize || p.sizes[0],
    quantity: state.detailQuantity,
    selected: true
  });

  closeProductDetailModal();
  showToast(`เพิ่ม "${p.name}" (${state.selectedDetailSize}) ลงในตะกร้าแล้ว`, "success");
  openCartDrawer();
}

function handleBuyNow() {
  if (!state.currentDetailProduct) return;
  handleAddDetailToCart();
  setTimeout(() => {
    closeCartDrawer();
    openCheckout();
  }, 200);
}

function addToCartItem(newItem) {
  // Find if identical product with same size and color already exists
  const existingIndex = state.cart.findIndex(
    item => item.productId === newItem.productId && item.color === newItem.color && item.size === newItem.size
  );

  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += newItem.quantity;
    state.cart[existingIndex].selected = true;
  } else {
    state.cart.push({
      id: "CART_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      ...newItem
    });
  }

  saveCartToStorage();
}

function openCartDrawer() {
  renderCart();
  const drawer = document.getElementById("cartDrawer");
  if (drawer) {
    drawer.classList.add("drawer-open");
    document.body.style.overflow = "hidden";
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  if (drawer) {
    drawer.classList.remove("drawer-open");
    document.body.style.overflow = "";
  }
}

function renderCart() {
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
        <button onclick="closeCartDrawer()" class="mt-4 px-4 py-2 bg-black text-white text-xs font-semibold rounded hover:bg-neutral-800 transition">
          ช้อปสินค้าต่อ
        </button>
      </div>
    `;
    updateCartSummary();
    return;
  }

  container.innerHTML = state.cart.map(item => `
    <div class="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <!-- Checkbox -->
      <input type="checkbox" ${item.selected ? "checked" : ""} 
        onchange="toggleCartItemSelection('${item.id}')" 
        class="custom-checkbox shrink-0" />

      <!-- Image -->
      <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded object-cover border border-gray-100 shrink-0" />

      <!-- Details -->
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-semibold text-gray-900 truncate">${item.name}</h4>
        <div class="text-[11px] text-gray-500 mt-0.5">
          ตัวเลือก: <span class="font-medium text-gray-800">${item.color} / ${item.size}</span>
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="text-xs font-bold text-black font-sans">฿${item.price.toLocaleString()}</span>
          
          <!-- Stepper -->
          <div class="flex items-center rounded overflow-hidden border border-gray-200">
            <button onclick="updateCartItemQty('${item.id}', -1)" class="w-6 h-6 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-200 text-xs">-</button>
            <span class="w-8 text-center text-xs font-semibold">${item.quantity}</span>
            <button onclick="updateCartItemQty('${item.id}', 1)" class="w-6 h-6 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-200 text-xs">+</button>
          </div>
        </div>
      </div>

      <!-- Delete Button -->
      <button onclick="removeCartItem('${item.id}')" class="text-gray-300 hover:text-red-600 p-1 text-xs shrink-0 transition" title="ลบออกจากตะกร้า">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join("");

  updateCartSummary();
}

function toggleCartItemSelection(itemId) {
  const item = state.cart.find(i => i.id === itemId);
  if (item) {
    item.selected = !item.selected;
    saveCartToStorage();
    renderCart();
  }
}

function toggleSelectAllCart(checked) {
  state.cart.forEach(item => {
    item.selected = checked;
  });
  saveCartToStorage();
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
    saveCartToStorage();
    renderCart();
  }
}

function removeCartItem(itemId) {
  state.cart = state.cart.filter(i => i.id !== itemId);
  saveCartToStorage();
  renderCart();
  showToast("ลบสินค้าออกจากตะกร้าแล้ว", "info");
}

function updateCartSummary() {
  const selectedItems = state.cart.filter(i => i.selected);
  const selectAllCheckbox = document.getElementById("selectAllCartCheckbox");
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = state.cart.length > 0 && selectedItems.length === state.cart.length;
  }

  const subtotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let discount = 0;
  let shipping = selectedItems.length > 0 ? (subtotal >= 990 ? 0 : 40) : 0;

  if (state.appliedVoucher && selectedItems.length > 0) {
    if (state.appliedVoucher.type === "percent") {
      discount = Math.min(state.appliedVoucher.maxDiscount, Math.round((subtotal * state.appliedVoucher.discountPercent) / 100));
    } else if (state.appliedVoucher.type === "fixed") {
      if (subtotal >= state.appliedVoucher.minSpend) {
        discount = state.appliedVoucher.discountAmount;
      }
    } else if (state.appliedVoucher.type === "shipping") {
      if (subtotal >= state.appliedVoucher.minSpend) {
        shipping = 0;
      }
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
  if (shippingEl) shippingEl.innerText = shipping === 0 ? "ฟรี" : `฿${shipping.toLocaleString()}`;
  if (totalEl) totalEl.innerText = `฿${total.toLocaleString()}`;

  if (checkoutBtn) {
    checkoutBtn.disabled = selectedItems.length === 0;
    checkoutBtn.innerText = `สั่งซื้อสินค้า (${selectedItems.length})`;
  }
}

/* ==========================================================================
   Voucher Management
   ========================================================================== */
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
   Checkout Flow
   ========================================================================== */
function openCheckout() {
  const selectedItems = state.cart.filter(i => i.selected);
  if (selectedItems.length === 0) {
    showToast("กรุณาเลือกสินค้าอย่างน้อย 1 รายการก่อนชำระเงิน", "warning");
    return;
  }

  closeCartDrawer();
  const modal = document.getElementById("checkoutModal");
  if (!modal) return;

  renderCheckoutSummary(selectedItems);
  selectPaymentMethod("promptpay");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
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

  const methods = ["promptpay", "credit", "cod"];
  methods.forEach(m => {
    const card = document.getElementById(`payMethod_${m}`);
    const details = document.getElementById(`payDetails_${m}`);
    const isCurrent = m === method;

    if (card) {
      card.classList.toggle("border-black", isCurrent);
      card.classList.toggle("bg-neutral-50", isCurrent);
    }
    if (details) {
      details.classList.toggle("hidden", !isCurrent);
    }
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
          <div class="text-[10px] text-gray-400">${item.color} | ${item.size} x ${item.quantity}</div>
        </div>
      </div>
      <span class="font-bold text-gray-900 shrink-0 ml-2">฿${(item.price * item.quantity).toLocaleString()}</span>
    </div>
  `).join("");

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let shippingCost = state.selectedShippingMethod === "express" ? 80 : 40;
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

  // Free shipping threshold
  if (subtotal >= 990 && state.selectedShippingMethod === "standard") {
    shippingCost = 0;
  }

  const grandTotal = Math.max(0, subtotal - discount + shippingCost);

  document.getElementById("checkoutSubtotal").innerText = `฿${subtotal.toLocaleString()}`;
  document.getElementById("checkoutShipping").innerText = shippingCost === 0 ? "ฟรี" : `฿${shippingCost.toLocaleString()}`;
  document.getElementById("checkoutDiscount").innerText = `-฿${discount.toLocaleString()}`;
  document.getElementById("checkoutGrandTotal").innerText = `฿${grandTotal.toLocaleString()}`;
  
  const qrAmountEl = document.getElementById("qrTotalAmount");
  if (qrAmountEl) qrAmountEl.innerText = `฿${grandTotal.toLocaleString()}`;
}

function submitCheckoutOrder(event) {
  event.preventDefault();

  const name = document.getElementById("orderCustName")?.value.trim();
  const phone = document.getElementById("orderCustPhone")?.value.trim();
  const address = document.getElementById("orderCustAddress")?.value.trim();
  const province = document.getElementById("orderCustProvince")?.value.trim();
  const postalCode = document.getElementById("orderCustPostal")?.value.trim();

  if (!name || !phone || !address || !province || !postalCode) {
    showToast("กรุณากรอกข้อมูลที่อยู่จัดส่งให้ครบถ้วน", "warning");
    return;
  }

  const orderedItems = state.cart.filter(i => i.selected);
  if (orderedItems.length === 0) return;

  const subtotal = orderedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  let shippingCost = state.selectedShippingMethod === "express" ? 80 : 40;
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
  if (subtotal >= 990 && state.selectedShippingMethod === "standard") {
    shippingCost = 0;
  }

  const grandTotal = Math.max(0, subtotal - discount + shippingCost);
  const orderId = "VTX-" + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, "0") + String(new Date().getDate()).padStart(2, "0") + "-" + Math.floor(1000 + Math.random() * 9000);

  const newOrder = {
    orderId,
    date: new Date().toLocaleString("th-TH"),
    customer: { name, phone, address: `${address}, ${province} ${postalCode}` },
    items: orderedItems,
    shippingMethod: state.selectedShippingMethod === "express" ? "VOETEX Instant Express" : "Standard Delivery",
    paymentMethod: state.selectedPaymentMethod === "promptpay" ? "QR PromptPay" : state.selectedPaymentMethod === "credit" ? "บัตรเครดิต/เดบิต" : "เก็บเงินปลายทาง (COD)",
    subtotal,
    discount,
    shippingCost,
    grandTotal,
    status: "ชำระเงินสำเร็จ (กำลังเตรียมจัดส่ง)"
  };

  state.lastOrder = newOrder;

  // Remove ordered items from cart
  state.cart = state.cart.filter(i => !i.selected);
  state.appliedVoucher = null;
  saveCartToStorage();

  // Close checkout modal & show receipt
  closeCheckoutModal();
  openReceiptModal(newOrder);
  showToast("สั่งซื้อสินค้าสำเร็จ! ขอบคุณที่ไว้วางใจ VOETEX", "success");
}

/* ==========================================================================
   Order Receipt Modal
   ========================================================================== */
function openReceiptModal(order) {
  const modal = document.getElementById("orderReceiptModal");
  if (!modal || !order) return;

  document.getElementById("receiptOrderId").innerText = order.orderId;
  document.getElementById("receiptDate").innerText = order.date;
  document.getElementById("receiptCustName").innerText = order.customer.name;
  document.getElementById("receiptCustPhone").innerText = order.customer.phone;
  document.getElementById("receiptCustAddress").innerText = order.customer.address;
  document.getElementById("receiptPaymentMethod").innerText = order.paymentMethod;
  document.getElementById("receiptShippingMethod").innerText = order.shippingMethod;
  document.getElementById("receiptGrandTotal").innerText = `฿${order.grandTotal.toLocaleString()}`;

  const itemsContainer = document.getElementById("receiptItemsList");
  if (itemsContainer) {
    itemsContainer.innerHTML = order.items.map(item => `
      <div class="flex items-center justify-between text-xs py-2 border-b border-gray-100 last:border-0">
        <div>
          <span class="font-bold text-gray-900">${item.name}</span>
          <div class="text-[11px] text-gray-500">${item.color} | ไซส์ ${item.size} (x${item.quantity})</div>
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

function printReceipt() {
  window.print();
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

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
