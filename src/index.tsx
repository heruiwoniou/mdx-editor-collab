import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function App() {
  return <h1>Hello, React with TypeScript!</h1>;
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(<App />);
