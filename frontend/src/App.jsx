import { useState, useEffect } from 'react';

// --- CSS Styles Component ---
// All styles are now included directly in the JS file to fix the build error.
const AppStyles = () => (
  <style>{`
    /* --- Base Styles --- */
    :root {
      --bg-color: #1a1a1a;
      --card-bg: #2a2a2a;
      --border-color: #444;
      --text-color: #f0f0f0;
      --accent-color: #007bff;
      --success-color: #28a745;
      --danger-color: #dc3545;
      --shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      margin: 0;
      padding: 2rem;
      box-sizing: border-box;
    }

    .app-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .title {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--text-color);
      letter-spacing: 1px;
      margin-bottom: 2rem;
    }

    /* --- Nodes Container --- */
    .nodes-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      width: 100%;
    }

    .empty-nodes-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    /* --- Add Node Button --- */
    .add-node-btn {
      background: var(--accent-color);
      color: white;
      border: none;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      font-size: 2.5rem;
      font-weight: 200;
      cursor: pointer;
      box-shadow: var(--shadow);
      transition: all 0.2s ease-in-out;
      display: flex;
      justify-content: center;
      align-items: center;
      line-height: 1;
    }

    .add-node-btn:hover {
      transform: scale(1.1);
      background: #0069d9;
    }

    .add-more-btn {
      margin-top: 2rem;
    }

    /* --- Node Card --- */
    .node-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1rem 1.5rem;
      box-shadow: var(--shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .node-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
    }

    .node-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }

    .node-id {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      background-color: var(--border-color);
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      cursor: help;
    }

    .node-status {
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.85rem;
    }

    .status-running {
      background-color: rgba(40, 167, 69, 0.2);
      color: var(--success-color);
    }

    .status-stopped {
      background-color: rgba(220, 53, 69, 0.2);
      color: var(--danger-color);
    }

    /* --- Action Buttons --- */
    .action-buttons {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
    }

    .action-buttons button {
      background-color: var(--border-color);
      color: var(--text-color);
      border: none;
      border-radius: 8px;
      padding: 0.75rem;
      cursor: pointer;
      transition: background-color 0.2s ease;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 600;
    }

    .action-buttons button:hover:not(:disabled) {
      background-color: #555;
    }

    .action-buttons button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .action-buttons button svg {
      width: 20px;
      height: 20px;
    }

    /* Custom run buttons */
    .run-btn {
      gap: 0.5rem; /* Space between icon and number */
      background-color: var(--accent-color) !important;
    }
    .run-btn:hover:not(:disabled) {
      background-color: #0069d9 !important;
    }
  `}</style>
);
// --- End CSS Styles ---


// --- Icon Components ---
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>;
const StopIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"></path></svg>;
const WipeIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>;
const ConsoleIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 18V6h16v12H4zm2-7h3v2H6v-2zm4.5 5.5l1.41-1.41L10.5 13l1.41-1.41L10.5 10.17l1.41-1.41L13.33 10l-1.42 1.41L13.33 13l-1.42 1.41L10.5 15.83zM14 15h4v-2h-4v2z"></path></svg>;
const RouterIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.2 13.8L23 11l-2.8-2.8c-.4-.4-1-.4-1.4 0l-1.1 1.1c-.3-.2-.7-.3-1-.4V7h-4c-.6 0-1-.4-1-1V4c0-1.1-.9-2-2-2s-2 .9-2 2v2c0 .6-.4 1-1 1H4c-1.1 0-2 .9-2 2v4c0 .6.4 1 1 1h2c.4 0 .7.2.9.5l-1.1 1.1c-.4.4-.4 1 0 1.4l2.8 2.8 2.8-2.8c.4-.4 1-.4 1.4 0l1.1 1.1c.3.2.7.3 1 .4V17h4c.6 0 1 .4 1 1v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-.6.4-1 1-1h2c1.1 0 2-.9 2-2v-4c0-.6-.4-1-1-1h-2c-.4 0-.7-.2-.9-.5l1.1-1.1c.4-.4.4-1 0-1.4zM12 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path></svg>;
const ComputerIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"></path></svg>;
// --- End Icon Components ---

const API_BASE_URL = 'http://localhost:3000';

function App() {
  const [nodes, setNodes] = useState({});

  const fetchNodes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/database`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setNodes(data);
    } catch (error) {
      console.error("Failed to fetch nodes:", error);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApiAction = async (url, body) => {
    try {
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      await fetch(url, options);
      fetchNodes();
    } catch (error) {
      console.error(`Action failed for ${url}:`, error);
    }
  };

  const handleCreateNode = () => handleApiAction(`${API_BASE_URL}/nodes`);
  
  // --- UPDATED Run Handler ---
  // It now sends a body with the type and socket, matching the backend
  const handleRunNode = (nodeId, type, socketPort) => {
    const url = `${API_BASE_URL}/nodes/${nodeId}/run`;
    const body = { type };
    if (socketPort !== undefined) { // Send socketPort even if it's 0
      body.socketPort = socketPort;
    }
    handleApiAction(url, body);
  };
  
  const handleStopNode = (nodeId) => handleApiAction(`${API_BASE_URL}/nodes/${nodeId}/stop`);
  const handleWipeNode = (nodeId) => handleApiAction(`${API_BASE_URL}/nodes/${nodeId}/wipe`);

  const handleOpenConsole = (nodeId) => {
    const node = nodes[nodeId];
    if (!node || node.status !== 'RUNNING') {
        alert("Node is not running yet!");
        return;
    }
    const connectionName = encodeURIComponent(nodeId);
    const guacamoleURL = `http://localhost:8080/guacamole/#/client/c/${connectionName}`;
    window.open(guacamoleURL, "_blank");
  };

  return (
    <div className="app-container">
      <AppStyles /> {/* RENDER THE STYLES */}
      <h1 className="title">NETWORKING-LAB</h1>
      
      <div className={`nodes-container ${Object.keys(nodes).length === 0 ? 'empty-nodes-container' : ''}`}>
        {Object.keys(nodes).length === 0 ? (
          <button className="add-node-btn" onClick={handleCreateNode}>+</button>
        ) : (
          Object.entries(nodes).map(([nodeId, node]) => (
            <div key={nodeId} className="node-card">
              <div className="node-info">
                {/* Changed to show full Node ID on hover, but UUID is long so keep substring */}
                <span className="node-id" title={nodeId}><strong>ID:</strong> {nodeId.substring(0, 8)}...</span>
                <span className={`node-status ${node.status === 'RUNNING' ? 'status-running' : 'status-stopped'}`}>
                  {node.status} {node.port && `(Port: ${node.port})`}
                </span>
              </div>
              
              {/* --- UPDATED Action Buttons --- */}
              <div className="action-buttons">
                {node.status === 'STOPPED' ? (
                  <>
                    {/* Run as Router (Type 1) */}
                    <button 
                      title="Run as Router (Net 1 & 2)" 
                      className="run-btn"
                      onClick={() => handleRunNode(nodeId, 1)}
                    >
                      <RouterIcon />
                    </button>
                    {/* Run as PC (Net 1) */}
                    <button 
                      title="Run as PC (Net 1)" 
                      className="run-btn"
                      onClick={() => handleRunNode(nodeId, 0, 12345)}
                    >
                      <ComputerIcon /> 1
                    </button>
                    {/* Run as PC (Net 2) */}
                    <button 
                      title="Run as PC (Net 2)" 
                      className="run-btn"
                      onClick={() => handleRunNode(nodeId, 0, 12346)}
                    >
                      <ComputerIcon /> 2
                    </button>
                  </>
                ) : (
                  <button title="Stop" onClick={() => handleStopNode(nodeId)}><StopIcon /></button>
                )}
                <button title="Wipe" onClick={() => handleWipeNode(nodeId)}><WipeIcon /></button>
                <button title="Open Console" onClick={() => handleOpenConsole(nodeId)} disabled={node.status === 'STOPPED'}><ConsoleIcon /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {Object.keys(nodes).length > 0 && (
         <button className="add-node-btn add-more-btn" onClick={handleCreateNode}>+</button>
      )}
    </div>
  );
}

export default App;