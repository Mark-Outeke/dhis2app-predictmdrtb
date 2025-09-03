import React from 'react';
import { useHistory } from 'react-router-dom';
import { Box } from '@dhis2/ui';
import { TrackedEntityInstance } from './TrackerDataTable';
import './SideBar.css';

interface SidebarProps {
  selectedEntity: TrackedEntityInstance | null;
}

function Sidebar({ selectedEntity }: SidebarProps) {
  const history = useHistory();

  const handleNavigation = (path: string) => {
    history.push(path);
  };

  const menuItems = [
    {
      label: 'The Prediction Model',
      iconClass: 'icon-chart',
      path: '/Predictions',
      requiresEntity: true,
      description: 'MDR-TB Risk Assessment'
    },
    {
      label: 'Model Explanation',
      iconClass: 'icon-info',
      path: '/ModelExplanation',
      requiresEntity: false,
      description: 'Learn about the ML Model'
    },
    {
      label: 'Map',
      iconClass: 'icon-map',
      path: `/Map/${selectedEntity?.trackedEntityInstance || ''}`,
      requiresEntity: true,
      description: 'Geographic Visualization'
    }
  ];

  return (
    <Box
      width="250px"
      height="100vh"
      marginTop="10px"
      className="sidebar-container"
    >
      <div className="sidebar-header">
        <h2>Menu</h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="menu-list">
          {menuItems.map((item, index) => {
            const isDisabled = item.requiresEntity && !selectedEntity;
            const isActive = window.location.pathname === item.path;
            
            return (
              <li key={index} className="menu-item">
                {!isDisabled ? (
                  <button 
                    onClick={() => handleNavigation(item.path)}
                    className={`menu-button ${isActive ? 'active' : ''}`}
                    title={item.description}
                    type="button"
                  >
                    <span className={`menu-icon ${item.iconClass}`}></span>
                    <span className="menu-text">
                      {item.label}
                    </span>
                  </button>
                ) : (
                  <div className="menu-button disabled" title="Select a patient first">
                    <span className={`menu-icon ${item.iconClass}`}></span>
                    <span className="menu-text">
                      {item.label}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {selectedEntity && (
        <div className="sidebar-footer">
          <div className="selected-patient-info">
            <span className="info-label">Selected Patient:</span>
            <span className="patient-id">
              {selectedEntity.trackedEntityInstance}
            </span>
          </div>
        </div>
      )}
    </Box>
  );
}

export default Sidebar;