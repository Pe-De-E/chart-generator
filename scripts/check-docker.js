#!/usr/bin/env node

/**
 * Prüft ob Docker läuft, bevor wir versuchen Container zu starten
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkDocker() {
  try {
    await execAsync('docker info');
    console.log('✅ Docker läuft!');
    return true;
  } catch (error) {
    console.error('\n❌ Docker läuft nicht!\n');
    console.log('📋 Bitte starte Docker Desktop:');
    console.log('   1. Öffne Docker Desktop');
    console.log('   2. Warte bis das Docker-Icon in der Taskleiste "grün" ist');
    console.log('   3. Führe dann erneut aus: pnpm dev:all\n');

    if (process.platform === 'win32') {
      console.log('💡 Tipp: Du kannst Docker Desktop auch per Shortcut starten:');
      console.log('   - Windows-Taste drücken');
      console.log('   - "Docker Desktop" eintippen');
      console.log('   - Enter drücken\n');
    }

    process.exit(1);
  }
}

checkDocker();
