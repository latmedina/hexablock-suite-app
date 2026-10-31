# ADR 0001: TypeScript with React Native (Expo) and NestJS

- Status: accepted
- Date: 2026-10-31

## Context

The assignment requires a language with generics (bounded type parameters), a mobile client with
an Android release, a REST backend, CI and contract tests. Team of 3, six weeks.

## Decision

TypeScript in both repositories: React Native + Expo for the app, NestJS + Prisma + PostgreSQL for
the API.

## Consequences

- One language: shared DTO knowledge and Pact JS on both sides.
- Bounded generics are expressed with `extends`, e.g. `TCell extends IMergeable<TCell>`.
- Domain and application layers stay framework-free; React/Nest only live in the outer layers.
