import {
  createSignalSchema,
  updateSignalSchema,
  listSignalsQuerySchema,
} from '../validators/signalValidator.js';
import * as signalService from '../services/signalService.js';
import { ok } from '../utils/response.js';

export async function list(req, res, next) {
  try {
    const { includeInactive } = listSignalsQuerySchema.parse(req.query);
    const signals = await signalService.listSignals({ includeInactive });
    ok(res, signals);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const data = createSignalSchema.parse(req.body);
    const signal = await signalService.createSignal(data);
    ok(res, signal, 201);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const data = updateSignalSchema.parse(req.body);
    const signal = await signalService.updateSignal(req.params.id, data);
    ok(res, signal);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await signalService.deleteSignal(req.params.id);
    ok(res, null);
  } catch (error) {
    next(error);
  }
}

export async function resolve(req, res, next) {
  try {
    const result = await signalService.resolveCommand(req.params.command);
    ok(res, result);
  } catch (error) {
    next(error);
  }
}
