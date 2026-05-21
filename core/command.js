// Store all commands
const commands = new Map();

// Function to add a command
function bot(commandConfig) {
  commands.set(commandConfig.command, {
    description: commandConfig.description,
    category: commandConfig.category,
    execute: commandConfig.execute
  });
}

// Function to get a command
function getCommand(name) {
  return commands.get(name);
}

// Function to get all commands
function getAllCommands() {
  return commands;
}

// ============ ADMIN FUNCTIONS ============

async function isBotAdmin(sock, groupId, botNumber) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    const botParticipant = groupMetadata.participants.find(p => p.id === botNumber);
    return botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
  } catch {
    return false;
  }
}

async function isUserAdmin(sock, groupId, userId) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    const userParticipant = groupMetadata.participants.find(p => p.id === userId);
    return userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin';
  } catch {
    return false;
  }
}

async function kickUser(sock, groupId, userId) {
  await sock.groupParticipantsUpdate(groupId, [userId], 'remove');
}

// ============ DATABASE SETUP ============

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database file
const dbPath = path.join(__dirname, 'warnings.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
  // Warnings table
  db.run(`
        CREATE TABLE IF NOT EXISTS warnings (
            group_id TEXT,
            user_id TEXT,
            warnings INTEGER DEFAULT 0,
            PRIMARY KEY (group_id, user_id)
        )
    `);
  
  // Shut users table
  db.run(`
        CREATE TABLE IF NOT EXISTS shut_users (
            group_id TEXT,
            user_id TEXT,
            shut_by TEXT,
            shut_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, user_id)
        )
    `);
});

// ============ WARNING FUNCTIONS ============

function addWarning(groupId, userId) {
  return new Promise((resolve, reject) => {
    db.run(`
            INSERT INTO warnings (group_id, user_id, warnings) 
            VALUES (?, ?, 1)
            ON CONFLICT(group_id, user_id) 
            DO UPDATE SET warnings = warnings + 1
        `, [groupId, userId], function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getWarnings(groupId, userId) {
  return new Promise((resolve, reject) => {
    db.get(`
            SELECT warnings FROM warnings 
            WHERE group_id = ? AND user_id = ?
        `, [groupId, userId], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.warnings : 0);
    });
  });
}

function resetWarnings(groupId, userId) {
  return new Promise((resolve, reject) => {
    db.run(`
            DELETE FROM warnings 
            WHERE group_id = ? AND user_id = ?
        `, [groupId, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function clearWarnings(groupId, userId) {
  return resetWarnings(groupId, userId);
}

// ============ SHUT FUNCTIONS ============

function addShutUser(groupId, userId, shutBy) {
  return new Promise((resolve, reject) => {
    db.run(`
            INSERT OR REPLACE INTO shut_users (group_id, user_id, shut_by, shut_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `, [groupId, userId, shutBy], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function removeShutUser(groupId, userId) {
  return new Promise((resolve, reject) => {
    db.run(`
            DELETE FROM shut_users 
            WHERE group_id = ? AND user_id = ?
        `, [groupId, userId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function isShutUser(groupId, userId) {
  return new Promise((resolve, reject) => {
    db.get(`
            SELECT * FROM shut_users 
            WHERE group_id = ? AND user_id = ?
        `, [groupId, userId], (err, row) => {
      if (err) reject(err);
      else resolve(row !== null);
    });
  });
}

function getShutUsers(groupId) {
  return new Promise((resolve, reject) => {
    db.all(`
            SELECT user_id, shut_by, shut_at 
            FROM shut_users 
            WHERE group_id = ?
        `, [groupId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ============ EXPORTS ============

module.exports = {
  bot,
  getCommand,
  getAllCommands, // ← Fixed: added 's'
  isBotAdmin,
  isUserAdmin,
  kickUser,
  addWarning,
  getWarnings,
  resetWarnings,
  clearWarnings,
  addShutUser, 
  removeShutUser,
  isShutUser, 
  getShutUsers 
};