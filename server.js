/**
 * VORTEX Local Development Server
 * รันเซิร์ฟเวอร์แบบ Zero-Dependency (ใช้เฉพาะโมดูลมาตรฐานของ Node.js)
 * รองรับการเปิดเว็บ, แสดงรายการรูปภาพในโฟลเดอร์ images แบบอัตโนมัติ
 * และรองรับการอัปโหลดรูปภาพใหม่บันทึกเข้าโฟลเดอร์ images/เสื้อผ้า หรือ images/ โดยตรง
 */

const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const IMAGES_DIR = path.join(ROOT_DIR, "images");

// MIME types ที่รองรับ
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

// ฟังก์ชันสแกนหารูปภาพทั้งหมดในโฟลเดอร์ images แบบ Recursive
async function scanImages(dir, relativeTo = ROOT_DIR) {
  let results = [];
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await scanImages(fullPath, relativeTo);
        results = results.concat(sub);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
          const relPath = path.relative(relativeTo, fullPath).split(path.sep).join("/");
          let mtimeMs = 0;
          try {
            const stat = fs.statSync(fullPath);
            mtimeMs = stat.mtimeMs || 0;
          } catch (e) {}

          results.push({
            name: entry.name,
            path: relPath,
            folder: path.basename(dir),
            mtime: mtimeMs
          });
        }
      }
    }
  } catch (err) {
    console.error("Error scanning images:", err);
  }
  // เรียงไฟล์ใหม่ล่าสุดไว้บนสุด
  results.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  return results;
}

// ชุดการเชื่อมต่อ SSE สำหรับอัปเดตไฟล์รูปภาพสด
const sseClients = new Set();

function broadcastImagesUpdate(images) {
  if (sseClients.size === 0) return;
  const payload = JSON.stringify({
    type: "images_updated",
    count: images.length,
    images: images,
    timestamp: Date.now()
  });
  const msg = `data: ${payload}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// ตัวตรวจจับการเปลี่ยนแปลงของโฟลเดอร์ images/ (Live Folder Watcher)
let folderWatchDebounceTimer = null;
try {
  fs.watch(IMAGES_DIR, { recursive: true }, (eventType, filename) => {
    if (folderWatchDebounceTimer) clearTimeout(folderWatchDebounceTimer);
    folderWatchDebounceTimer = setTimeout(async () => {
      try {
        const images = await scanImages(IMAGES_DIR);
        console.log(`[Folder Watcher] มีการเพิ่ม/เปลี่ยนรูปใน images/ (${eventType}: ${filename || "files"}) -> รวม ${images.length} รูป`);
        broadcastImagesUpdate(images);
      } catch (err) {
        console.error("Watcher rescan error:", err);
      }
    }, 250);
  });
  console.log(`👁️ ระบบตรวจจับไฟล์รูปภาพอัตโนมัติ (Live Folder Watcher) เปิดทำงานแล้ว`);
} catch (watchErr) {
  console.warn("fs.watch recursive warning (fallback to polling):", watchErr);
}

// ส่ง ping ทุก 25 วินาทีเพื่อรักษาการเชื่อมต่อ SSE
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(": ping\n\n");
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 25000);

const server = http.createServer(async (req, res) => {
  // CORS Headers สำหรับการพัฒนา
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  // API 0: Real-time Server-Sent Events (SSE) Stream สำหรับอัปเดตแคตตาล็อกรูปภาพสดทันทีเมื่อมีไฟล์ใหม่
  if (req.method === "GET" && pathname === "/api/images-stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive"
    });
    res.write("\n");

    scanImages(IMAGES_DIR).then(images => {
      res.write(`data: ${JSON.stringify({ type: "init", count: images.length, images, timestamp: Date.now() })}\n\n`);
    }).catch(() => {});

    sseClients.add(res);

    req.on("close", () => {
      sseClients.delete(res);
    });
    return;
  }

  // API 1: ดึงรายชื่อรูปภาพทั้งหมดในโฟลเดอร์ images (ไม่แคชข้อมูล เพื่อให้สดใหม่เสมอ)
  if (req.method === "GET" && pathname === "/api/images-list") {
    try {
      const images = await scanImages(IMAGES_DIR);
      res.writeHead(200, { 
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      });
      res.end(JSON.stringify({ success: true, count: images.length, images }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API 2: อัปโหลดรูปภาพใหม่และบันทึกลงโฟลเดอร์ images/ หรือ images/เสื้อผ้า/ โดยตรง
  if (req.method === "POST" && pathname === "/api/upload-image") {
    req.setEncoding("utf8");
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      // จำกัดขนาดไม่เกิน 50MB
      if (body.length > 50 * 1024 * 1024) {
        res.writeHead(413, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, error: "ขนาดไฟล์ใหญ่เกินกำหนด (สูงสุด 50MB)" }));
        req.destroy();
      }
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        let { filename, data, folder } = payload;

        if (!data || !filename) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, error: "ข้อมูลรูปภาพไม่ครบถ้วน" }));
          return;
        }

        // คัดแยกประเภทโฟลเดอร์ปลายทาง (ค่าเริ่มต้นคือ 'เสื้อผ้า') โดยใช้ Unicode property regex (\p{Letter}\p{Mark}\p{Number})
        let targetFolder = folder ? String(folder).replace(/[^\p{Letter}\p{Mark}\p{Number}_\-]/gu, "") : "เสื้อผ้า";
        if (!targetFolder) targetFolder = "เสื้อผ้า";
        
        const targetDir = path.join(IMAGES_DIR, targetFolder);
        await fsp.mkdir(targetDir, { recursive: true });

        // ล้างชื่อไฟล์ให้ปลอดภัย รองรับทั้งชื่อภาษาไทยและภาษาอังกฤษ (รวมสระและวรรณยุกต์)
        const safeExt = path.extname(filename).toLowerCase() || ".jpg";
        let baseName = path.basename(filename, safeExt).replace(/[^\p{Letter}\p{Mark}\p{Number}_\-]/gu, "_");
        if (!baseName) baseName = `img_${Date.now()}`;
        
        let finalFilename = `${baseName}${safeExt}`;
        let destPath = path.join(targetDir, finalFilename);

        // ถ้าไฟล์ชื่อซ้ำ ให้เติม timestamp
        if (fs.existsSync(destPath)) {
          finalFilename = `${baseName}_${Date.now()}${safeExt}`;
          destPath = path.join(targetDir, finalFilename);
        }

        // ถอดรหัส base64 และเขียนไฟล์ลงดิสก์
        const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        await fsp.writeFile(destPath, buffer);

        // อัปเดตและบรอดแคสต์ภาพใหม่ให้ทุกแท็บทันที
        scanImages(IMAGES_DIR).then(broadcastImagesUpdate).catch(() => {});

        const relativeUrl = `images/${targetFolder}/${finalFilename}`.replace(/\\/g, "/");
        console.log(`[Upload] บันทึกไฟล์รูปใหม่สำเร็จ: ${relativeUrl} (${buffer.length} bytes)`);

        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          success: true,
          url: relativeUrl,
          filename: finalFilename,
          folder: targetFolder,
          size: buffer.length
        }));
      } catch (err) {
        console.error("Upload error:", err);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // เสิร์ฟ Static Files ปกติ
  let safePath = path.normalize(path.join(ROOT_DIR, pathname));
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end("Access Denied");
    return;
  }

  try {
    let stat = await fsp.stat(safePath);
    if (stat.isDirectory()) {
      safePath = path.join(safePath, "index.html");
      stat = await fsp.stat(safePath);
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  } catch (err) {
    if (err.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
    } else {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Internal Server Error");
    }
  }
});

server.listen(PORT, () => {
  console.log("==================================================");
  console.log(`🚀 VORTEX Server รันเรียบร้อยที่: http://localhost:${PORT}`);
  console.log(`📁 โฟลเดอร์รูปภาพ: ${IMAGES_DIR}`);
  console.log(`✨ หากเพิ่มรูปภาพใหม่ใน images/ ระบบจะตรวจพบอัตโนมัติ`);
  console.log("==================================================");
});
