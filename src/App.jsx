import React, { useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Signup from './Component/Signup'
import Login from './Component/Login'
import Chat from './Component/Chat'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './config/firebase-config'

const App = () => {
  const [user, setUser] = React.useState(null)

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setUser(user)
    })
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Chat /> : <Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  )
}

export default App
