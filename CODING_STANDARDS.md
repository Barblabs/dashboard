# Coding Standards

Review rules for judgement calls that no check catches (`typecheck`, `lint`, `knip` and `test` cover the mechanical ones). Apply every rule to the diff; names and domain meaning come from barbackend's `GLOSSARY.md` and `docs/adr/`.

## API layer (`src/api/`)

- **Types come from the spec**: response and request types derive from `Schemas` (`Override` to narrow a field, `Known` for request bodies). A value list is `as const satisfies readonly T[]` against the spec's union when the spec has one. A hand-written shape that mirrors a spec schema drifts when the backend adds a field.
- **Invariants live in the type**: when the backend guarantees fields are all set or all null (a Declaration's value, `declared_by` and `declared_at`), the type is a union of the two states, so code narrows on one field instead of checking each.
- **Each module owns its cache**: a query key and its `listCache` stay private to the module that fetches them. Other modules change that cache through the owner's functions (`showAssetInInventory`, `invalidateInventory`). Steps several mutations share are composed in a module named for the domain event (`api/declarations.ts`).

## Components

- **Glossary terms name domain values only**: UI state around a domain value gets its own name (`DeclarationSection` holds the choice and the save; the Declaration is the Asset's value).
- **Shared class constants leave out what their users vary**: Tailwind resolves two utilities on one property (`text-navy`, `text-gray`) by stylesheet order, not class order, so a constant that sets a text colour, border or background can't be overridden by appending another.
- **Hooks are named consts at the top of the component**: a hook's result passed to another hook is assigned first, not called inside the other hook's arguments.

## Mocks

- **Handlers mirror barbackend**: an MSW handler checks the body, then the role, then the resource, in barbackend's order, and answers with barbackend's status and error code (its `internal/httpapi/*_test.go` lists them).

## Tests

- **Through the app**: render with `renderApp` against the MSW mocks and query by role and accessible name; a test asserts what the User sees, not component state.
- **An invariant a comment relies on has a test that goes red without it**: when a comment explains why the code does X rather than the simpler Y, changing the code to Y fails a test.

## i18n

- **One key per concept**: a label shown in several places reuses its existing key (`config.inventory.*`) rather than adding a second key with the same text.
