import { AppError } from '../utils/AppError.js';
import * as signalRepository from '../repositories/signalRepository.js';

export async function listSignals({ includeInactive }) {
  return signalRepository.findAll({ includeInactive });
}

export async function createSignal(data) {
  const existing = await signalRepository.findByCommandAny(data.command);
  if (existing) throw new AppError('Ese comando ya existe', 409);
  return signalRepository.create(data);
}

export async function updateSignal(id, data) {
  if (data.command) {
    const existing = await signalRepository.findByCommandAny(data.command);
    if (existing && existing.id !== id) throw new AppError('Ese comando ya existe', 409);
  }
  const signal = await signalRepository.update(id, data);
  if (!signal) throw new AppError('Comando no encontrado', 404);
  return signal;
}

export async function deleteSignal(id) {
  const deleted = await signalRepository.remove(id);
  if (!deleted) throw new AppError('Comando no encontrado', 404);
}

export async function resolveCommand(rawCommand) {
  const command = rawCommand.trim().toLowerCase();
  const signal = await signalRepository.findByCommand(command);
  if (!signal) throw new AppError('Comando no encontrado', 404);
  return { command: signal.command, type: signal.type, payload: signal.payload };
}
