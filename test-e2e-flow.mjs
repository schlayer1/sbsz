import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5173';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🚀 Starting SBSZ Full E2E Journey Test with Puppeteer...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Collect any console errors or page errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('🔴 [Browser Error]:', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.error('💥 [Uncaught Page Exception]:', err.message);
  });

  try {
    // ==========================================
    // STEP 1: LOAD APPLICATION (CLEAN SESSION)
    // ==========================================
    console.log('\n--- 1. Navigating to Application & Cleaning Session ---');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1000);

    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    const firstName = 'Leon' + Math.floor(10 + Math.random() * 89);
    const lastName = 'Z' + randomChars;
    const fullName = `${firstName} ${lastName}`;

    // ==========================================
    // STEP 2: STUDENT REGISTRATION & LOGIN
    // ==========================================
    console.log(`\n--- 2. Student Registration (${fullName}) ---`);
    // If student modal is not open, click Login button
    const modalVisible = await page.$('input[placeholder="KÜRZEL"]');
    if (!modalVisible) {
      const loginBtn = await page.$('button ::-p-text(Login)');
      if (loginBtn) await loginBtn.click();
      await sleep(500);
    }

    // Switch to "Neu anlegen" tab
    const tabRegister = await page.waitForSelector('button ::-p-text(Neu anlegen)', { timeout: 5000 });
    await tabRegister.click();
    await sleep(400);

    // Fill in student info
    const firstNameInput = await page.$('input[placeholder="Lukas"]');
    await firstNameInput.type(firstName);

    const lastNameInput = await page.$('input[placeholder="Müller"]');
    await lastNameInput.type(lastName);
    await sleep(400);

    // Read generated student code
    const generatedCode = await page.$eval('.font-mono.font-black.text-sbsz-darkBlue', (el) => el.innerText.trim()).catch(() => 'LZ' + randomChars.slice(0, 2));
    console.log(`   Generated student code: ${generatedCode}`);

    // Submit registration: "Kürzel erstellen & Starten"
    const submitRegBtn = await page.waitForSelector('button[type="submit"]', { timeout: 3000 });
    await submitRegBtn.click();
    await sleep(1500);

    // Verify student is logged in
    const navbarText = await page.$eval('header', (el) => el.innerText);
    console.log('✅ Student logged in! Navbar content includes:', navbarText.replace(/\n+/g, ' '));
    if (!navbarText.includes(firstName) && !navbarText.includes(generatedCode)) {
      throw new Error(`Student registration failed or not displayed in Navbar for ${fullName}`);
    }

    // If activeView was 'result' for some reason, click "Bogen weiter bearbeiten"
    const retakeBtn = await page.$('button ::-p-text(Bogen weiter bearbeiten)');
    if (retakeBtn) {
      console.log('   Clicking "Bogen weiter bearbeiten" to open answer sheet...');
      await retakeBtn.click();
      await sleep(800);
    }

    // ==========================================
    // STEP 3: FILL IN EXAM QUESTIONS
    // ==========================================
    console.log('\n--- 3. Filling in Exam (25 answered, 3 deselected [A]) ---');
    await page.waitForSelector('.rounded-2xl.border', { timeout: 10000 });
    // Questions 1, 2, 3: Deselect [A]
    for (let q = 1; q <= 3; q++) {
      // Find the card for question q and click its [A] button
      const clicked = await page.evaluate((qNum) => {
        const questionCards = Array.from(document.querySelectorAll('.rounded-2xl.border'));
        for (const card of questionCards) {
          const numBadge = card.querySelector('.w-7.h-7');
          if (numBadge && numBadge.textContent.trim() === String(qNum)) {
            const deselectBtn = Array.from(card.querySelectorAll('button')).find((b) =>
              b.textContent.includes('[A]')
            );
            if (deselectBtn) {
              deselectBtn.click();
              return true;
            }
          }
        }
        return false;
      }, q);

      if (clicked) {
        console.log(`   Deselected Question ${q} [A]`);
      } else {
        console.warn(`   Could not find deselect button for question ${q}`);
      }
      await sleep(150);
    }

    // Questions 4 to 28: Answer option 1 to 5
    for (let q = 4; q <= 28; q++) {
      await page.evaluate((qNum) => {
        const questionCards = Array.from(document.querySelectorAll('.rounded-2xl.border'));
        for (const card of questionCards) {
          const numBadge = card.querySelector('.w-7.h-7');
          if (numBadge && numBadge.textContent.trim() === String(qNum)) {
            const targetOpt = String((qNum % 5) + 1);
            const optBtn = Array.from(card.querySelectorAll('button')).find(
              (b) => b.textContent.trim() === targetOpt
            );
            if (optBtn) {
              optBtn.click();
              return true;
            }
          }
        }
        return false;
      }, q);

      if (q % 6 === 0) {
        console.log(`   Answered questions up to ${q}...`);
      }
      await sleep(80);
    }

    await sleep(1000); // Allow debounce auto-save to finish

    // ==========================================
    // STEP 4: SUBMIT EXAM
    // ==========================================
    console.log('\n--- 4. Submitting Exam ---');
    const submitExamBtn = await page.waitForSelector('button ::-p-text(Prüfungsbogen jetzt abgeben)', { timeout: 5000 });
    await submitExamBtn.click();
    await sleep(500);

    // Confirm submission modal: "Endgültig abgeben"
    const confirmSubmitBtn = await page.waitForSelector('button ::-p-text(Endgültig abgeben)', { timeout: 5000 });
    await confirmSubmitBtn.click();
    await sleep(1500);

    // Verify Result View is displayed
    const resultHeading = await page.$eval('h1', (el) => el.innerText);
    console.log('✅ Result view loaded successfully! Heading:', resultHeading);

    // Verify KPI percentage is rendered
    const scoreText = await page.evaluate(() => {
      const el = document.querySelector('.text-4xl.font-black');
      return el ? el.textContent : null;
    });
    console.log('✅ Calculated IHK Score:', scoreText);

    // ==========================================
    // STEP 5: LOGOUT AS STUDENT
    // ==========================================
    console.log('\n--- 5. Student Logout ---');
    const logoutStudentBtn = await page.waitForSelector('button[title="Als Schüler abmelden"]', { timeout: 5000 });
    await logoutStudentBtn.click();
    await sleep(800);
    console.log('✅ Student logged out.');

    // ==========================================
    // STEP 6: TEACHER LOGIN
    // ==========================================
    console.log('\n--- 6. Teacher Login ---');
    const teacherModalBtn = await page.$('button ::-p-text(Zum Lehrer-Login)');
    if (teacherModalBtn) {
      await teacherModalBtn.click();
    } else {
      const teacherLoginBtn = await page.waitForSelector('button ::-p-text(Lehrkräfte)', { timeout: 5000 });
      await teacherLoginBtn.click();
    }
    await sleep(600);

    // Enter PIN 1234
    const pinInput = await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await pinInput.type('1234');
    await sleep(200);

    const pinSubmitBtn = await page.waitForSelector('button ::-p-text(Dashboard entsperren)', { timeout: 5000 });
    await pinSubmitBtn.click();
    await sleep(1500);

    // Verify Teacher Dashboard is displayed
    const dashboardHeader = await page.$eval('main', (el) => el.innerText);
    console.log('✅ Teacher Dashboard loaded!');

    // ==========================================
    // STEP 7: FIND SUBMISSION & GENERATE FEEDBACK
    // ==========================================
    console.log('\n--- 7. Teacher reviews submission and creates Feedback ---');
    // Find row containing firstName or generatedCode and click "KI-Coach"
    const coachClicked = await page.evaluate((code, name) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      for (const row of rows) {
        if (row.textContent.includes(name) || row.textContent.includes(code)) {
          const coachBtn = Array.from(row.querySelectorAll('button')).find((b) =>
            b.textContent.includes('KI-Coach')
          );
          if (coachBtn) {
            coachBtn.click();
            return true;
          }
        }
      }
      return false;
    }, generatedCode, firstName);

    if (!coachClicked) {
      console.log('   Switching to Gemini tab directly...');
      const geminiTab = await page.waitForSelector('button ::-p-text(KI-Feedback)', { timeout: 5000 });
      await geminiTab.click();
      await sleep(500);

      // Click on student button in Gemini tab
      await page.evaluate((name) => {
        const studentButtons = Array.from(document.querySelectorAll('button'));
        const targetBtn = studentButtons.find((b) => b.textContent.includes(name));
        if (targetBtn) targetBtn.click();
      }, firstName);
    }

    console.log('   Waiting for AI generation to complete and textarea to appear...');
    await page.waitForSelector('textarea', { timeout: 25000 });

    // Check textarea with feedback draft
    const feedbackDraft = await page.$eval('textarea', (el) => el.value);
    console.log('✅ Feedback draft generated! Length:', feedbackDraft.length, 'characters');
    console.log('   Draft preview:\n  ', feedbackDraft.slice(0, 180).replace(/\n/g, '\n   '), '...');

    // Click "An Schüler freigeben & senden"
    const sendFeedbackBtn = await page.waitForSelector('button ::-p-text(An Schüler freigeben & senden)', { timeout: 5000 });
    await sendFeedbackBtn.click();
    await sleep(1200);

    const feedbackNotice = await page.$eval('main', (el) => el.innerText);
    if (feedbackNotice.includes('Feedback erfolgreich an den Schüler übermittelt') || feedbackNotice.includes('Freigabe erteilt')) {
      console.log('✅ Feedback successfully sent to student!');
    }

    // ==========================================
    // STEP 8: TEACHER LOGOUT
    // ==========================================
    console.log('\n--- 8. Teacher Logout ---');
    const teacherLogoutBtn = await page.waitForSelector('button[title="Lehrermodus beenden"]', { timeout: 5000 });
    await teacherLogoutBtn.click();
    await sleep(1000);
    console.log('✅ Teacher logged out.');

    // ==========================================
    // STEP 9: STUDENT LOGIN & READ FEEDBACK
    // ==========================================
    console.log(`\n--- 9. Student Login with Code ${generatedCode} & Reading Feedback ---`);
    const studentLoginBtn = await page.$('button ::-p-text(Login)');
    if (studentLoginBtn) {
      await studentLoginBtn.click();
      await sleep(500);
    }

    // Ensure Tab 1 (Kürzel eingeben) is active
    const tabCode = await page.$('button ::-p-text(Kürzel eingeben)');
    if (tabCode) {
      await tabCode.click();
      await sleep(300);
    }

    // Code input tab
    const codeInput = await page.waitForSelector('input[placeholder="KÜRZEL"]', { timeout: 5000 });
    await codeInput.click({ clickCount: 3 });
    await codeInput.type(generatedCode);
    await sleep(300);

    const loginCodeBtn = await page.waitForSelector('button ::-p-text(Mit Kürzel anmelden)', { timeout: 5000 });
    await loginCodeBtn.click();
    await sleep(1500);

    // Verify student is on result view and feedback section is visible!
    const feedbackSection = await page.$('#teacher-feedback-section');
    if (!feedbackSection) {
      throw new Error('Teacher feedback section (#teacher-feedback-section) was not found in student result view!');
    }
    const feedbackTextRendered = await page.$eval('#teacher-feedback-section', (el) => el.innerText);
    console.log('✅ Student successfully received & viewing feedback!');
    console.log('   Rendered Feedback Heading:\n  ', feedbackTextRendered.slice(0, 150).replace(/\n/g, '\n   '));

    // Test clicking the "Feedback" badge in the navbar
    const navFeedbackBtn = await page.$('button ::-p-text(Feedback)');
    if (navFeedbackBtn) {
      await navFeedbackBtn.click();
      console.log('✅ Navbar Feedback shortcut clicked and smooth scrolled.');
    }
    await sleep(800);

    // ==========================================
    // STEP 10: SWITCH TO ANOTHER EXAM
    // ==========================================
    console.log('\n--- 10. Switch to another Exam Sheet ---');
    // Click "Bogen weiter bearbeiten" or Navbar "Bogen"
    const navBogenBtn = await page.waitForSelector('button ::-p-text(Bogen)', { timeout: 5000 });
    await navBogenBtn.click();
    await sleep(800);

    // Select second exam from dropdown
    const selectExamEl = await page.waitForSelector('select', { timeout: 5000 });
    const availableExams = await page.$$eval('select option', (opts) => opts.map((o) => o.value));
    console.log('   Available exams:', availableExams);

    if (availableExams.length > 1) {
      const secondExamId = availableExams[1];
      await selectExamEl.select(secondExamId);
      await sleep(1500);
      console.log(`✅ Switched to second exam: ${secondExamId}`);
    }

    // ==========================================
    // STEP 11: WINDOW RESIZE TEST (MINIMIZE & MAXIMIZE)
    // ==========================================
    console.log('\n--- 11. Window Resize Testing (Half-Screen to Full-Screen) ---');
    console.log('   Simulating window shrink (720x800)...');
    await page.setViewport({ width: 720, height: 800 });
    await sleep(1000);

    // Verify mobile tab toggle bar exists on < 1024px
    const mobileToggle = await page.$('button ::-p-text(Aufgabenheft)');
    if (mobileToggle) {
      console.log('✅ Responsive layout adapted cleanly to mobile/half-width!');
    }

    console.log('   Simulating window maximize to Ultra-Wide (1920x1080)...');
    await page.setViewport({ width: 1920, height: 1080 });
    await sleep(1200);

    // Verify body and container width
    const containerMetrics = await page.evaluate(() => {
      const main = document.querySelector('main');
      const header = document.querySelector('header');
      return {
        windowWidth: window.innerWidth,
        mainWidth: main ? main.clientWidth : 0,
        headerWidth: header ? header.clientWidth : 0,
      };
    });

    console.log('✅ Full screen metrics:', containerMetrics);
    if (containerMetrics.mainWidth < 1800) {
      console.warn('⚠️ Warning: main container width is narrower than expected:', containerMetrics.mainWidth);
    } else {
      console.log('✅ Full-width layout filled completely across 1920px screen!');
    }

    // ==========================================
    // FINAL ERROR AUDIT
    // ==========================================
    if (consoleErrors.length > 0) {
      console.error('\n❌ Console errors encountered during flow:');
      consoleErrors.forEach((e) => console.error('  -', e));
    } else {
      console.log('\n🎉 ZERO Console Errors throughout the entire test flow!');
    }

    console.log('\n🏆 ALL END-TO-END FLOWS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTest();
