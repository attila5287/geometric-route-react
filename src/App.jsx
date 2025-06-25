import React, { useState } from 'react';
import InputPanel from './InputPanel';
import MapboxMap from './MapboxMap';
import logo from './assets/logo-small-square.png';
import './assets/style.css';

export default function App() {
  const [baseHeight, setBaseHeight] = useState(0);
  const [topHeight, setTopHeight] = useState(20);
  const [stepCount, setStepCount] = useState(4);
  const [toleranceWidth, setToleranceWidth] = useState(6);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      <nav className="navbar navbar-expand navbar-dark bg-primary py-0 sticky-top pl-1" style={{ zIndex: 2 }}>
        <ul className="navbar-nav py-0">
          <li className="nav-item nav-link disabled pt-1 pb-0 px-1">
            <img alt="main-logo" className="img-thumbnail bg-transparent border-0 p-0 m-0" src={logo} style={{ zIndex: 1, height: 22 }} />
          </li>
          <li className="nav-item nav-link py-1"></li>
        </ul>
      </nav>
      <div style={{ flex: 1, position: 'relative' }}>
        <InputPanel
          baseHeight={baseHeight}
          setBaseHeight={setBaseHeight}
          topHeight={topHeight}
          setTopHeight={setTopHeight}
          stepCount={stepCount}
          setStepCount={setStepCount}
          toleranceWidth={toleranceWidth}
          setToleranceWidth={setToleranceWidth}
        />
        <MapboxMap
          baseHeight={baseHeight}
          topHeight={topHeight}
          stepCount={stepCount}
          toleranceWidth={toleranceWidth}
        />
      </div>
    </div>
  );
}
