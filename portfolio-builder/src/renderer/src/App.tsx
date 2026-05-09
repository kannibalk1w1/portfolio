import React, { useState } from 'react'

function App(): React.JSX.Element {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>CYP Portfolio Builder</h1>
      <p>Build an Electron app with React and TypeScript</p>
      <div>
        <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
      </div>
      <p style={{ marginTop: '1rem', color: '#888' }}>
        Press F12 to open developer tools
      </p>
    </div>
  )
}

export default App
