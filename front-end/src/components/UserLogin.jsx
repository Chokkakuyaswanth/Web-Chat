import { useState } from 'react'
import PropTypes from 'prop-types'
import { FaReact } from 'react-icons/fa6'
import '../style.css'
import _ from 'lodash'
import { backendUrl } from '../config'

const UserLogin = ({ onEnter }) => {
  const [userName, setUserName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submitRoom = async (action) => {
    const user = userName.trim()
    const room = roomName.trim()
    if (!user || !room || !password.trim()) {
      setError('Please fill all fields.')
      return
    }

    setError('')
    setPending(true)
    try {
      const res = await fetch(`${backendUrl}/api/rooms/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: room, password, username: user })
      })
      const data = await res.json()

      if (!res.ok || !data.token) {
        setError(data.error || `Failed to ${action} room.`)
        return
      }

      onEnter({ user, room, token: data.token, avatar: `https://picsum.photos/id/${_.random(1, 1000)}/200/300` })
    } catch {
      setError('Server error.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className='login_container'>
      <div className='login_title'>
        <FaReact className='login_icon' />
        <h1>Chat App</h1>
      </div>
      <div className='login_form'>
        <input
          type='text'
          placeholder='Enter a Unique Name'
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <input
          type='text'
          placeholder='Enter Room Name'
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <input
          type='password'
          placeholder='Enter Room Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={() => submitRoom('join')} disabled={pending}>Join Room</button>
        <button onClick={() => submitRoom('create')} disabled={pending}>Create Room</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </div>
  )
}

UserLogin.propTypes = { onEnter: PropTypes.func.isRequired }

export default UserLogin
