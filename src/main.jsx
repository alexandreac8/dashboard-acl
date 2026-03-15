import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Painel from './Painel'

const path = window.location.pathname;
const Root = path.startsWith('/painel') ? Painel : App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
