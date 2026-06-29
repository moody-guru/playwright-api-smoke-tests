class Logger {
  static info(message, data) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    console.log(`[INFO] ${timestamp} - ${message}${dataStr}`);
  }

  static step(stepNumber, message) {
    console.log(`\n=== STEP ${stepNumber}: ${message} ===`);
  }

  static error(message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] ${timestamp} - ${message}`);
    if (error) {
      console.error(`[ERROR] ${error.message || error}`);
    }
  }
}

module.exports = Logger;
