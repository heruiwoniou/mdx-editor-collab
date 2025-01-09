# MDX Editor Patches & Collaboration Plugin

This project provides patches and enhancements for the [MDX Editor](https://github.com/mdx-editor/editor) package, including a collaborative text editing plugin.

## Features

- Custom patches for MDX Editor
- Collaborative text editing plugin
- TypeScript support
- Vite-based development environment

## Installation

1. Clone this repository:

```bash
git clone https://github.com/heruiwoniou/mdx-editor-collab.git
```

2. Install dependencies:

```bash
npm install
```

3. Start the yjs server:

```bash
npm run server:ws
```

4. Start the development server:

```bash
npm run start
```

## Usage

### Collaborative Editing Plugin

Import and use the collaboration plugin in your MDX Editor setup:

```typescript
import { CollaborationPlugin } from './plugins/CollaborationPlugin';

// In your editor configuration
<MDXEditor
  plugins={[CollaborationPlugin({ id: 'your_room_name'})]}
/>
```

## Development

- Build the project: `npm run build`
- Run tests: `npm test`
- Format code: `npm run format`
- Lint code: `npm run lint`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
