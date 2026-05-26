function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error("Operation timed out")), timeoutMs);
    })
  ]);
}

module.exports = {
  withTimeout
};
