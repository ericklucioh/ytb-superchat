## Code Style

- Functions: 4–20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function.
- One responsibility per module.
- Prefer small focused modules over god files.
- Guard clauses first.
- Early returns over nested conditionals.
- Max 2 levels of indentation.
- Prefer explicit code over clever code.
- Prefer clarity over micro-optimizations.

## Naming

- Names must encode intent, not type.
- Avoid generic names like `data`, `handler`, `manager`, `utils`.
- Avoid abbreviations unless they are domain-standard.
- Boolean names must read as predicates:
  - `is_valid`
  - `has_permission`
  - `can_execute`
  - `should_retry`
- Prefer names that are easy to search in the codebase.

## Types and Contracts

- Use explicit types.
- Avoid untyped functions.
- Avoid `any` / `Any` unless strictly necessary and documented.
- Avoid raw dictionaries crossing layer boundaries.
- Use explicit schemas, DTOs, records, structs, classes, or value objects.
- Validate data at creation, not later.
- Error messages must include:
  - the invalid value
  - the expected shape/rule
  - the operation that failed

## Architecture

- Domain/business logic must not import infrastructure.
- Domain/business logic must not call databases, HTTP APIs, queues, filesystems, or external services directly.
- External I/O must be isolated behind adapters, gateways, repositories, or ports.
- Time, randomness, configuration, and external calls must be injectable.
- Keep business rules deterministic whenever possible.
- No hidden global state.
- No implicit dependencies.

## Data Flow

- Prefer immutable inputs and outputs where possible.
- Avoid mutating objects across layers without clear ownership.
- Do not pass loose maps/objects when a named schema exists.
- Transform external data at the boundary.
- Keep internal models clean and domain-focused.

## Reuse and Duplication

- No copy-paste business logic.
- Extract shared behavior into focused functions, modules, or domain services.
- Do not create generic abstractions too early.
- Abstractions must be justified by repeated real usage.

## Control Flow

- Avoid deep nesting.
- Avoid large `if/else` chains for business rules.
- Prefer explicit rule objects, strategy maps, pattern matching, or small dispatch functions when it improves readability.
- Avoid reflection/dynamic attribute access unless unavoidable.
  - Avoid patterns like `getattr`, `setattr`, dynamic property access, or string-based method calls in core logic.
- Avoid runtime type branching in core domain logic.
  - Do not rely on repeated `isinstance`-style checks to decide business behavior.
  - Prefer polymorphism, explicit schemas, discriminated unions, enums, or validated command types.

## Testing

- Business rules must be testable without database, API, filesystem, or network.
- Tests should assert behavior, not implementation details.
- Use factories/builders for complex test data.
- Edge cases must be explicit:
  - empty input
  - invalid input
  - boundary values
  - external failure
  - duplicated data