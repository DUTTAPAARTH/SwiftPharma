/**
 * Playwright admin-page checker
 * Uses the bundled Playwright Chromium (avoids system Chrome conflict)
 * Run: node check-admin-pages.mjs
 */
import { chromium } from "playwright-core";
import path from "path";
import os from "os";

const EXECUTABLEPATH = path.join(
  os.homedir(),
  "AppData",
  "Local",
  "ms-playwright",
  "chromium-1208",
  "chrome-win64",
  "chrome.exe",
);

const BASE = "http://localhost:5173";
const EMAIL = "test@swiftpharma.com";
const PASSWORD = "Test@123";

const ADMIN_PAGES = [
  { name: "Admin Dashboard", path: "/admin" },
  { name: "Admin Prescriptions", path: "/admin/prescriptions" },
  { name: "Admin Orders", path: "/admin/orders" },
  { name: "Admin Products", path: "/admin/products" },
  { name: "Admin Users", path: "/admin/users" },
  { name: "Admin Analytics", path: "/admin/analytics" },
];

const results = [];

function pad(str, len) {
  return String(str).padEnd(len, " ");
}

async function run() {
  const browser = await chromium.launch({
    executablePath: EXECUTABLEPATH,
    headless: true,
    args: ["--no-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Collect console errors and JS crashes
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) =>
    consoleErrors.push(`PAGE ERROR: ${err.message}`),
  );

  // ─────────────────── Login ───────────────────
  console.log("\n[1/7] Logging in...");
  // First request triggers Vite prebundling – allow up to 45s
  await page.goto(`${BASE}/login`, {
    waitUntil: "load",
    timeout: 45000,
  });
  await page.waitForTimeout(2000); // let Vite finish prebundling

  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect (admin goes to /admin)
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 10000,
    });
    console.log(`   ✅ Login OK → redirected to ${page.url()}`);
  } catch {
    const loginErrors = consoleErrors.slice();
    consoleErrors.length = 0;
    console.log(
      `   ❌ Login did NOT redirect. Console errors: ${loginErrors.join(" | ")}`,
    );
    await browser.close();
    process.exit(1);
  }

  // ─────────────────── Check each admin page ───────────────────
  for (let i = 0; i < ADMIN_PAGES.length; i++) {
    const { name, path: pagePath } = ADMIN_PAGES[i];
    const url = `${BASE}${pagePath}`;
    console.log(`\n[${i + 2}/${ADMIN_PAGES.length + 1}] ${name} (${url})`);

    const pageErrors = [];
    const onError = (e) => pageErrors.push(`PAGE ERROR: ${e.message}`);
    const onConsole = (msg) => {
      if (msg.type() === "error") pageErrors.push(msg.text());
    };
    page.on("pageerror", onError);
    page.on("console", onConsole);

    let status = "OK";
    let finalUrl = "";
    let title = "";
    let bodyText = "";

    try {
      await page.goto(url, {
        waitUntil: "load",
        timeout: 20000,
      });
      // Give React a moment to hydrate and fire any data fetches
      await page.waitForTimeout(2500);
      finalUrl = page.url();
      title = await page.title();
      bodyText = (await page.innerText("body"))
        .slice(0, 400)
        .replace(/\s+/g, " ")
        .trim();

      // Check for redirect to login (access denied)
      if (finalUrl.includes("/login")) {
        status = "REDIRECT_TO_LOGIN";
      } else if (finalUrl !== url && !finalUrl.startsWith(url)) {
        status = `REDIRECTED → ${finalUrl}`;
      }

      // Check for error messages in the DOM
      const errorTexts = await page.$$eval(
        "[class*='error'], [class*='Error'], [role='alert']",
        (els) => els.map((el) => el.innerText).filter(Boolean),
      );
      if (errorTexts.length) {
        pageErrors.push(...errorTexts.map((t) => `UI: ${t.slice(0, 120)}`));
      }
    } catch (err) {
      status = `EXCEPTION: ${err.message.slice(0, 120)}`;
    }

    page.off("pageerror", onError);
    page.off("console", onConsole);

    results.push({
      name,
      path: pagePath,
      status,
      finalUrl,
      title,
      bodyText,
      errors: [...pageErrors],
    });

    const errStr = pageErrors.length
      ? `\n      ⚠ Errors: ${pageErrors.join(" | ")}`
      : "";
    console.log(`   Status  : ${status}`);
    console.log(`   Title   : ${title}`);
    console.log(`   URL     : ${finalUrl}`);
    console.log(`   Preview : ${bodyText.slice(0, 200)}`);
    if (pageErrors.length)
      console.log(`   ⚠ Errors: ${pageErrors.join("\n            ")}`);
  }

  await browser.close();

  // ─────────────────── Summary ───────────────────
  console.log("\n" + "═".repeat(68));
  console.log("ADMIN PAGE CHECK SUMMARY");
  console.log("═".repeat(68));
  console.log(pad("Page", 26) + pad("Status", 20) + pad("Errors", 18));
  console.log("─".repeat(68));
  for (const r of results) {
    const errCount = r.errors.length ? `${r.errors.length} error(s)` : "none";
    const statusIcon = r.status === "OK" && r.errors.length === 0 ? "✅" : "❌";
    console.log(
      pad(`${statusIcon} ${r.name}`, 26) +
        pad(r.status.slice(0, 18), 20) +
        pad(errCount, 18),
    );
  }
  console.log("═".repeat(68));

  const failed = results.filter(
    (r) => r.status !== "OK" || r.errors.length > 0,
  );
  if (failed.length === 0) {
    console.log("\n🎉 All admin pages loaded without errors.");
  } else {
    console.log(`\n⚠  ${failed.length} page(s) had issues.`);
  }
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
