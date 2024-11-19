import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import Captcha from './captcha';

// Constants for normalization and threshold adjustments
const AVERAGE_DPI = 1600; // Adjust based on common high-DPI mouse settings
const DPI_NORMALIZATION_FACTOR = AVERAGE_DPI / 800; // Normalize for high-DPI devices
const MAX_HUMAN_ACCELERATION = 50000; // Threshold for human-like acceleration

const Portal = () => {
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [interactionData, setInteractionData] = useState({
    avgCursorSpeed: 0,
    cursorAcceleration: 0,
    pathDeviation: 0,
    idleTime: 0,
    jitter: 0,
    clickPattern: 0,
    typingSpeed: 0,
    keyPressDuration: 0,
    keyTransitionTime: 0,
    errorRate: 0,
    sessionDuration: 0,
    pageNavigationPattern: [],
    averageDwellTime: 0,
    scrollBehavior: 0,
  });
  const [clickCount, setClickCount] = useState(0);
  const [keystrokeDurations, setKeystrokeDurations] = useState([]);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [idleTime, setIdleTime] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [dwellTimes, setDwellTimes] = useState([]);
  const [keyTransitionTimes, setKeyTransitionTimes] = useState([]);
  const keyDownTimes = useRef({});
  const lastKeyDownTimeRef = useRef(null);
  const [navigationEvents, setNavigationEvents] = useState([]);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const sessionStartRef = useRef(performance.now());
  const lastInteractionTimeRef = useRef(sessionStartRef.current);
  const lastCursorPositionRef = useRef({ x: null, y: null, time: null });
  const lastScrollPositionRef = useRef(window.scrollY);
  const lastFocusTimeRef = useRef(null);

  // Utility function to calculate standard deviation
  const calculateStandardDeviation = (values) => {
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    return Math.sqrt(variance);
  };

  useEffect(() => {
    let mouseMoveEvents = [];

    const trackMouseMovement = (event) => {
      const currentTime = performance.now();
      const lastCursorPosition = lastCursorPositionRef.current;

      if (lastCursorPosition.x !== null) {
        const dx = (event.clientX - lastCursorPosition.x) / DPI_NORMALIZATION_FACTOR;
        const dy = (event.clientY - lastCursorPosition.y) / DPI_NORMALIZATION_FACTOR;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeElapsed = (currentTime - lastCursorPosition.time) / 1000; // in seconds

        if (timeElapsed > 0 && timeElapsed < 5) {
          let speed = distance / timeElapsed;
          let acceleration = (speed - interactionData.avgCursorSpeed) / timeElapsed;

          // Cap acceleration at a human threshold
          if (acceleration > MAX_HUMAN_ACCELERATION) {
            acceleration = MAX_HUMAN_ACCELERATION;
          }

          // Collect mouse move events for advanced analysis
          mouseMoveEvents.push({
            speed,
            acceleration,
            time: currentTime,
          });

          // Compute moving average of speed and acceleration
          const recentMouseEvents = mouseMoveEvents.slice(-50); // last 50 events
          const avgSpeed =
            recentMouseEvents.reduce((sum, e) => sum + e.speed, 0) / recentMouseEvents.length;
          const avgAcceleration =
            recentMouseEvents.reduce((sum, e) => sum + e.acceleration, 0) / recentMouseEvents.length;

          // Calculate straight-line distance between last position and current position
          const straightLineDistance = Math.sqrt(
            (event.clientX - lastCursorPosition.x) ** 2 +
            (event.clientY - lastCursorPosition.y) ** 2
          );

          // Calculate path deviation as the difference between actual distance and straight-line distance
          const deviation = Math.abs(distance - straightLineDistance);

          // Update jitter
          const movement = Math.sqrt(dx * dx + dy * dy);
          const isJitter = movement < 2; // Threshold can be adjusted

          setInteractionData((prevData) => ({
            ...prevData,
            avgCursorSpeed: avgSpeed,
            cursorAcceleration: avgAcceleration,
            pathDeviation:
              prevData.pathDeviation > 0
                ? (prevData.pathDeviation + deviation) / 2
                : deviation,
            jitter: isJitter ? prevData.jitter + 1 : prevData.jitter,
          }));
        }
      }
      lastCursorPositionRef.current = { x: event.clientX, y: event.clientY, time: currentTime };
      lastInteractionTimeRef.current = currentTime;
    };

    const handleClick = () => {
      setClickCount((prev) => prev + 1);
      lastInteractionTimeRef.current = performance.now();
    };

    const handleScroll = () => {
      const newScrollPosition = window.scrollY;
      const delta = Math.abs(newScrollPosition - lastScrollPositionRef.current);
      if (delta > 0) {
        setScrollDistance((prev) => prev + delta);
        lastInteractionTimeRef.current = performance.now();
      }
      lastScrollPositionRef.current = newScrollPosition;
    };

    const calculateIdleTime = () => {
      const currentTime = performance.now();
      const timeSinceLastInteraction = (currentTime - lastInteractionTimeRef.current) / 1000; // in seconds
      if (timeSinceLastInteraction > 1) {
        setIdleTime((prev) => prev + timeSinceLastInteraction);
        lastInteractionTimeRef.current = currentTime; // Reset lastInteractionTime
      }
    };

    // Key event handlers
    const handleKeyDown = (event) => {
      const currentTime = performance.now();
      if (!keyDownTimes.current[event.code]) {
        keyDownTimes.current[event.code] = currentTime;

        // Calculate key transition time
        if (lastKeyDownTimeRef.current !== null) {
          const transitionTime = currentTime - lastKeyDownTimeRef.current;
          setKeyTransitionTimes((prevTimes) => [...prevTimes, transitionTime]);
        }
        lastKeyDownTimeRef.current = currentTime;
        lastInteractionTimeRef.current = currentTime;
      }
    };

    const handleKeyUp = (event) => {
      const currentTime = performance.now();
      if (keyDownTimes.current[event.code]) {
        const keyPressDuration = currentTime - keyDownTimes.current[event.code];
        // Record keystroke duration (key press duration)
        setKeystrokeDurations((prevDurations) => [...prevDurations, keyPressDuration]);
        delete keyDownTimes.current[event.code];

        if (event.key === 'Backspace' || event.key === 'Delete') {
          setErrorCount((prev) => prev + 1); // Count as an error
        }
      }
    };

    const handleFocusIn = (event) => {
      const target = event.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        target.addEventListener('keydown', handleKeyDown);
        target.addEventListener('keyup', handleKeyUp);
        lastFocusTimeRef.current = performance.now();
      }
    };

    const handleFocusOut = (event) => {
      const target = event.target;
      if (lastFocusTimeRef.current) {
        const dwellTime = performance.now() - lastFocusTimeRef.current;
        setDwellTimes((prevTimes) => [...prevTimes, dwellTime]);
        lastFocusTimeRef.current = null;
      }
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        target.removeEventListener('keydown', handleKeyDown);
        target.removeEventListener('keyup', handleKeyUp);
      }
    };

    document.addEventListener('mousemove', trackMouseMovement);
    document.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    const idleInterval = setInterval(calculateIdleTime, 5000);

    return () => {
      document.removeEventListener('mousemove', trackMouseMovement);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      clearInterval(idleInterval);
    };
  }, [interactionData.avgCursorSpeed]);

  const handleAadhaarChange = (e) => {
    const value = e.target.value.replace(/\s+/g, '');
    if (/^\d{0,12}$/.test(value)) {
      setAadhaarNumber(value);
      setErrorMessage('');
    } else {
      setErrorMessage('Aadhaar number must be exactly 12 digits.');
    }
  };

  const handleLogin = () => {
    // Calculate session duration
    const currentTime = performance.now();
    const sessionDuration = (currentTime - sessionStartRef.current) / 1000; // in seconds

    // Compute averages
    const totalKeyPressDuration = keystrokeDurations.reduce((sum, dur) => sum + dur, 0);
    const averageKeyPressDuration =
      keystrokeDurations.length > 0 ? totalKeyPressDuration / keystrokeDurations.length : 0;

    const typingSpeed =
      sessionDuration > 0
        ? ((keystrokeDurations.length / (sessionDuration / 60)).toFixed(2))
        : 0; // chars per minute

    const averageKeyTransitionTime =
      keyTransitionTimes.length > 0
        ? keyTransitionTimes.reduce((sum, time) => sum + time, 0) / keyTransitionTimes.length
        : 0;

    const keyTransitionStdDev = calculateStandardDeviation(keyTransitionTimes);

    const averageDwellTime =
      dwellTimes.length > 0
        ? dwellTimes.reduce((sum, time) => sum + time, 0) / dwellTimes.length
        : 0;

    const errorRate =
      keystrokeDurations.length > 0
        ? ((errorCount / keystrokeDurations.length) * 100).toFixed(2)
        : 0;

    const formattedData = {
      avgCursorSpeed: interactionData.avgCursorSpeed
        ? interactionData.avgCursorSpeed.toFixed(2)
        : 0,
      cursorAcceleration: interactionData.cursorAcceleration
        ? interactionData.cursorAcceleration.toFixed(2)
        : 0,
      pathDeviation: interactionData.pathDeviation
        ? interactionData.pathDeviation.toFixed(2)
        : 0,
      idleTime: idleTime.toFixed(2),
      jitter: interactionData.jitter ? interactionData.jitter.toFixed(2) : 0,
      clickPattern: clickCount,
      typingSpeed,
      keyPressDuration: averageKeyPressDuration.toFixed(2),
      keyTransitionTime: averageKeyTransitionTime.toFixed(2),
      keyTransitionStdDev: keyTransitionStdDev.toFixed(2),
      errorRate,
      sessionDuration: sessionDuration.toFixed(2),
      pageNavigationPattern: JSON.stringify(navigationEvents),
      averageDwellTime: averageDwellTime.toFixed(2),
      scrollBehavior: scrollDistance.toFixed(2),
    };

    downloadCSV(formattedData);

    if (aadhaarNumber.length === 12) {
      alert('Login successful!');
    } else {
      setErrorMessage('Please enter a valid 12-digit Aadhaar number.');
    }
  };

  const downloadCSV = (data) => {
    const headers = Object.keys(data).join(',');
    const values = Object.values(data).join(',');

    const csvContent = `${headers}\n${values}`;
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
    <div className="portal-container">
      <h2>Login Portal</h2>
      <div className="form-group">
        <label htmlFor="aadhaarNumber">Aadhaar Number:</label>
        <input
          type="text"
          id="aadhaarNumber"
          value={aadhaarNumber}
          onChange={handleAadhaarChange}
          placeholder="Enter your 12-digit Aadhaar number"
        />
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      </div>
      {showCaptcha && <Captcha />}
      <button id="loginButton" onClick={handleLogin} disabled={aadhaarNumber.length !== 12}>
        Login
      </button>
      <footer>
        <p>Note: This page collects data for research purposes.</p>
      </footer>
    </div>
  );
};

export default Portal;
