import type {
  Client,
  ClientOccupation,
  Gestor,
  ClientGestor,
} from "@prisma/client";

export type ClientDto = Client;
export type ClientWithOccupation = Client & { occupation: ClientOccupation | null };
export type GestorDto = Gestor;
export type ClientGestorDto = ClientGestor & { gestor: Gestor };
