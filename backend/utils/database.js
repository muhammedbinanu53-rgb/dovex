const fs = require("fs/promises");
const path = require("path");
const { databasePath } = require("./storagePaths");
const { getSupabaseClient, isSupabaseConfigured } = require("./supabase");

let transactionQueue = Promise.resolve();
const STATE_ROW_ID = "dovex";

function normalizeDatabase(data = {}) {
  return {
    users: Array.isArray(data.users) ? data.users : [],
    products: Array.isArray(data.products) ? data.products : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    reactivationRequests: Array.isArray(data.reactivationRequests) ? data.reactivationRequests : []
  };
}

async function readSupabaseState() {
  const { data, error } = await getSupabaseClient()
    .from("dovex_state")
    .select("data")
    .eq("id", STATE_ROW_ID)
    .maybeSingle();
  if (error) throw new Error(`Unable to read DoveX database: ${error.message}`);
  return normalizeDatabase(data?.data);
}

async function writeSupabaseState(data) {
  const { error } = await getSupabaseClient()
    .from("dovex_state")
    .upsert({ id: STATE_ROW_ID, data: normalizeDatabase(data) }, { onConflict: "id" });
  if (error) throw new Error(`Unable to save DoveX database: ${error.message}`);
}

async function initializeDatabase() {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient()
      .from("dovex_state")
      .select("id")
      .eq("id", STATE_ROW_ID)
      .maybeSingle();
    if (error) throw new Error(`Unable to initialize DoveX database: ${error.message}`);
    if (!data) await writeSupabaseState(normalizeDatabase());
    return;
  }

  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  try {
    await fs.access(databasePath);
  } catch {
    await fs.writeFile(databasePath, JSON.stringify(normalizeDatabase(), null, 2), "utf8");
  }
}

async function readLocalDatabase() {
  await initializeDatabase();
  return normalizeDatabase(JSON.parse(await fs.readFile(databasePath, "utf8")));
}

async function writeLocalDatabase(data) {
  const temporaryPath = `${databasePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(normalizeDatabase(data), null, 2), "utf8");
  await fs.rename(temporaryPath, databasePath);
}

async function readDatabase() {
  await transactionQueue;
  return isSupabaseConfigured() ? readSupabaseState() : readLocalDatabase();
}

function updateDatabase(callback) {
  const operation = transactionQueue.then(async () => {
    const data = isSupabaseConfigured() ? await readSupabaseState() : await readLocalDatabase();
    const result = await callback(data);
    if (isSupabaseConfigured()) await writeSupabaseState(data);
    else await writeLocalDatabase(data);
    return result;
  });
  transactionQueue = operation.catch(() => {});
  return operation;
}

function saveDatabase(data) {
  const operation = transactionQueue.then(async () => {
    if (isSupabaseConfigured()) await writeSupabaseState(data);
    else {
      await initializeDatabase();
      await writeLocalDatabase(data);
    }
  });
  transactionQueue = operation.catch(() => {});
  return operation;
}

module.exports = { initializeDatabase, readDatabase, saveDatabase, updateDatabase };
