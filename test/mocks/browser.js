const { setupWorker } = require("msw");
const { handlers } = require("./handlers");

export const worker = setupWorker(...handlers);
