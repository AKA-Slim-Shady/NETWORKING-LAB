import { useState, useEffect } from 'react';
import './App.css';

// --- Icon Components ---
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>;
const StopIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"></path></svg>;
const WipeIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>;
const ConsoleIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 18V6h16v12H4zm2-7h3v2H6v-2zm4.5 5.5l1.41-1.41L10.5 13l1.41-1.41L10.5 10.17l1.41-1.41L13.33 10l-1.42 1.41L13.33 13l-1.42 1.41L10.5 15.83zM14 15h4v-2h-4v2z"></path></svg>;
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

  const handleApiAction = async (url) => {
    try {
      await fetch(url, { method: 'POST' });
      fetchNodes();
    } catch (error) {
      console.error(`Action failed for ${url}:`, error);
    }
  };

  const handleCreateNode = () => handleApiAction(`${API_BASE_URL}/nodes`);
  const handleRunNode = (nodeId) => handleApiAction(`${API_BASE_URL}/nodes/${nodeId}/run`);
  const handleStopNode = (nodeId) => handleApiAction(`${API_BASE_URL}/nodes/${nodeId}/stop`);
  const handleWipeNode = (nodeId) => handleApiAction(`${API_BASE_URL}/nodes/${nodeId}/wipe`);

  const handleOpenConsole = (nodeId) => {
    const node = nodes[nodeId];
    if (!node || node.status !== 'RUNNING') {
        alert("Node is not running yet!");
        return;
    }

    // Guacamole connection name must match exactly what's in user-mapping.xml
    const connectionName = encodeURIComponent(nodeId);
    const guacamoleURL = `http://localhost:8080/guacamole/#/client/c/${connectionName}`;

    window.open(guacamoleURL, "_blank");
};






  return (
    <div className="app-container">
      <h1 className="title">EASY-VM</h1>
      
      <div className={`nodes-container ${Object.keys(nodes).length === 0 ? 'empty-nodes-container' : ''}`}>
        {Object.keys(nodes).length === 0 ? (
          <button className="add-node-btn" onClick={handleCreateNode}>+</button>
        ) : (
          Object.entries(nodes).map(([nodeId, node]) => (
            <div key={nodeId} className="node-card">
              <div className="node-info">
                <span className="node-id" title={nodeId}><strong>ID:</strong> {nodeId.substring(0, 8)}...</span>
                <span className={`node-status ${node.status === 'RUNNING' ? 'status-running' : 'status-stopped'}`}>
                  {node.status} {node.port && `(Port: ${node.port})`}
                </span>
              </div>
              <div className="action-buttons">
                <button title="Run" onClick={() => handleRunNode(nodeId)} disabled={node.status === 'RUNNING'}><PlayIcon /></button>
                <button title="Stop" onClick={() => handleStopNode(nodeId)} disabled={node.status === 'STOPPED'}><StopIcon /></button>
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