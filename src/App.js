import React, { useEffect } from 'react';
import Portal from './components/Portal'; // Adjust this path based on your folder structure

function App() {
  useEffect(() => {
    let startTime = new Date().getTime();
    let cursorMovements = [];
    let keyPressData = [];
    let clickCount = 0;
    let lastCursorTime = startTime;
    let lastKeyPressTime = startTime;
    let totalScrollDistance = 0;
    let currentScrollPosition = window.scrollY;

    // Cursor movement tracking
    const handleMouseMove = (event) => {
      const currentTime = new Date().getTime();
      if (cursorMovements.length > 0) {
        const dx = event.clientX - cursorMovements[cursorMovements.length - 1].x;
        const dy = event.clientY - cursorMovements[cursorMovements.length - 1].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        cursorMovements.push({ x: event.clientX, y: event.clientY, time: currentTime, distance: distance });
      } else {
        cursorMovements.push({ x: event.clientX, y: event.clientY, time: currentTime, distance: 0 });
      }
      lastCursorTime = currentTime;
    };

    // Click event tracking
    const handleClick = () => {
      clickCount++;
    };

    // Keystroke tracking
    const handleKeyDown = (event) => {
      const currentTime = new Date().getTime();
      const pressDuration = currentTime - lastKeyPressTime;
      keyPressData.push({ key: event.key, pressDuration: pressDuration });
      lastKeyPressTime = currentTime;
    };

    // Scroll tracking
    const handleScroll = () => {
      const newScrollPosition = window.scrollY;
      totalScrollDistance += Math.abs(newScrollPosition - currentScrollPosition);
      currentScrollPosition = newScrollPosition;
    };

    // Page unload tracking for final data logging
    const handleBeforeUnload = () => {
      const sessionDuration = (new Date().getTime() - startTime) / 1000; // in seconds

      const interactionData = {
        avgCursorSpeed: calculateAvgCursorSpeed(cursorMovements),
        // Add other metrics as needed
      };

      navigator.sendBeacon('http://localhost:5000/api/collect-data', JSON.stringify(interactionData));
    };

    function calculateAvgCursorSpeed(data) {
      if (data.length < 2) return 0;
      let totalDistance = data.reduce((sum, point) => sum + point.distance, 0);
      let duration = (data[data.length - 1].time - data[0].time) / 1000; // in seconds
      return duration ? totalDistance / duration : 0;
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup event listeners on unmount
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="App">
      <Portal />
    </div>
  );
}

export default App;
