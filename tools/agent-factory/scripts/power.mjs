import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');
const root = fileURLToPath(new URL('../', import.meta.url));
loadEnvConfig(root, true);
const [command, ...options] = process.argv.slice(2);
const host = process.env.FACTORY_HOST || '127.0.0.1';
const url = `http://${host}:3100/api/power`;
const headers = process.env.FACTORY_TOKEN ? { Authorization: `Bearer ${process.env.FACTORY_TOKEN}` } : {};

async function state(method = 'GET') {
  const response = await fetch(url, { method, headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Control HTTP ${response.status}. Revisa FACTORY_HOST y reinicia con npm run power:on si usabas npm run dev.`);
  return response.json();
}

async function listening(endpoint) {
  try {
    await fetch(endpoint, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch { return false; }
}

function launch(executable, args, extraEnv = {}) {
  return spawn(executable, args, { cwd: root, stdio: 'inherit', detached: true, env: { ...process.env, ...extraEnv } });
}

async function terminate(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  try { process.kill(-child.pid, 'SIGTERM'); } catch (error) {
    if (error.code !== 'ESRCH') throw error;
    return;
  }
  await exited;
}

async function main() {
  if (command === 'status') {
    if (!await listening(url)) console.log('Fábrica: apagada o dirección inaccesible.');
    else {
      const current = await state();
      console.log(`Fábrica: ${current.draining ? 'apagándose' : 'encendida'}. Corridas activas: ${current.activeRuns}.`);
    }
    console.log(`Ollama: ${await listening('http://127.0.0.1:11434') ? 'encendido' : 'apagado'}.`);
    return;
  }
  if (command === 'stop') {
    await state('POST');
    console.log('Apagado solicitado. Esperando las corridas activas; no cierres la terminal de arranque.');
    while (await listening(url)) await pause(2000);
    console.log('Fábrica apagada.');
    return;
  }
  if (command !== 'start') throw new Error('Uso: power.mjs start [--local] | stop | status');
  if (await listening(url)) throw new Error('Ya hay un servidor en esa dirección. No se inició otro.');
  if (host !== '127.0.0.1' && host !== 'localhost' && !process.env.FACTORY_TOKEN) {
    throw new Error('Configura FACTORY_TOKEN antes de escuchar en la red.');
  }
  let ollama;
  let next;
  let draining = false;
  let failed = false;
  const requestStop = async () => {
    if (draining) return;
    draining = true;
    console.log('Esperando que terminen las corridas antes de apagar…');
  };
  process.on('SIGINT', requestStop);
  process.on('SIGTERM', requestStop);
  try {
    if (options.includes('--local') || process.env.OLLAMA_ENABLED === '1') {
      if (await listening('http://127.0.0.1:11434')) {
        throw new Error('Ollama ya está activo fuera de este control. Ciérralo primero para poder apagar ambos juntos.');
      }
      ollama = launch('ollama', ['serve'], { OLLAMA_HOST: '127.0.0.1:11434', OLLAMA_NO_CLOUD: '1', OLLAMA_KEEP_ALIVE: '30s', OLLAMA_NUM_PARALLEL: '1', OLLAMA_MAX_LOADED_MODELS: '1', OLLAMA_MODELS: process.env.OLLAMA_MODELS || `${root}.models` });
      ollama.on('error', () => { failed = true; console.error('No se pudo iniciar Ollama. Comprueba que esté instalado.'); });
      ollama.on('exit', () => {
        if (!next) failed = true;
        else console.log('Ollama terminó; la fábrica seguirá hasta su apagado normal.');
      });
      for (let i = 0; i < 30 && !failed; i++) {
        if (await listening('http://127.0.0.1:11434')) break;
        await pause(1000);
      }
      if (failed || !await listening('http://127.0.0.1:11434')) throw new Error('Ollama no está disponible.');
    }
    next = launch(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--port', '3100', '--hostname', host], { FACTORY_MANAGED: '1', ...(ollama ? { OLLAMA_ENABLED: '1' } : {}) });
    next.on('error', () => { failed = true; });
    next.on('exit', () => { failed = true; });
    console.log(`Fábrica: http://${host}:3100. Control + C solicita apagado sin cancelar corridas.`);
    let ready = false;
    let warned = false;
    while (!failed) {
      try {
        const current = await state();
        ready = true;
        warned = false;
        if (draining && !current.draining) {
          await state('POST');
        } else if (current.draining && current.activeRuns === 0) {
          break;
        }
      } catch (error) {
        if (ready && !warned) {
          console.error('No se puede comprobar el estado. Se reintentará sin interrumpir corridas.');
          warned = true;
        }
      }
      await pause(2000);
    }
    if (failed) throw new Error('Un servicio terminó antes del apagado normal.');
    await terminate(next);
    await terminate(ollama);
    console.log('Fábrica apagada. Ollama iniciado por este comando también está apagado.');
  } catch (error) {
    // Never terminate a running factory if its active-run status cannot be confirmed.
    if (!next || failed) await terminate(ollama);
    throw error;
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
