import { z } from 'zod';

const commandField = z.string().trim().toLowerCase().min(1).max(100);

const redirectPayloadSchema = z.object({ url: z.string().url() });
const effectPayloadSchema = z.object({
  effect: z.string().min(1).max(100),
  durationSeconds: z.coerce.number().positive().max(120).optional(),
});
const messagePayloadSchema = z.object({ message: z.string().min(1).max(2000) });

export const createSignalSchema = z.discriminatedUnion('type', [
  z.object({
    command: commandField,
    type: z.literal('REDIRECT'),
    payload: redirectPayloadSchema,
    isActive: z.boolean().optional(),
  }),
  z.object({
    command: commandField,
    type: z.literal('EFFECT'),
    payload: effectPayloadSchema,
    isActive: z.boolean().optional(),
  }),
  z.object({
    command: commandField,
    type: z.literal('MESSAGE'),
    payload: messagePayloadSchema,
    isActive: z.boolean().optional(),
  }),
]);

// type y payload siempre viajan juntos: así nunca queda un payload
// guardado con una forma que no corresponde a su tipo.
// El primer branch usa .strict(): sin eso, Zod poda los campos type/payload
// que no reconoce y ese branch matchea primero, ignorando en silencio
// cualquier intento de cambiar el tipo de un comando existente.
export const updateSignalSchema = z.union([
  z.object({ command: commandField.optional(), isActive: z.boolean().optional() }).strict(),
  z.object({
    command: commandField.optional(),
    type: z.literal('REDIRECT'),
    payload: redirectPayloadSchema,
    isActive: z.boolean().optional(),
  }),
  z.object({
    command: commandField.optional(),
    type: z.literal('EFFECT'),
    payload: effectPayloadSchema,
    isActive: z.boolean().optional(),
  }),
  z.object({
    command: commandField.optional(),
    type: z.literal('MESSAGE'),
    payload: messagePayloadSchema,
    isActive: z.boolean().optional(),
  }),
]);

export const listSignalsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
});
