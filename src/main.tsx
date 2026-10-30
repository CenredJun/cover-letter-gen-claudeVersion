import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { startSync } from './lib/sync'

// Load profiles and history from the artifact's private storage.
startSync()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
