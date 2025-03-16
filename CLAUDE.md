# CLAUDE.md - EasyDL Repository Guidelines

## Build, Lint & Test Commands
- Build: `npm run build` - Compiles TypeScript to dist/ directory
- Run examples: `npm run examples` - Builds and runs example code
- Run all tests: `npx jest` - Runs all Jest tests
- Run single test: `npx jest tests/filename.test.ts` or `npx jest -t "test description"`

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, targeting ES2015
- **Imports**: Use named imports `import { func } from "./file"` or namespace imports `import * as module`
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Privacy**: Prefix private members with underscore (_privateProp)
- **Documentation**: JSDoc comments for public API functions and classes
- **Error handling**: Use try/catch with EventEmitter pattern (`this.emit("error", err)`)
- **Types**: Explicit return types, interfaces for data structures
- **Async**: Use async/await with Promise-based APIs
- **Architecture**: Event-driven programming using EventEmitter

This library enables easy file downloading with support for resuming downloads, multi-connection parallel downloads, and automatic retries.