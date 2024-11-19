import React, { useState, useEffect } from 'react';
import './styles.css';
import Portal from './Portal';

const App = () => {
  const [interactionData, setInteractionData] = useState(null);

  useEffect(() => {
    const startTime = new Date().getTime();
    let cursorMovements = [];
    let keyPressData = [];
    let clickCount = 0;
    let lastCursorTime = startTime;
    let lastKeyPressTime = startTime;
    let idleTime = 0;
    let lastActivityTime = startTime;
    let scrollEvents = 0;
    let pageTransitions = [];
    let dwellTimes = [];
    let totalScrollDistance = 0;
    let currentScrollPosition = window.scrollY;

    const trackMouseMovement = (event) => {
      const currentTime = new Date().getTime();
      if (cursorMovements.length > 0) {
        const dx = event.clientX - cursorMovements[cursorMovements.length - 1].x;
        const dy = event.clientY - cursorMovements[cursorMovements.length - 1].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        cursorMovements.push({ x: event.clientX, y: event.clientY, time: currentTime, distance });
      } else {
        cursorMovements.push({ x: event.clientX, y: event.clientY, time: currentTime, distance: 0 });
      }
      lastCursorTime = currentTime;
      lastActivityTime = currentTime;
    };

    const handleClick = () => {
      clickCount++;
      lastActivityTime = new Date().getTime();
    };

    const handleKeyPress = (event) => {
      const currentTime = new Date().getTime();
      keyPressData.push({ key: event.key, pressDuration: currentTime - lastKeyPressTime });
      lastKeyPressTime = currentTime;
      lastActivityTime = currentTime;
    };

    const handleScroll = () => {
      scrollEvents++;
      const newScrollPosition = window.scrollY;
      totalScrollDistance += Math.abs(newScrollPosition - currentScrollPosition);
      currentScrollPosition = newScrollPosition;
      lastActivityTime = new Date().getTime();
    };

    const generateInteractionData = () => {
      const sessionDuration = (new Date().getTime() - startTime) / 1000; // in seconds

      return {
        avgCursorSpeed: calculateAvgCursorSpeed(cursorMovements),
        cursorAcceleration: calculateCursorAcceleration(cursorMovements),
        pathDeviation: calculatePathDeviation(cursorMovements),
        idleTime,
        jitter: calculateAvgJitter(cursorMovements),
        clickPattern: clickCount,
        typingSpeed: calculateTypingSpeed(keyPressData),
        keyPressDuration: calculateAvgKeyPressDuration(keyPressData),
        keyTransitionTime: calculateAvgKeyTransitionTime(keyPressData),
        keyHoldTime: calculateAvgKeyPressDuration(keyPressData),
        errorRate: calculateErrorRate(keyPressData),
        sessionDuration,
        pageNavigationPattern: pageTransitions,
        averageDwellTime: calculateAverageDwellTime(dwellTimes),
        scrollBehavior: totalScrollDistance,
      };
    };

    document.addEventListener('mousemove', trackMouseMovement);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mousemove', trackMouseMovement);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleDownload = () => {
    if (!interactionData) {
      const data = generateInteractionData();
      setInteractionData(data);
    }
    
    const dataToDownload = interactionData || generateInteractionData();
    const csvContent = `data:text/csv;charset=utf-8,${Object.keys(dataToDownload).join(',')}\n${Object.values(dataToDownload).join(',')}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'interaction_data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="App">
      <Portal />
      <button onClick={handleDownload}>Download Interaction Data</button>
      <footer>
        <p>Note: This page collects data to demonstrate interaction tracking for research purposes.</p>
      </footer>
    </div>
  );
};

export default App;
