import './index.css';
import '@mdxeditor/editor/style.css';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  codeMirrorPlugin,
  CodeToggle,
  CreateLink,
  headingsPlugin,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  MDXEditorMethods,
  quotePlugin,
  Separator,
  StrikeThroughSupSubToggles,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { collaborationPlugin } from './plugins/CollaborationPlugin';
import inlineCopilotPlugin from './plugins/inline-copilot';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const defaultCopilotService = (context: string) => {
  return Promise.resolve('mock sugestion content');
};

const CustomerToolbar: React.FC = () => {
  return (
    <>
      <UndoRedo />

      <Separator />
      <BoldItalicUnderlineToggles />
      <CodeToggle />

      <Separator />
      <StrikeThroughSupSubToggles options={['Strikethrough']} />

      <Separator />
      <ListsToggle options={['bullet', 'number']} />

      <Separator />
      <BlockTypeSelect />

      <Separator />
      <CreateLink />

      <Separator />
      <InsertTable />
      <InsertThematicBreak />
    </>
  );
};

(window as any).ref = React.createRef<MDXEditorMethods>();

function App() {
  const plugins = [
    toolbarPlugin({ toolbarContents: () => <CustomerToolbar /> }),
    listsPlugin(),
    quotePlugin(),
    headingsPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    thematicBreakPlugin(),
    codeMirrorPlugin({
      codeBlockLanguages: {
        js: 'JavaScript',
        css: 'CSS',
        txt: 'text',
        tsx: 'TypeScript',
      },
    }),
    markdownShortcutPlugin(),
    collaborationPlugin({ id: '2/aaa' }),
    inlineCopilotPlugin({ service: defaultCopilotService }),
  ];

  return (
    <div className="h-screen w-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto h-full">
        <MDXEditor
          ref={(window as any).ref}
          contentEditableClassName="prose"
          plugins={plugins}
        ></MDXEditor>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<App />);
