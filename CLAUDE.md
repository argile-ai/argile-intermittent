## Build & Test Commands

- **Lint**: `npm run eslint:fix`
- **Format**: `npm run biome:format:fix`
- **Typecheck**: `npm run typecheck`
- **Build**: DO NOT TEST FOR BUILD UNLESS ASKED
- **Dev server**: `npm run dev`
- **Test**: `npm run test`

## Code Preferences

- TypeScript for type safety
- React components with functional style
- UI components prefer composition over inheritance
- Prefer hooks over class Components
- Use Chakra UI for styling and Components
- Use tanstack/react-query for data fetching and mutations
- Use enums intensively for fixed sets of values and avoid string literals
- Texts are in French but comments and variables are in English
- Use zod for schema validation
- Use defined functions instead of arrow functions
- Export default React components and helper functions
- Use type instead of interface
- Use Readonly for typing props
- Do not use barrel files
- Prefer icons from ionic-icons using react-icons
- Use useToken's chakra-ui hook for token management
- Use small functions and small files
- Do not use pixels for styling (instead use integers or semantic values)
- You must not use `any` type
- Use helper functions to explicit the code
- Move utility/helper functions to `helpers/` directory when they can be reused
- Move constants to `constants.ts` file to keep them organized and reusable
- Do not use multi level relative imports (max 2 levels)
- Do not import React from 'react'
- Do not annotate JSX.Element return type
- Prefer to use useMutation and useQuery from react-query
- Use useMutation for async operations like downloads, API calls, and other side effects
- Prefer `??` operator over `||` operator (IMPORTANT: Always use `??` for nullish coalescing instead of `||`)
- Early return in functions
- Do not export if not necessary (we use knip to detect unused exports)
- It is VERY important to avoid prop drilling - components get data directly from hooks.
- For error messages, use `toastError` from '@services/toast' (not useToast from Chakra)
- Do not use toast for success messages
- Do not fontSize="xs" unless asked

IMPORTANT: do small component files (around 100 lines). If a component is too big, split it into smaller components in a `components/` subfolder.

SUPER CRITICAL: You are NOT allowed to use useEffect. If you have no other option, you MUST ask for approval.
