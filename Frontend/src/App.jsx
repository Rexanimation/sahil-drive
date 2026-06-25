import { useState } from 'react'

import './App.css'
import AppRoutes from './AppRoutes'
import ShaderBackground from './components/ShaderBackground'

function App() {


  return (
    <>
      <ShaderBackground />
      <AppRoutes />
    </>
  )
}

export default App
