#!/usr/bin/env node

/**
 * Wartet bis PostgreSQL bereit ist
 * Versucht max. 30 Sekunden lang zu verbinden
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000; // 1 Sekunde

async function checkDatabase() {
  try {
    // Prüft ob PostgreSQL Container läuft und bereit ist
    await execAsync('docker exec chart-generator-db pg_isready -U chartgen');
    return true;
  } catch (error) {
    return false;
  }
}

async function waitForDatabase() {
  console.log('⏳ Warte auf PostgreSQL...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    if (await checkDatabase()) {
      console.log('✅ PostgreSQL ist bereit!');
      return;
    }

    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
  }

  console.error('\n❌ PostgreSQL konnte nicht erreicht werden.');
  console.error('Stelle sicher, dass Docker Desktop läuft!');
  process.exit(1);
}

waitForDatabase();
