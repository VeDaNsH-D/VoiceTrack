const mongoose = require("mongoose");
const Transaction = require("../models/transaction.model");
const RawLog = require("../models/rawLog.model");

const transactions = [];
const rawLogs = [];

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

async function saveProcessedTransaction(entry) {
  if (isMongoReady()) {
    return Transaction.create(entry);
  }

  transactions.push({
    id: transactions.length + 1,
    createdAt: new Date().toISOString(),
    ...entry,
  });

  return transactions[transactions.length - 1];
}

async function saveRawLog(entry) {
  if (isMongoReady()) {
    return RawLog.create(entry);
  }

  rawLogs.push({
    id: rawLogs.length + 1,
    createdAt: new Date().toISOString(),
    ...entry,
  });

  return rawLogs[rawLogs.length - 1];
}

async function listTransactions() {
  if (isMongoReady()) {
    return Transaction.find().sort({ createdAt: -1 }).lean();
  }

  return [...transactions];
}

async function listRawLogs() {
  if (isMongoReady()) {
    return RawLog.find().sort({ createdAt: -1 }).lean();
  }

  return [...rawLogs];
}

module.exports = {
  saveProcessedTransaction,
  saveRawLog,
  listTransactions,
  listRawLogs,
};
