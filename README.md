# Mantine Vite template

## Features

This template comes with the following features:

- [PostCSS](https://postcss.org/) with [mantine-postcss-preset](https://mantine.dev/styles/postcss-preset)
- [TypeScript](https://www.typescriptlang.org/)
- [Storybook](https://storybook.js.org/)
- [Vitest](https://vitest.dev/) setup with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- ESLint setup with [eslint-config-mantine](https://github.com/mantinedev/eslint-config-mantine)
- [ts-proto](https://github.com/stephenh/ts-proto) for TypeScript protobuf generation

## Protobuf Generation

This project uses [ts-proto](https://github.com/stephenh/ts-proto) to generate TypeScript types and gRPC clients from Protocol Buffer definitions.

### Available Make targets:

- `make all` – Clean, download proto files, and generate TypeScript code
- `make clean` – Remove generated files and downloaded protos
- `make download` – Download proto files from the policy-machine-pdp repository
- `make generate` – Generate TypeScript files from proto definitions
- `make install-deps` – Install ts-proto dependency

### Usage:

```bash
# Install dependencies (if ts-proto is not installed)
make install-deps

# Generate all TypeScript files from protos
make all

# Or run individual steps
make clean
make download
make generate
```

Generated TypeScript files will be placed in `src/generated/grpc/`.

## npm scripts

## Build and dev scripts

- `dev` – start development server
- `build` – build production version of the app
- `preview` – locally preview production build

### Testing scripts

- `typecheck` – checks TypeScript types
- `lint` – runs ESLint
- `prettier:check` – checks files with Prettier
- `vitest` – runs vitest tests
- `vitest:watch` – starts vitest watch
- `test` – runs `vitest`, `prettier:check`, `lint` and `typecheck` scripts

### Other scripts

- `storybook` – starts storybook dev server
- `storybook:build` – build production storybook bundle to `storybook-static`
- `prettier:write` – formats all files with Prettier
