# Playwright API Smoke Tests

Fast Playwright-based API validation with two practical workflows: a reliable public API smoke test for CI and a headed Beeceptor demo flow for recording browser-based endpoint automation.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1.52%2B-2EAD33?logo=playwright&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)
![dotenv](https://img.shields.io/badge/dotenv-16.x-ECD53F?logo=dotenv&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

## Core Features

- Runs a fast API smoke test against JSONPlaceholder using Playwright's `APIRequestContext`.
- Provides a headed Beeceptor demo script for logging in, opening endpoints, and walking through a browser-visible automation flow.
- Supports environment-based configuration for Beeceptor credentials, endpoint names, pacing, and final hold time.
- Generates Playwright HTML reports, screenshots, videos, and traces when enabled by the test configuration.
- Keeps the default `npm test` workflow lightweight and stable for local verification or CI usage.

## Folder Structure

```text
playwright-api-smoke-tests/
├── scripts/
│   └── beeceptor-demo.js
├── tests/
│   └── simple-api.spec.js
├── utils/
│   └── logger.js
├── .env.example
├── .gitignore
├── LICENSE
├── package.json
├── package-lock.json
├── playwright.config.js
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- Git

### Clone and install

```bash
git clone https://github.com/acme-labs/playwright-api-smoke-tests.git
cd playwright-api-smoke-tests
npm install
npx playwright install chromium
```

### Environment setup

The smoke test does not require Beeceptor credentials, but the Beeceptor demo script does.

```bash
cp .env.example .env
```

Example `.env` values:

```env
BEEEPTOR_EMAIL=demo.user@example.com
BEEEPTOR_PASSWORD=SuperSecurePassword123
BEEEPTOR_BASE_URL=https://app.beeceptor.com
MAIN_ENDPOINT_NAME=playwright-main-ep
RECEIVER_ENDPOINT_NAME=playwright-receiver
BEECEPTOR_DEMO_STEP_PAUSE_MS=5000
BEECEPTOR_DEMO_SLOWMO_MS=700
BEECEPTOR_DEMO_FINAL_HOLD_MS=60000
TEST_TIMEOUT=60000
```

## Usage Examples

### Run the default API smoke test

```bash
npm test
```

### Run the smoke test in a visible browser

```bash
npm run test:headed
```

### Run the Beeceptor recording/demo flow

```bash
npm run beeceptor:demo
```

### Run the Beeceptor demo in headless mode

```bash
npm run beeceptor:demo:headless
```

### Open the latest Playwright HTML report

```bash
npx playwright show-report
```

## Contributing

Contributions are welcome. To keep changes reviewable and reliable:

- Create a feature branch from `main`.
- Keep changes focused and update tests when behavior changes.
- Run `npm test` before opening a pull request.
- Include a short summary of what changed and how it was verified.

Example workflow:

```bash
git checkout -b feature/improve-demo-flow
npm test
git add .
git commit -m "Improve Beeceptor demo flow"
git push origin feature/improve-demo-flow
```

## License

This project is licensed under the MIT License.

```text
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
```

See [LICENSE](./LICENSE) for the full license text.
