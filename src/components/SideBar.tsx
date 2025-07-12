import React from 'react';
import { useHistory } from 'react-router-dom';
import { Box } from '@dhis2/ui';
import { TrackedEntityInstance } from './TrackerDataTable';

interface SidebarProps {
  selectedEntity: TrackedEntityInstance | null;
}

function Sidebar({ selectedEntity }: SidebarProps) {
  const trackerEntityId = selectedEntity?.trackedEntityInstance;
  const history = useHistory();

  const handleNavigation = (path: string) => {
    history.push(path);
  };

  return (
    <Box
      width="250px"
      height="100vh"
      marginTop="10px"
    >
      <h2>Menu</h2>
      <ul>
        <li>
          {selectedEntity ? (
            <button 
              onClick={() => handleNavigation('/Predictions')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'blue', 
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit'
              }}
            >
              The Prediction Model
            </button>
          ) : (
            <span style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              The Prediction Model
            </span>
          )}
        </li>
        <li>
          <button 
            onClick={() => handleNavigation('/ModelExplanation')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'blue', 
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit'
            }}
          >
            Model Explanation
          </button>
        </li>
        <li>
          {selectedEntity ? (
            <button 
              onClick={() => handleNavigation(`/Map/${selectedEntity.trackedEntityInstance}`)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'blue', 
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit'
              }}
            >
              Map
            </button>
          ) : (
            <span style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Map
            </span>
          )}
        </li>
      </ul>
    </Box>
  );
}

export default Sidebar;