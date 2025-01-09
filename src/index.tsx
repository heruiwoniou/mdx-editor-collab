import './index.css';

import { headingsPlugin, MDXEditor } from '@mdxeditor/editor';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { collaborationPlugin } from './plugins/CollaborationPlugin';

function App() {
  return (
    <div className="h-screen w-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto h-full">
        <MDXEditor
          plugins={[
            collaborationPlugin({ id: 'room/initialize' }),
            headingsPlugin(),
          ]}
        ></MDXEditor>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(<App />);
