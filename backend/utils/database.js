
const fs = require("fs/promises");
const { databasePath } = require("./storagePaths");

let transactionQueue = Promise.resolve();

async function initializeDatabase() {
  await fs.mkdir(path.dirname(databasePath), {
    recursive: true
  });

  try {
    await fs.access(databasePath);
  } catch {
    await fs.writeFile(
      databasePath,
      JSON.stringify({
        users: [],
        products: [],
        orders: [],
        reactivationRequests: []
      }, null, 2)
    );
  }
}

async function writeFileSafely(data) {
  const temporaryPath = databasePath + ".tmp";

  await fs.writeFile(
    temporaryPath,
    JSON.stringify(data, null, 2),
    "utf8"
  );

  await fs.rename(temporaryPath, databasePath);
}

async function readDatabase() {
  await transactionQueue;
  await initializeDatabase();

  const content = await fs.readFile(databasePath, "utf8");

  const data = JSON.parse(content);

  return {
    users: data.users || [],
    products: data.products || [],
    orders: data.orders || [],
    reactivationRequests: data.reactivationRequests || []
  };
}

function updateDatabase(callback) {
  const operation = transactionQueue.then(async () => {
    await initializeDatabase();

    const content = await fs.readFile(databasePath, "utf8");
    const data = JSON.parse(content);

    data.users ||= [];
    data.products ||= [];
    data.orders ||= [];
    data.reactivationRequests ||= [];

    const result = await callback(data);

    await writeFileSafely(data);

    return result;
  });

  transactionQueue = operation.catch(() => {});

  return operation;
}

function saveDatabase(data) {
  const operation = transactionQueue.then(async () => {
    await initializeDatabase();
    await writeFileSafely(data);
  });

  transactionQueue = operation.catch(() => {});

  return operation;
}

module.exports = {
  initializeDatabase,
  readDatabase,
  saveDatabase,
  updateDatabase
};
