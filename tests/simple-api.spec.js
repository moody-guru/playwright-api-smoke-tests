const { test, expect } = require('@playwright/test');
const Logger = require('../utils/logger');

test.describe('Simple Public API Smoke Test', () => {
  test('GET and POST requests work against JSONPlaceholder', async ({ request }) => {
    Logger.step(1, 'Fetching an existing post');
    const getResponse = await request.get('https://jsonplaceholder.typicode.com/posts/1');
    expect(getResponse.ok()).toBeTruthy();

    const post = await getResponse.json();
    expect(post).toMatchObject({
      id: 1,
      userId: 1,
    });
    expect(post.title).toBeTruthy();
    Logger.info(`Fetched post title: ${post.title}`);

    Logger.step(2, 'Creating a test post');
    const createResponse = await request.post('https://jsonplaceholder.typicode.com/posts', {
      data: {
        title: 'Playwright API test',
        body: 'Fast smoke test without login or onboarding',
        userId: 1,
      },
    });
    expect(createResponse.status()).toBe(201);

    const createdPost = await createResponse.json();
    expect(createdPost).toMatchObject({
      title: 'Playwright API test',
      body: 'Fast smoke test without login or onboarding',
      userId: 1,
    });
    expect(createdPost.id).toBeTruthy();
    Logger.info(`Created test post id: ${createdPost.id}`);
  });
});
