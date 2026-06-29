require('dotenv').config();
const { chromium, request } = require('playwright');
const Logger = require('../utils/logger');

const REQUIRED_ENV_VARS = [
  'BEEEPTOR_EMAIL',
  'BEEEPTOR_PASSWORD',
  'MAIN_ENDPOINT_NAME',
  'RECEIVER_ENDPOINT_NAME',
];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required in .env`);
  }
  return value;
}

function getIntEnv(name, fallback) {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function endpointUrl(name) {
  return `https://${name}.free.beeceptor.com`;
}

async function pause(page, ms, message) {
  if (message) {
    Logger.info(message);
  }
  if (ms > 0) {
    await page.waitForTimeout(ms);
  }
}

async function gotoAndSettle(page, url) {
  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 60000 });
  } catch (error) {
    Logger.info(`Primary navigation wait failed for ${url}. Retrying with load.`, error.message);
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  }
  await page.waitForTimeout(4000);
}

async function clickIfVisible(locator, options = {}) {
  const isVisible = await locator.isVisible().catch(() => false);
  if (!isVisible) {
    return false;
  }
  await locator.click({ force: true, ...options });
  return true;
}

async function firstVisibleLocator(locators) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }
  return null;
}

//locator ..

async function login(page, config) {
  Logger.step(1, 'Opening Beeceptor and signing in');
  await gotoAndSettle(page, `${config.baseUrl}/login`);

  await clickIfVisible(page.getByRole('button', { name: /password/i }).first());
  await pause(page, 700, 'Switching to password login');

  await page.locator('#form-login-password #email').fill(config.email);
  await page.locator('#form-login-password #password').fill(config.password);
  await page.locator('#form-login-password button[type="submit"]').click();
  await pause(page, config.stepPauseMs, 'Signed in and waiting for the app to settle');
}

async function openEndpoints(mainPage, receiverPage, config) {
  Logger.step(2, 'Opening the main and receiver endpoint consoles');

  await gotoAndSettle(mainPage, `${config.baseUrl}/console/${config.mainEndpointName}`);
  await pause(mainPage, config.stepPauseMs, `Main endpoint console: ${config.mainEndpointName}`);

  await gotoAndSettle(receiverPage, `${config.baseUrl}/console/${config.receiverEndpointName}`);
  await pause(receiverPage, config.stepPauseMs, `Receiver endpoint console: ${config.receiverEndpointName}`);

  await mainPage.bringToFront();
  await pause(mainPage, config.stepPauseMs, 'Back on the main endpoint console');
}

async function configureOrReuseRule(page, config) {
  Logger.step(3, 'Trying to reuse or configure an HTTP Callout rule');

  const bodyText = await page.locator('body').textContent();
  if (bodyText && bodyText.includes(config.receiverEndpointName)) {
    Logger.info('Receiver endpoint already appears on the page. Reusing the existing configuration.');
    await pause(page, config.stepPauseMs, 'Reusing the existing HTTP Callout setup');
    return true;
  }

  await clickIfVisible(page.locator('text=/Mock Rules/i').first());
  await pause(page, 2500, 'Opening the Mock Rules area');

  const createRuleLocator = await firstVisibleLocator([
    page.locator('#createNew'),
    page.getByRole('button', { name: /add a mock rule|new rule|add rule/i }).first(),
    page.locator('#floatingAIRuleBtn'),
  ]);

  if (createRuleLocator) {
    await createRuleLocator.click({ force: true });
    await pause(page, 4000, 'Opening the rule configuration UI');
  }

  const calloutTypeLocator = await firstVisibleLocator([
    page.locator('text=/HTTP Callout/i').first(),
    page.locator('text=/Callout/i').first(),
    page.locator('text=/Webhook/i').first(),
    page.locator('text=/Forward/i').first(),
  ]);

  if (calloutTypeLocator) {
    await calloutTypeLocator.click({ force: true });
    await pause(page, 2500, 'Selecting the callout rule type');
  }

  const targetInput = await firstVisibleLocator([
    page.locator('#targetEndpoint'),
    page.locator('#targetDomain'),
    page.locator('input[placeholder*="webhook" i]'),
    page.locator('input[type="url"]'),
  ]);

  if (!targetInput) {
    Logger.info('No visible callout URL field was found. The script will continue in reuse mode for recording.');
    await pause(page, config.stepPauseMs, 'Leaving the existing Beeceptor console visible for recording');
    return false;
  }

  await targetInput.fill(config.receiverPublicUrl);
  Logger.info(`Set callout target to ${config.receiverPublicUrl}`);

  const descriptionInput = await firstVisibleLocator([
    page.locator('#ruleDescription'),
    page.locator('input[name="Description"]'),
  ]);
  if (descriptionInput) {
    await descriptionInput.fill(`Playwright demo callout ${Date.now()}`);
  }

  const saveButton = await firstVisibleLocator([
    page.getByRole('button', { name: /save|create|apply/i }).last(),
    page.locator('button:has-text("Save")').last(),
  ]);

  if (saveButton) {
    await saveButton.click({ force: true });
    await pause(page, config.stepPauseMs, 'Saving the rule configuration');
  } else {
    Logger.info('No visible save button was found after filling the callout target.');
  }

  return true;
}

async function triggerAndVerify(mainPage, receiverPage, apiContext, config) {
  Logger.step(4, 'Triggering the API call on the main endpoint');

  const token = `beeceptor-demo-${Date.now()}`;
  const payload = {
    token,
    source: 'playwright-demo',
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await apiContext.post(config.mainPublicUrl, {
      data: payload,
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
      timeout: 15000,
    });
    Logger.info(`Main endpoint response status: ${response.status()}`);
  } catch (error) {
    Logger.info(`Main endpoint request did not finish cleanly: ${error.message}`);
  }

  await pause(mainPage, config.stepPauseMs + 5000, 'API call sent from the automation');

  Logger.step(5, 'Checking the receiver endpoint for the callout');
  await receiverPage.bringToFront();
  await gotoAndSettle(receiverPage, `${config.baseUrl}/console/${config.receiverEndpointName}`);
  await pause(receiverPage, config.stepPauseMs, 'Refreshing the receiver console');

  const receiverBody = (await receiverPage.locator('body').textContent()) || '';
  const verified = receiverBody.includes(token);

  if (verified) {
    Logger.info(`Verified the callout in the receiver console using token ${token}`);
  } else {
    Logger.info(`The receiver console did not visibly show token ${token}. Keeping the page open for recording/manual confirmation.`);
  }

  return verified;
}

async function cleanup(mainPage, config) {
  Logger.step(6, 'Cleanup');
  Logger.info('No destructive cleanup is performed. Shared endpoints remain available for the demo.');
  await pause(mainPage, config.finalHoldMs, 'Holding the final Beeceptor screen open so you can finish recording');
}

async function main() {
  for (const name of REQUIRED_ENV_VARS) {
    getRequiredEnv(name);
  }

  const config = {
    email: getRequiredEnv('BEEEPTOR_EMAIL'),
    password: getRequiredEnv('BEEEPTOR_PASSWORD'),
    baseUrl: process.env.BEEEPTOR_BASE_URL || 'https://app.beeceptor.com',
    mainEndpointName: getRequiredEnv('MAIN_ENDPOINT_NAME'),
    receiverEndpointName: getRequiredEnv('RECEIVER_ENDPOINT_NAME'),
    stepPauseMs: getIntEnv('BEECEPTOR_DEMO_STEP_PAUSE_MS', 5000),
    slowMoMs: getIntEnv('BEECEPTOR_DEMO_SLOWMO_MS', 700),
    finalHoldMs: getIntEnv('BEECEPTOR_DEMO_FINAL_HOLD_MS', 60000),
    headless: process.env.BEECEPTOR_DEMO_HEADLESS === '1',
  };

  config.mainPublicUrl = endpointUrl(config.mainEndpointName);
  config.receiverPublicUrl = endpointUrl(config.receiverEndpointName);

  Logger.info(`Launching Beeceptor demo in ${config.headless ? 'headless' : 'headed'} mode`);

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.headless ? 0 : config.slowMoMs,
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const apiContext = await request.newContext();
  const mainPage = await context.newPage();
  const receiverPage = await context.newPage();

  try {
    await login(mainPage, config);
    await openEndpoints(mainPage, receiverPage, config);
    await configureOrReuseRule(mainPage, config);
    await triggerAndVerify(mainPage, receiverPage, apiContext, config);
    await cleanup(mainPage, config);
  } catch (error) {
    Logger.error('Beeceptor demo failed', error);
    throw error;
  } finally {
    await apiContext.dispose();
    await context.close();
    await browser.close();
  }
}

main().catch(() => {
  process.exitCode = 1;
});
